import asyncio
from datetime import datetime
from playwright.async_api import async_playwright

async def scrape_elvebredd():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1600, "height": 1000}
        )
        page = await context.new_page()

        print("Loading Elvebredd Calculator...")
        await page.goto("https://elvebredd.com/ValueCalculator.html", wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_timeout(8000)

        invalid_names = {
            "sign in", "log in", "search", "filter", "calculator", "value", 
            "regular", "neon", "mega", "values", "adopt me", "home", "contact",
            "select", "all", "page", "next", "previous", "item", "items", "privacy"
        }

        variants = ["Regular", "N", "M"]
        today_date = datetime.utcnow().strftime("%Y-%m-%d")
        extracted_rows = set()

        for variant in variants:
            print(f"--- Scraping Variant: {variant} ---")
            
            # Click variant tab
            if variant != "Regular":
                try:
                    # Target button containing text N or M
                    btn = page.locator(f'button:has-text("{variant}")').first
                    if await btn.count() > 0:
                        await btn.click()
                        await page.wait_for_timeout(3000)
                except Exception as e:
                    print(f"Could not switch variant tab {variant}: {e}")

            # Scroll and capture using Image Parent Containers
            for step in range(12):
                # Grab every image on the page
                images = await page.query_selector_all("img")
                
                for img in images:
                    try:
                        # Grab the parent box that holds the image + pet text
                        parent = await img.evaluate_handle("el => el.closest('div')")
                        if not parent:
                            continue

                        text = await parent.inner_text()
                        lines = [l.strip() for l in text.split("\n") if l.strip()]
                        
                        # Pet cards always have at least 2 lines of text (Name + Value)
                        if len(lines) >= 2:
                            raw_name = lines[0].replace(",", "")
                            raw_val = lines[-1].replace(",", "")
                            clean_name = raw_name.lower().strip()
                            
                            # Ensure name isn't UI text and value contains numbers
                            if (
                                len(raw_name) > 1 and
                                clean_name not in invalid_names and
                                any(char.isdigit() for char in raw_val)
                            ):
                                extracted_rows.add(f"{today_date},{raw_name},{variant},{raw_val}\n")
                    except Exception:
                        continue

                # Scroll down in increments to trigger virtual rendering
                await page.mouse.wheel(0, 1500)
                await page.wait_for_timeout(800)

            # Scroll back to top before next variant
            await page.evaluate("window.scrollTo(0, 0)")
            await page.wait_for_timeout(1000)

        if extracted_rows:
            sorted_rows = sorted(list(extracted_rows))
            with open("history.csv", "w", encoding="utf-8") as f:
                f.write("date,pet_name,variant,value\n")
                f.writelines(sorted_rows)
                
            print(f"SUCCESS: Wrote {len(sorted_rows)} unique pets to history.csv!")
        else:
            print("ERROR: Still failed to capture pet nodes. Dumping page content...")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(scrape_elvebredd())
