import asyncio
from datetime import datetime
from playwright.async_api import async_playwright

async def scrape_elvebredd():
    async with async_playwright() as p:
        # Launch browser with custom user-agent & larger viewport
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800}
        )
        page = await context.new_page()
        
        print("Navigating to Elvebredd Calculator...")
        await page.goto("https://elvebredd.com/ValueCalculator.html", wait_until="domcontentloaded", timeout=60000)
        
        # Wait for page to fully load JS elements
        await page.wait_for_timeout(5000)

        variants = ["Regular", "N", "M"]
        today_date = datetime.utcnow().strftime("%Y-%m-%d")
        records = []

        for variant in variants:
            print(f"Scraping variant: {variant}")
            
            if variant != "Regular":
                try:
                    # Click N or M toggle button
                    await page.click(f'button:has-text("{variant}")', timeout=5000)
                    await page.wait_for_timeout(2000)
                except Exception as e:
                    print(f"Variant click skipped/failed for {variant}: {e}")

            # Extract elements flexibly
            cards = await page.query_selector_all("div[class*='wrap'], div[class*='card'], .pg-wrap")
            
            # Fallback if container classes shifted: query all pet price text directly
            if not cards:
                cards = await page.query_selector_all("body *")

            for card in cards:
                try:
                    # Look for pet name and value text patterns
                    text = await card.inner_text()
                    lines = [line.strip() for line in text.split("\n") if line.strip()]
                    
                    # Store parsed values if valid structure found
                    if len(lines) >= 2 and any(char.isdigit() for char in lines[-1]):
                        name = lines[0]
                        val = lines[-1]
                        records.append(f"{today_date},{name},{variant},{val}\n")
                except Exception:
                    continue

        if records:
            # Prevent duplicates and append
            unique_records = list(set(records))
            with open("history.csv", "a", encoding="utf-8") as f:
                f.writelines(unique_records)
            print(f"Successfully appended {len(unique_records)} records!")
        else:
            print("No records extracted. Cloudflare protection or DOM structure change detected.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(scrape_elvebredd())
