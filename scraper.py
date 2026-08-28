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

        # Blocklist for non-pet UI text strings
        ui_blacklist = {
            "sign in", "log in", "search", "filter", "calculator", "value", 
            "regular", "neon", "mega", "values", "adopt me", "home", "contact",
            "select", "all", "page", "next", "previous", "item", "items"
        }

        variants = [("Regular", None), ("N", "Neon"), ("M", "Mega")]
        today_date = datetime.utcnow().strftime("%Y-%m-%d")
        extracted_rows = set()

        for variant_code, variant_label in variants:
            print(f"--- Processing Variant: {variant_code} ---")
            
            # Click variant tab if not Regular
            if variant_label:
                try:
                    # Click exact variant toggle button
                    await page.click(f'button:has-text("{variant_code}")', timeout=5000)
                    await page.wait_for_timeout(3000)
                except Exception as e:
                    print(f"Could not click button for {variant_code}: {e}")

            # Scroll incrementally and harvest at each step to catch virtualized items
            for step in range(15):
                pet_cards = await page.query_selector_all("div[class*='card'], div[class*='item'], div.grid > div")
                
                for card in pet_cards:
                    try:
                        text = await card.inner_text()
                        lines = [l.strip() for l in text.split("\n") if l.strip()]
                        
                        if len(lines) >= 2:
                            name = lines[0].replace(",", "")
                            val = lines[-1].replace(",", "")
                            
                            # Validation checks
                            clean_name_lower = name.lower()
                            if (
                                any(char.isdigit() for char in val) and 
                                not any(bad in clean_name_lower for bad in ui_blacklist) and
                                len(name) > 1
                            ):
                                extracted_rows.add(f"{today_date},{name},{variant_code},{val}\n")
                    except Exception:
                        continue

                # Scroll down gradually
                await page.mouse.wheel(0, 1500)
                await page.wait_for_timeout(1000)

            # Reset scroll to top before switching variant
            await page.evaluate("window.scrollTo(0, 0)")
            await page.wait_for_timeout(1500)

        if extracted_rows:
            sorted_rows = sorted(list(extracted_rows))
            with open("history.csv", "a", encoding="utf-8") as f:
                f.writelines(sorted_rows)
            print(f"Successfully saved {len(sorted_rows)} total pet entries across all variants!")
        else:
            print("No records extracted.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(scrape_elvebredd())
