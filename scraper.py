import asyncio
import os
from datetime import datetime
from playwright.async_api import async_playwright


def load_latest_historical_values(csv_filename):
    """
    Reads history.csv and tracks the MOST RECENT value logged for every
    (item_name, variant_combo) pair to detect value changes.
    """
    latest_values = {}
    if not os.path.exists(csv_filename):
        return latest_values

    with open(csv_filename, "r", encoding="utf-8") as f:
        for line in f:
            parts = line.strip().split(",")
            if len(parts) >= 4:
                # Format: date, name, combo_tag, value
                name = ",".join(parts[1:-2]) if len(parts) > 4 else parts[1]
                combo = parts[-2]
                val = parts[-1]

                # Overwrites as it reads down, retaining the latest recorded value
                latest_values[(name, combo)] = val

    return latest_values


async def ensure_toggle_state(page, button_selector, target_active):
    """
    Helper function to explicitly inspect if a toggle button (Fly/Ride) is active
    by checking CSS classes/attributes, and clicking ONLY if state needs to change.
    """
    try:
        btn = page.locator(button_selector).first
        if await btn.is_visible():
            # Check for active state in classes or aria attributes
            classes = (await btn.get_attribute("class") or "").lower()
            aria_pressed = await btn.get_attribute("aria-pressed")
            
            # Common active indicators on modern web UIs
            is_active = "active" in classes or "bg-" in classes or aria_pressed == "true"
            
            if is_active != target_active:
                await btn.click(force=True)
                await page.wait_for_timeout(600)
    except Exception as e:
        print(f"Toggle error for {button_selector}: {e}")


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

        # 1. Expand the item drawer
        print("Locating 'Add' button position...")
        add_slot = page.locator("[aria-label*='Add']").first
        add_box = await add_slot.bounding_box()

        if add_box:
            base_x = add_box["x"] + (add_box["width"] / 2)
            base_y = add_box["y"] + (add_box["height"] / 2)
            
            await add_slot.click(force=True)
            await page.wait_for_timeout(3000)

            # Click 120px above the Add slot center for the expand drawer button
            expand_y = base_y - 120
            print(f"Clicking expand button at position: ({base_x}, {expand_y})")
            await page.mouse.click(base_x, expand_y)
            await page.wait_for_timeout(1500)
        else:
            await add_slot.click(force=True)
            await page.wait_for_timeout(3000)

        variants = ["Regular", "N", "M"]
        potion_states = {
            "FR": (True, True),
            "R":  (False, True),
            "F":  (True, False),
            "NP": (False, False)
        }

        today_date = datetime.utcnow().strftime("%Y-%m-%d")
        raw_data = {}

        # 2. Extract Data Across All Matrix Combinations
        for variant in variants:
            # Click specific variant tab using exact text matching
            try:
                if variant == "Regular":
                    tab_btn = page.locator("button:has-text('Regular')").first
                else:
                    tab_btn = page.locator(f"button:has-text('{variant}')").first
                
                if await tab_btn.is_visible():
                    await tab_btn.click(force=True)
                    await page.wait_for_timeout(1500)
            except Exception as e:
                print(f"Variant tab switch note ({variant}): {e}")

            for pot_label, (target_f, target_r) in potion_states.items():
                combo_tag = f"{variant}_{pot_label}"
                print(f"Scraping matrix combo: {combo_tag} (Fly={target_f}, Ride={target_r})")

                # Ensure Fly / Ride toggle buttons match exact target state
                await ensure_toggle_state(page, "button:has-text('Fly'), button:has-text('F')", target_f)
                await ensure_toggle_state(page, "button:has-text('Ride'), button:has-text('R')", target_r)
                await page.wait_for_timeout(500)

                # Scroll down drawer and extract values
                for step in range(12):
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
                                    # Store each variant combination as a distinct entry
                                    raw_data[(name, combo_tag)] = val
                        except Exception:
                            continue

                    await page.mouse.move(800, 500)
                    await page.mouse.wheel(0, 1400)
                    await page.wait_for_timeout(500)

                # Reset drawer scroll back to top for the next potion state loop
                await page.mouse.move(800, 500)
                await page.mouse.wheel(0, -20000)
                await page.wait_for_timeout(800)

        # 3. Read existing history to compare changes
        csv_filename = "history.csv"
        previous_values = load_latest_historical_values(csv_filename)

        rows_to_append = []

        # Strictly write every updated (name, combo_tag) tuple to history
        for (name, combo_tag), scraped_val in raw_data.items():
            last_val = previous_values.get((name, combo_tag))
            
            # Log record if value changed or if it's a new entry
            if last_val != scraped_val:
                rows_to_append.append(f"{today_date},{name},{combo_tag},{scraped_val}\n")

        # 4. Append changed records to history.csv
        if rows_to_append:
            rows_to_append.sort()
            with open(csv_filename, "a", encoding="utf-8") as f:
                f.writelines(rows_to_append)
            print(f"SUCCESS: Logged {len(rows_to_append)} unique value updates to {csv_filename}!")
        else:
            print("No value changes detected today. CSV remains lightweight!")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(scrape_elvebredd())
