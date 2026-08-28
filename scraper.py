import asyncio
from datetime import datetime
from playwright.async_api import async_playwright

async def scrape_elvebredd():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1600, "height": 1000}
        )
        page = await context.new_page()

        print("Loading Elvebredd Calculator...")
        await page.goto("https://elvebredd.com/ValueCalculator.html", wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_timeout(5000)

        variants = ["Regular", "N", "M"]
        today_date = datetime.utcnow().strftime("%Y-%m-%d")
        extracted_rows = []

        for variant in variants:
            print(f"Scraping variant: {variant}")
            
            if variant != "Regular":
                try:
                    btn = page.get_by_role("button", name=variant, exact=True)
                    if await btn.count() > 0:
                        await btn.click()
                        await page.wait_for_timeout(2000)
                except Exception as e:
                    print(f"Variant click failed for {variant}: {e}")

            # Auto-scroll down the page to trigger lazy loading for all pets
            print("Scrolling page to load full pet inventory...")
            for scroll_step in range(12):
                await page.mouse.wheel(0, 2500)
                await page.wait_for_timeout(800)

            # Scroll back to the top
            await page.evaluate("window.scrollTo(0, 0)")
            await page.wait_for_timeout(1000)

            # Extract text lines across all loaded pet cards
            pet_elements = await page.query_selector_all("p, span, h3, h4, div")
            text_lines = []
            for el in pet_elements:
                try:
                    txt = (await el.inner_text()).strip()
                    if txt and "\n" not in txt:
                        text_lines.append(txt)
                except Exception:
                    continue

            # Pair names and values
            for i in range(len(text_lines) - 1):
                name = text_lines[i].replace(",", "")
                val = text_lines[i + 1].replace(",", "")
                
                # Verify numeric value formatting
                if any(char.isdigit() for char in val) and not any(k in name.lower() for k in ["search", "filter", "calculator", "value", "regular", "neon", "mega"]):
                    extracted_rows.append(f"{today_date},{name},{variant},{val}\n")

        if extracted_rows:
            unique_rows = sorted(list(set(extracted_rows)))
            with open("history.csv", "a", encoding="utf-8") as f:
                f.writelines(unique_rows)
            print(f"Successfully saved {len(unique_rows)} unique pet entries!")
        else:
            print("No pet records extracted.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(scrape_elvebredd())
