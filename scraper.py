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
        await page.wait_for_timeout(6000)

        # Strict list of words that should NEVER be saved as pet names
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
            
            # Switch variant tabs
            if variant != "Regular":
                try:
                    # Click variant tab using explicit button matching
                    await page.click(f'button:has-text("{variant}")', timeout=5000)
                    await page.wait_for_timeout(3000)
                except Exception as e:
                    print(f"Could not click button for variant {variant}: {e}")

            # Scroll through page in steps to load virtualized elements
            for step in range(10):
                # Target grid containers that house individual pet cards
                pet_cards = await page.query_selector_all("div.grid > div, div[class*='card']")
                
                for card in pet_cards:
                    try:
                        text = await card.inner_text()
                        lines = [l.strip() for l in text.split("\n") if l.strip()]
                        
                        if len(lines) >= 2:
                            raw_name = lines[0].replace(",", "")
                            raw_val = lines[-1].replace(",", "")
                            
                            clean_name = raw_name.lower().strip()
                            
                            # Validate: name must not be in UI blocklist, value must contain digits
                            if (
                                len(raw_name) > 1 and
                                clean_name not in invalid_names and
                                any(char.isdigit() for char in raw_val)
                            ):
                                extracted_rows.add(f"{today_date},{raw_name},{variant},{raw_val}\n")
                    except Exception:
                        continue

                # Scroll down incrementally
                await page.mouse.wheel(0, 1800)
                await page.wait_for_timeout(800)

            # Reset scroll position to top before moving to next variant
            await page.evaluate("window.scrollTo(0, 0)")
            await page.wait_for_timeout(1000)

        if extracted_rows:
            sorted_rows = sorted(list(extracted_rows))
            
            # Ensure file has headers before writing
            with open("history.csv", "w", encoding="utf-8") as f:
                f.write("date,pet_name,variant,value\n")
                f.writelines(sorted_rows)
                
            print(f"SUCCESS: Saved {len(sorted_rows)} unique pet entries to history.csv!")
        else:
            print("ERROR: No pet cards matched criteria. Check site DOM structures.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(scrape_elvebredd())
