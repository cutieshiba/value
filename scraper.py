import asyncio
import os
from datetime import datetime
from playwright.async_api import async_playwright


def load_latest_historical_values(csv_filename):
    latest_records = {}
    if not os.path.exists(csv_filename):
        return latest_records

    with open(csv_filename, "r", encoding="utf-8") as f:
        for line in f:
            parts = line.strip().split(",")
            if len(parts) >= 4:
                date_str = parts[0]
                name = ",".join(parts[1:-2]) if len(parts) > 4 else parts[1]
                combo = parts[-2]
                val = parts[-1]
                latest_records[(name, combo)] = (date_str, val)

    return latest_records


async def set_potion_state(page, target_f, target_r):
    """Toggles F and R buttons reliably based on target active state."""
    for letter, target in [("F", target_f), ("R", target_r)]:
        xpath = f"//*[self::button or self::div or self::span][normalize-space()='{letter}']"
        try:
            btn = page.locator(xpath).first
            if await btn.is_visible(timeout=1500):
                class_attr = (await btn.get_attribute("class")) or ""
                is_active = any(kw in class_attr.lower() for kw in ["active", "selected", "bg-"])
                
                if is_active != target:
                    await btn.click(force=True)
                    await page.wait_for_timeout(600)
        except Exception as e:
            print(f"Error setting potion state '{letter}': {e}")


async def scroll_and_harvest(page, combo_tag, raw_data, max_scrolls=500):
    """Performs a full scroll to harvest all items without early exit skipping."""
    await page.evaluate("""
        () => {
            const drawer = document.querySelector("div[class*='drawer'], div[class*='modal'], div[class*='scroll'], div[class*='grid']");
            if (drawer) { drawer.scrollTop = 0; }
            window.scrollTo(0, 0);
        }
    """)
    await page.mouse.move(800, 500)
    await page.mouse.wheel(0, -50000)
    await page.wait_for_timeout(1000)

    for step in range(max_scrolls):
        cards = await page.query_selector_all("div[class*='grid'] > div, div[class*='card'], div[class*='item']")
        
        for card in cards:
            try:
                text = await card.inner_text()
                lines = [l.strip() for l in text.split("\n") if l.strip()]

                if len(lines) >= 2:
                    p1 = lines[0].replace(",", "").strip()
                    p2 = lines[-1].replace(",", "").strip()

                    name = p1 if not p1.replace(".", "").isdigit() else p2
                    val = p2 if name == p1 else p1
                    clean_name = name.lower()

                    is_ui_text = any(bad in clean_name for bad in [
                        "search", "filter", "add", "close", "cancel", "menu",
                        "sign in", "win", "fair", "lose", "offer", "regular",
                        "neon", "mega", "values", "show"
                    ])

                    if len(name) > 1 and not is_ui_text and any(char.isdigit() for char in val):
                        raw_data[(name, combo_tag)] = val
            except Exception:
                continue

        await page.mouse.move(800, 500)
        await page.mouse.wheel(0, 300)
        await page.wait_for_timeout(100)


async def scrape_elvebredd():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--disable-blink-features=AutomationControlled"])
        context = await browser.new_context(
            viewport={"width": 1600, "height": 1000},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        )
        page = await context.new_page()

        print("Navigating to Elvebredd...")
        await page.goto("https://elvebredd.com/ValueCalculator.html", wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_timeout(4000)

        # Open drawer
        add_slot = page.locator("[aria-label*='Add']").first
        await add_slot.click(force=True)
        await page.wait_for_timeout(3000)

        variants = ["Regular", "N", "M"]
        potion_states = [
            ("FR", True, True),
            ("R", False, True),
            ("F", True, False),
            ("NP", False, False)
        ]

        today_date = datetime.utcnow().strftime("%Y-%m-%d")
        raw_data = {}

        for variant in variants:
            # Switch variant tab
            try:
                variant_xpath = f"//*[self::button or self::div or self::span][normalize-space()='{variant}']"
                tab_btn = page.locator(variant_xpath).first
                if await tab_btn.is_visible(timeout=2000):
                    await tab_btn.click(force=True)
                    await page.wait_for_timeout(1000)
            except Exception as e:
                print(f"Variant tab note ({variant}): {e}")

            for pot_label, target_f, target_r in potion_states:
                combo_tag = f"{variant}_{pot_label}"
                print(f"Processing combo: {combo_tag} (Fly={target_f}, Ride={target_r})")

                await set_potion_state(page, target_f, target_r)
                await page.wait_for_timeout(1000)

                await scroll_and_harvest(page, combo_tag, raw_data, max_scrolls=300)

        # --- REVISED DEDUPLICATION LOGIC ---
        csv_filename = "history.csv"
        previous_records = load_latest_historical_values(csv_filename)
        rows_to_append = []

        # Retain explicit combo tags (Regular_R, Regular_FR, etc.) without collapsing
        for (name, combo_tag), scraped_val in raw_data.items():
            _, prev_val = previous_records.get((name, combo_tag), (None, None))
            
            # Record if new item/variant combo OR if value changed
            if prev_val != scraped_val:
                rows_to_append.append(f"{today_date},{name},{combo_tag},{scraped_val}\n")

        if rows_to_append:
            rows_to_append.sort()
            with open(csv_filename, "a", encoding="utf-8") as f:
                f.writelines(rows_to_append)
            print(f"SUCCESS: Saved {len(rows_to_append)} records (including Regular_R entries) to {csv_filename}!")
        else:
            print("No value changes or new records found.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(scrape_elvebredd())
