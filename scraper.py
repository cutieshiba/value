import asyncio
import os
from datetime import datetime
from playwright.async_api import async_playwright


def load_latest_historical_values(csv_filename):
    """
    Reads existing CSV history and maps (item_name, combo_tag) -> (date, value).
    This ensures we only append records when a value ACTUALLY changes, or when a new item appears.
    """
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


async def click_potion_toggle(page, letter):
    """
    Clicks the F or R toggle button and waits briefly for the JS UI state to settle.
    """
    xpath = f"//*[self::button or self::div or self::span][normalize-space()='{letter}']"
    try:
        btn = page.locator(xpath).first
        if await btn.is_visible(timeout=1000):
            await btn.click(force=True)
            await page.wait_for_timeout(800)
            return True
    except Exception as e:
        print(f"Failed to click potion button '{letter}': {e}")
    return False


async def scroll_and_harvest(page, combo_tag, raw_data, baseline_map, max_scrolls=500, force_full_scroll=False):
    """
    Scrolls inside the drawer container.
    - If force_full_scroll is True (1st category), scrolls all the way to the bottom to index everything.
    - Otherwise, stops early if 15 consecutive items match the baseline values from the 1st category.
    """
    # 1. Reset scroll position of the drawer container directly to top
    await page.evaluate("""
        () => {
            const drawer = document.querySelector("div[class*='drawer'], div[class*='modal'], div[class*='scroll'], div[class*='grid']");
            if (drawer) {
                drawer.scrollTop = 0;
            }
            window.scrollTo(0, 0);
        }
    """)
    await page.mouse.move(800, 500)
    await page.mouse.wheel(0, -50000)
    await page.wait_for_timeout(1000)

    consecutive_baseline_matches = 0

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

                        # On subsequent runs, check if this item matches baseline (first category)
                        if not force_full_scroll and name in baseline_map:
                            if baseline_map[name] == val:
                                consecutive_baseline_matches += 1
                            else:
                                consecutive_baseline_matches = 0
            except Exception:
                continue

        # EARLY EXIT CONDITION (Applies to 2nd category onwards):
        if not force_full_scroll and consecutive_baseline_matches >= 15:
            print(f"[{combo_tag}] Reached identical baseline items ({consecutive_baseline_matches} matches). Stopping scroll early at step {step + 1}.")
            break

        # Fast mouse wheel step
        await page.mouse.move(800, 500)
        await page.mouse.wheel(0, 300)
        await page.wait_for_timeout(100)


async def scrape_elvebredd():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        context = await browser.new_context(
            viewport={"width": 1600, "height": 1000},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        print("Navigating to Elvebredd...")
        await page.goto("https://elvebredd.com/ValueCalculator.html", wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_timeout(4000)

        # Expand item drawer
        add_slot = page.locator("[aria-label*='Add']").first
        add_box = await add_slot.bounding_box()

        if add_box:
            base_x = add_box["x"] + (add_box["width"] / 2)
            base_y = add_box["y"] + (add_box["height"] / 2)
            await add_slot.click(force=True)
            await page.wait_for_timeout(3000)

            expand_y = base_y - 120
            await page.mouse.click(base_x, expand_y)
            await page.wait_for_timeout(2000)
        else:
            await add_slot.click(force=True)
            await page.wait_for_timeout(3000)

        variants = ["Regular", "N", "M"]
        potion_states = [
            ("FR", True, True),
            ("R", False, True),
            ("F", True, False),
            ("NP", False, False)
        ]

        current_fly = False
        current_ride = False

        today_date = datetime.utcnow().strftime("%Y-%m-%d")
        raw_data = {}
        baseline_map = {}
        is_first_category = True

        for variant in variants:
            # Switch variant tab
            try:
                variant_xpath = f"//*[self::button or self::div or self::span][normalize-space()='{variant}']"
                tab_btn = page.locator(variant_xpath).first
                if await tab_btn.is_visible(timeout=2000):
                    await tab_btn.click(force=True)
                    await page.wait_for_timeout(1000)
            except Exception as e:
                print(f"Variant tab switch note ({variant}): {e}")

            for pot_label, target_f, target_r in potion_states:
                combo_tag = f"{variant}_{pot_label}"
                print(f"Processing combo: {combo_tag} (Fly={target_f}, Ride={target_r})")

                # Toggle buttons to hit target state
                if current_fly != target_f:
                    if await click_potion_toggle(page, "F"):
                        current_fly = target_f

                if current_ride != target_r:
                    if await click_potion_toggle(page, "R"):
                        current_ride = target_r

                await page.wait_for_timeout(800)

                # Harvest
                await scroll_and_harvest(
                    page,
                    combo_tag,
                    raw_data,
                    baseline_map,
                    max_scrolls=500,
                    force_full_scroll=is_first_category
                )

                # Save baseline map from the initial full scan
                if is_first_category:
                    for (item_name, c_tag), val in raw_data.items():
                        if c_tag == combo_tag:
                            baseline_map[item_name] = val
                    print(f"Baseline created with {len(baseline_map)} total items recorded.")
                    is_first_category = False

        # --- DAILY APPEND & DEDUPLICATION LOGIC ---
        csv_filename = "history.csv"
        previous_records = load_latest_historical_values(csv_filename)
        
        # Group scraped results by pet/item name
        pet_combos_map = {}
        for (name, combo_tag), scraped_val in raw_data.items():
            if name not in pet_combos_map:
                pet_combos_map[name] = {}
            pet_combos_map[name][combo_tag] = scraped_val

        rows_to_append = []

        for name, combo_dict in pet_combos_map.items():
            unique_values = set(combo_dict.values())

            # Collapse to 1 entry if all recorded variants have the exact same value
            if len(unique_values) == 1:
                single_val = list(unique_values)[0]
                combo_tag = "Regular_NP"
                
                prev_date, prev_val = previous_records.get((name, combo_tag), (None, None))
                
                # Append ONLY if value is new/changed OR hasn't been logged today yet
                if prev_val != single_val or prev_date != today_date:
                    rows_to_append.append(f"{today_date},{name},{combo_tag},{single_val}\n")
            else:
                for combo_tag, scraped_val in combo_dict.items():
                    prev_date, prev_val = previous_records.get((name, combo_tag), (None, None))
                    if prev_val != scraped_val or prev_date != today_date:
                        rows_to_append.append(f"{today_date},{name},{combo_tag},{scraped_val}\n")

        # Append new records to history.csv
        if rows_to_append:
            rows_to_append.sort()
            with open(csv_filename, "a", encoding="utf-8") as f:
                f.writelines(rows_to_append)
            print(f"SUCCESS: Appended {len(rows_to_append)} new/updated value records to {csv_filename}!")
        else:
            print("No new pets, items, or value changes detected today. CSV remains up to date!")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(scrape_elvebredd())
