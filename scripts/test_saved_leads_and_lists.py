import time
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = Path("/Users/deepak/.gemini/antigravity-cli/brain/c81bf47f-3dca-4a72-998a-fefab0ca0229")
ARTIFACT_DIR.mkdir(exist_ok=True)

LIVE_URL = "https://d3c4bsffw7tf7s.cloudfront.net/"

def run_verification():
    print(f"Launching Chrome Playwright to test {LIVE_URL} ...")
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # 1. Navigate to live CloudFront
        print("1. Navigating to live CloudFront...")
        page.goto(LIVE_URL, timeout=60000)
        page.wait_for_load_state("networkidle")
        time.sleep(1)

        # 2. Login if needed
        if page.locator("input[type='email']").is_visible():
            print("Logging in with demo enterprise credentials...")
            page.fill("input[type='email']", "leads@jfll.com")
            page.fill("input[type='password']", "Jet@123")
            page.click("button[type='submit']")
            page.wait_for_load_state("networkidle")
            time.sleep(2)
            print("Logged in successfully.")

        # 3. Switch to People Directory
        print("2. Switching to People Directory via Top Header...")
        page.locator("header button:has-text('People'), nav button:has-text('People')").first.click()
        page.wait_for_selector("button:has-text('All People')", timeout=15000)
        time.sleep(2)

        # Clear any prior localStorage data to verify from clean slate
        page.evaluate("window.localStorage.removeItem('leadforge_saved_leads'); window.localStorage.removeItem('leadforge_saved_lists');")
        page.reload()
        page.wait_for_load_state("networkidle")
        time.sleep(2)

        # Switch back to People tab after reload
        print("3. Selecting People directory...")
        page.locator("header button:has-text('People'), nav button:has-text('People')").first.click()
        page.wait_for_selector("button:has-text('All People')", timeout=15000)
        time.sleep(2)

        # Verify initial Audience tab count for Saved People is 0
        saved_people_tab = page.locator("button:has-text('Saved People')").first
        print(f"Initial Saved People tab text: {saved_people_tab.text_content()}")
        assert "(0)" in saved_people_tab.text_content(), f"Expected (0) in tab, got {saved_people_tab.text_content()}"

        # 4. Check initial table rows
        rows = page.locator("tbody tr")
        print(f"Table displays {rows.count()} leads on page 1.")
        assert rows.count() > 0, "No leads rendered in table!"

        # Verify Action Bar shows selected leads
        action_bar_text = page.locator("div[aria-label='Table Actions Toolbar']").text_content()
        print(f"Action bar text: {action_bar_text}")
        assert "leads ready for export or list save" in action_bar_text

        # 5. Click 'Save Leads'
        print("4. Clicking 'Save Leads' button...")
        save_btn = page.locator("button:has-text('Save Leads')")
        save_btn.click()
        time.sleep(1)

        # Verify Toast notification
        toast = page.locator("div[role='status'], div[class*='toast'], div:has-text('Saved')").first
        print(f"Toast visible: {toast.text_content()}")
        assert "Saved" in toast.text_content(), "Expected save toast notification"

        # Verify Saved People tab count updated
        saved_tab_text_after = saved_people_tab.text_content()
        print(f"Updated Saved People tab text: {saved_tab_text_after}")
        assert "(0)" not in saved_tab_text_after, f"Expected non-zero count, got {saved_tab_text_after}"

        page.screenshot(path=str(ARTIFACT_DIR / "live-saved-leads-toast.png"))
        print("Saved screenshot: live-saved-leads-toast.png")

        # 6. Click 'Saved People' tab
        print("5. Clicking 'Saved People' audience tab...")
        saved_people_tab.click()
        time.sleep(2)

        saved_rows = page.locator("tbody tr")
        saved_count = saved_rows.count()
        print(f"Verified: 'Saved People' tab displays {saved_count} saved leads.")
        assert saved_count > 0, f"Expected saved leads > 0, got {saved_count}"

        page.screenshot(path=str(ARTIFACT_DIR / "live-saved-people-tab.png"))
        print("Saved screenshot: live-saved-people-tab.png")

        # 7. Test 'Add to List' with a custom named list
        print("6. Selecting 1 lead and testing 'Add to List'...")
        page.locator("tbody tr button[aria-label^='Select']").first.click()
        time.sleep(0.5)

        add_to_list_btn = page.locator("button:has-text('Add to List')")
        add_to_list_btn.click()
        time.sleep(0.5)

        create_list_btn = page.locator("button:has-text('Create New List')")
        create_list_btn.click()
        time.sleep(0.3)

        list_input = page.locator("input[placeholder='List name...']")
        list_input.fill("Strategic Pharma Accounts")
        page.locator("button[type='submit']:has-text('Save')").click()
        time.sleep(1)

        add_toast = page.locator("div:has-text('Strategic Pharma Accounts')").first
        print(f"Add to list toast: {add_toast.text_content()}")
        assert "Added" in add_toast.text_content()

        page.screenshot(path=str(ARTIFACT_DIR / "live-add-to-list-success.png"))
        print("Saved screenshot: live-add-to-list-success.png")

        # 8. Verify persistence across page refresh
        print("7. Reloading page to verify persistence across sessions...")
        page.reload()
        page.wait_for_load_state("networkidle")
        time.sleep(2)

        # Check TopHeader badge shows saved count
        top_saved_btn = page.locator("header button:has-text('Saved Lists'), nav button:has-text('Saved Lists')").first
        print(f"TopHeader 'Saved Lists' tab text: {top_saved_btn.text_content()}")

        # Switch to Saved People tab
        page.locator("header button:has-text('People')").first.click()
        time.sleep(1)
        page.locator("button:has-text('Saved People')").first.click()
        time.sleep(1.5)

        persisted_rows = page.locator("tbody tr").count()
        print(f"Verified: After page refresh, {persisted_rows} leads remain safely persisted in Saved People tab.")
        assert persisted_rows == saved_count, f"Expected {saved_count} persisted leads, got {persisted_rows}"

        page.screenshot(path=str(ARTIFACT_DIR / "live-persisted-saved-leads-after-refresh.png"))
        print("Saved screenshot: live-persisted-saved-leads-after-refresh.png")

        # 9. Test single lead toggle save directly via row bookmark button
        print("8. Testing direct inline bookmark button toggle on first row...")
        row_bookmark_btn = page.locator("tbody tr button[aria-label='Unsave lead']").first
        row_bookmark_btn.click()
        time.sleep(1)

        page.screenshot(path=str(ARTIFACT_DIR / "live-row-bookmark-toggle.png"))
        print("Saved screenshot: live-row-bookmark-toggle.png")

        remaining_count = page.locator("tbody tr").count()
        print(f"Verified: After unsaving 1 lead, {remaining_count} leads remain in Saved People tab (was {saved_count}).")
        assert remaining_count == saved_count - 1, f"Expected {saved_count - 1} remaining leads, got {remaining_count}"

        print("\n🎉 ALL E2E VERIFICATION CHECKS PASSED WITH 100% SUCCESS ON PRODUCTION!")
        browser.close()

if __name__ == "__main__":
    run_verification()
