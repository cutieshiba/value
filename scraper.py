import asyncio
from datetime import datetime
from playwright.async_api import async_playwright

async def scrape_elvebredd():
    async with async_playwright() as p:
        # Launch headless Chromium browser
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        print("Navigating to Elvebredd Calculator...")
        await page.goto("https://elvebredd.com/ValueCalculator.html", wait_until="networkidle")
        
        # Wait until pet cards load in the DOM
        await page.wait_for_selector(".pg-wrap", timeout=15000)

        # Attribute variants to scrape
        variants = ["Regular", "N", "M"]
        today_date = datetime.utcnow().strftime("%Y-%m-%d")
        records = []

        for variant in variants:
            print(f"Scraping variant: {variant}")
            
            # Click the modifier button if it's not the default regular view
            if variant != "Regular":
                try:
                    # Target the N or M button on the interface
                    button_selector = f'button:has-text("{variant}")'
                    await page.click(button_selector)
                    await page.wait_for_timeout(1500)  # Wait for JavaScript recalculation
                except Exception as e:
                    print(f"Could not click button for variant {variant}: {e}")
                    continue

            # Query all pet containers on screen
            pet_cards = await page.query_selector_all(".pg-wrap")
            
            for card in pet_cards:
                try:
                    # Extract pet name from card text/attributes
                    name_element = await card.query_selector(".pet")
                    name = await name_element.get_attribute("title") if name_element else None
                    if not name:
                        name = await card.inner_text()
                        name = name.split("\n")[0].strip()

                    # Extract the calculated numerical value span
                    value_element = await card.query_selector("span.whitespace-nowrap")
                    if value_element and name:
                        value_text = await value_element.inner_text()
                        value_text = value_text.strip()
                        
                        # Store formatted CSV line: date,pet_name,variant,value
                        records.append(f"{today_date},{name},{variant},{value_text}\n")
                except Exception:
                    continue

        # Append records to history.csv
        with open("history.csv", "a", encoding="utf-8") as f:
            f.writelines(records)

        print(f"Successfully appended {len(records)} entries to history.csv!")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(scrape_elvebredd())
