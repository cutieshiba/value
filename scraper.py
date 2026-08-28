import asyncio
from datetime import datetime
from playwright.async_api import async_playwright

async def scrape_elvebredd():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1400, "height": 900}
        )
        page = await context.new_page()
        
        print("Loading Elvebredd Calculator...")
        # Use domcontentloaded instead of networkidle to prevent infinite timeouts
        await page.goto("https://elvebredd.com/ValueCalculator.html", wait_until="domcontentloaded", timeout=60000)
        
        # Give JS components time to hydrate on page
        await page.wait_for_timeout(8000)

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

            # Locate pet cards
            pet_cards = await page.query_selector_all("div.grid > div, div[class*='grid'] > div")

            for card in pet_cards:
                try:
                    text_content = await card.inner_text()
                    lines = [line.strip() for line in text_content.split("\n") if line.strip()]
                    
                    if len(lines) >= 2:
                        pet_name = lines[0].replace(",", "")
                        value = lines[-1].replace(",", "")
                        
                        if any(char.isdigit() for char in value):
                            extracted_rows.append(f"{today_date},{pet_name},{variant},{value}\n")
                except Exception:
                    continue

        if extracted_rows:
            unique_rows = sorted(list(set(extracted_rows)))
            with open("history.csv", "a", encoding="utf-8") as f:
                f.writelines(unique_rows)
            print(f"Successfully wrote {len(unique_rows)} records to history.csv!")
        else:
            print("Failed to find pet cards in DOM structure.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(scrape_elvebredd())
