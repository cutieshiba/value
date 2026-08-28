import asyncio
import json
from datetime import datetime
from playwright.async_api import async_playwright

async def scrape_elvebredd():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        captured_data = []

        # Listen for API responses containing the value data
        async def handle_response(response):
            if "json" in response.headers.get("content-type", "") or ".json" in response.url:
                try:
                    data = await response.json()
                    captured_data.append(data)
                except Exception:
                    pass

        page.on("response", handle_response)

        print("Navigating to Elvebredd Calculator...")
        await page.goto("https://elvebredd.com/ValueCalculator.html", wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_timeout(8000)

        today_date = datetime.utcnow().strftime("%Y-%m-%d")
        extracted_rows = []

        # Fallback: Scrape text nodes directly from visible cards
        pet_elements = await page.query_selector_all("p, span, h3, h4")
        text_lines = []
        for el in pet_elements:
            txt = (await el.inner_text()).strip()
            if txt:
                text_lines.append(txt)

        # Pair adjacent pet names and values
        for i in range(len(text_lines) - 1):
            name = text_lines[i].replace(",", "")
            val = text_lines[i + 1].replace(",", "")
            
            # Match standard decimal or integer value formats (e.g. 0.25, 100)
            if any(char.isdigit() for char in val) and not any(k in name.lower() for k in ["search", "filter", "calculator", "value"]):
                extracted_rows.append(f"{today_date},{name},Regular,{val}\n")

        if extracted_rows:
            unique_rows = sorted(list(set(extracted_rows)))
            with open("history.csv", "a", encoding="utf-8") as f:
                f.writelines(unique_rows)
            print(f"Successfully appended {len(unique_rows)} records to history.csv!")
        else:
            print("No pet records extracted. Check workflow logs.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(scrape_elvebredd())
