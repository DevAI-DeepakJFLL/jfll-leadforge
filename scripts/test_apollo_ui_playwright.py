import time
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

SCREENSHOTS_DIR = Path("audit-screenshots")
SCREENSHOTS_DIR.mkdir(exist_ok=True)

ARTIFACT_DIR = Path("/Users/deepak/.gemini/antigravity-cli/brain/c81bf47f-3dca-4a72-998a-fefab0ca0229")
ARTIFACT_DIR.mkdir(exist_ok=True)

def run_tests():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        
        # 1. Desktop Test (1440x900)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        
        print("Navigating to http://127.0.0.1:5173 ...")
        page.goto("http://127.0.0.1:5173")
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        
        # Check if login page is displayed
        if page.locator("input[type='email']").is_visible():
            print("Logging in...")
            page.fill("input[type='email']", "leads@jfll.com")
            page.fill("input[type='password']", "Jet@123")
            page.click("button[type='submit']")
            page.wait_for_load_state("networkidle")
            time.sleep(1)
            print("Logged in successfully.")
            
        # Navigate to Apollo Database Tab
        print("Clicking 'Apollo Database' tab...")
        apollo_tab = page.locator("button:has-text('Apollo Database')")
        apollo_tab.click()
        time.sleep(1)
        
        # Verify Apollo Database is active
        assert page.locator("text=All Commercial Shippers").first.is_visible(), "All Commercial Shippers tab not visible"
        assert page.get_by_role("button", name="Cargo Verticals", exact=True).is_visible(), "Cargo Verticals filter not visible"
        print("Verified Apollo Database tab is active.")

        
        # Capture Desktop Apollo Table View
        desktop_screenshot_path = SCREENSHOTS_DIR / "apollo-database-desktop-1440.png"
        page.screenshot(path=str(desktop_screenshot_path))
        page.screenshot(path=str(ARTIFACT_DIR / "apollo-database-desktop-1440.png"))
        print(f"Captured {desktop_screenshot_path}")
        
        # Test Search bar placed next to Select option
        print("Testing inline search bar...")
        search_input = page.locator("input[aria-label='Search Apollo leads']")
        assert search_input.is_visible(), "Search bar next to select option not visible"
        search_input.fill("Boeing")
        time.sleep(0.5)
        
        # Verify search filter results
        assert page.locator("text=Boeing").first.is_visible(), "Boeing search result not visible"
        search_screenshot_path = SCREENSHOTS_DIR / "apollo-search-desktop-1440.png"
        page.screenshot(path=str(search_screenshot_path))
        page.screenshot(path=str(ARTIFACT_DIR / "apollo-search-desktop-1440.png"))
        print(f"Captured {search_screenshot_path}")
        
        # Clear search
        page.locator("button[aria-label='Clear search']").click()
        time.sleep(0.5)
        
        # Test Filter Behavior: Toggle a cargo vertical
        print("Testing Cargo Vertical filter checkbox...")
        auto_checkbox = page.locator("label:has-text('Automotive & Parts') input[type='checkbox']").first
        auto_checkbox.click()
        time.sleep(0.5)
        
        # Verify Active filter chips bar
        assert page.locator("text=Active filters:").first.is_visible(), "Active filter chips not visible"
        assert page.locator("text=Automotive & Parts").first.is_visible(), "Automotive chip not visible"
        filter_screenshot_path = SCREENSHOTS_DIR / "apollo-filtered-desktop-1440.png"
        page.screenshot(path=str(filter_screenshot_path))
        page.screenshot(path=str(ARTIFACT_DIR / "apollo-filtered-desktop-1440.png"))
        print(f"Captured {filter_screenshot_path}")
        
        # Test Detail View: Open Slide-Over Drawer
        print("Testing View Details slide-over drawer...")
        view_button = page.get_by_role("button", name="View", exact=True).first
        assert view_button.is_visible(), "Apollo lead View button not visible"
        view_button.click()
        time.sleep(1)
        
        # Verify Drawer is visible with deep metrics
        assert page.locator("text=Commercial Scale & Footprint").first.is_visible(), "Drawer scale card not visible"
        assert page.locator("text=Jet Freight Logistics Alignment").first.is_visible(), "Logistics alignment not visible"

        
        drawer_screenshot_path = SCREENSHOTS_DIR / "apollo-drawer-desktop-1440.png"
        page.screenshot(path=str(drawer_screenshot_path))
        page.screenshot(path=str(ARTIFACT_DIR / "apollo-drawer-desktop-1440.png"))
        print(f"Captured {drawer_screenshot_path}")
        
        # Close Drawer via Escape or Close button
        page.keyboard.press("Escape")
        time.sleep(0.5)
        print("Closed drawer via Escape key.")
        
        # 2. Tablet Test (768x1024)
        print("Testing Tablet layout (768x1024)...")
        context_tablet = browser.new_context(viewport={"width": 768, "height": 1024})
        page_tablet = context_tablet.new_page()
        page_tablet.goto("http://127.0.0.1:5173")
        page_tablet.wait_for_load_state("networkidle")
        if page_tablet.locator("input[type='email']").is_visible():
            page_tablet.fill("input[type='email']", "leads@jfll.com")
            page_tablet.fill("input[type='password']", "Jet@123")
            page_tablet.click("button[type='submit']")
            page_tablet.wait_for_load_state("networkidle")
            time.sleep(1)
            
        page_tablet.locator("button:has-text('Apollo Database')").click()
        time.sleep(1)
        
        tablet_screenshot_path = SCREENSHOTS_DIR / "apollo-database-tablet-768.png"
        page_tablet.screenshot(path=str(tablet_screenshot_path))
        page_tablet.screenshot(path=str(ARTIFACT_DIR / "apollo-database-tablet-768.png"))
        print(f"Captured {tablet_screenshot_path}")
        
        # 3. Mobile Test (390x844)
        print("Testing Mobile layout (390x844)...")
        context_mobile = browser.new_context(viewport={"width": 390, "height": 844})
        page_mobile = context_mobile.new_page()
        page_mobile.goto("http://127.0.0.1:5173")
        page_mobile.wait_for_load_state("networkidle")
        if page_mobile.locator("input[type='email']").is_visible():
            page_mobile.fill("input[type='email']", "leads@jfll.com")
            page_mobile.fill("input[type='password']", "Jet@123")
            page_mobile.click("button[type='submit']")
            page_mobile.wait_for_load_state("networkidle")
            time.sleep(1)
            
        page_mobile.locator("button:has-text('Apollo Database')").click()
        time.sleep(1)
        
        mobile_screenshot_path = SCREENSHOTS_DIR / "apollo-database-mobile-390.png"
        page_mobile.screenshot(path=str(mobile_screenshot_path))
        page_mobile.screenshot(path=str(ARTIFACT_DIR / "apollo-database-mobile-390.png"))
        print(f"Captured {mobile_screenshot_path}")
        
        browser.close()
        print("All Playwright UI tests completed successfully!")

if __name__ == "__main__":
    run_tests()
