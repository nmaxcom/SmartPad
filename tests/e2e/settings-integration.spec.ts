/**
 * Settings Integration Tests
 *
 * Tests settings modal and integration including:
 * - Settings modal functionality
 * - Settings persistence
 * - Settings UI interactions
 * - Settings state management
 */

import { test, expect } from "@playwright/test";
import { waitForUIRenderComplete } from "./utils";

test.describe("Settings Integration", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto("/");

    // Wait for the app to load
    await page.waitForSelector('[data-testid="smart-pad-editor"]');
  });

  test("renders settings button in header", async ({ page }) => {
    const settingsButton = page.getByLabel("Open settings");
    await expect(settingsButton).toBeVisible();
    await expect(settingsButton).toContainText("⚙️");
  });

  test("opens settings modal when button clicked", async ({ page }) => {
    const settingsButton = page.getByLabel("Open settings");
    await settingsButton.click();

    await expect(page.getByText("Settings")).toBeVisible();
    await expect(page.getByLabel("Decimal Places")).toBeVisible();
  });

  test("closes settings modal with close button", async ({ page }) => {
    // Open modal
    const settingsButton = page.getByLabel("Open settings");
    await settingsButton.click();

    await expect(page.getByText("Settings")).toBeVisible();

    // Close modal
    const closeButton = page.getByLabel("Close settings");
    await closeButton.click();

    await expect(page.getByText("Settings")).not.toBeVisible();
  });

  test("closes settings modal with Escape key", async ({ page }) => {
    // Open modal
    const settingsButton = page.getByLabel("Open settings");
    await settingsButton.click();

    await expect(page.getByText("Settings")).toBeVisible();

    // Press Escape
    await page.keyboard.press("Escape");

    await expect(page.getByText("Settings")).not.toBeVisible();
  });

  test("changes decimal places setting", async ({ page }) => {
    // Open settings
    const settingsButton = page.getByLabel("Open settings");
    await settingsButton.click();

    await expect(page.getByText("Settings")).toBeVisible();

    // Find the number input (default should be 2)
    const numberInput = page.getByRole("spinbutton");
    await expect(numberInput).toHaveValue("2");

    // Change the value to 4
    await numberInput.fill("4");

    // Verify localStorage was updated
    const localStorage = await page.evaluate(() =>
      JSON.parse(window.localStorage.getItem("smartpad-settings") || "{}")
    );
    expect(localStorage.decimalPlaces).toBe(4);
  });

  test("loads settings from localStorage", async ({ page }) => {
    // Set localStorage before navigation
    await page.addInitScript(() => {
      window.localStorage.setItem("smartpad-settings", JSON.stringify({ decimalPlaces: 5 }));
    });

    // Navigate to the app
    await page.goto("/");
    await page.waitForSelector('[data-testid="smart-pad-editor"]');

    // Open settings
    const settingsButton = page.getByLabel("Open settings");
    await settingsButton.click();

    // Check that the number input reflects the loaded setting
    const numberInput = page.getByRole("spinbutton");
    await expect(numberInput).toHaveValue("5");
  });

  test("resets settings to defaults", async ({ page }) => {
    // Open settings
    const settingsButton = page.getByLabel("Open settings");
    await settingsButton.click();

    await expect(page.getByText("Settings")).toBeVisible();

    // Find number input for assertions
    const numberInput = page.getByRole("spinbutton");

    // Change the number input to non-default value first
    await numberInput.fill("8");
    await expect(numberInput).toHaveValue("8");

    // Handle the confirm dialog that will appear
    page.on("dialog", async (dialog) => {
      expect(dialog.type()).toBe("confirm");
      await dialog.accept();
    });

    // Click reset button
    const resetButton = page.getByText("Reset to Defaults");
    await resetButton.click();

    // Check that number input is back to default (2)
    await expect(numberInput).toHaveValue("2");

    // Verify localStorage was updated
    const localStorage = await page.evaluate(() =>
      JSON.parse(window.localStorage.getItem("smartpad-settings") || "{}")
    );
    expect(localStorage.decimalPlaces).toBe(2);
  });

  test("decimal places setting affects editor and variable panel display", async ({ page }) => {
    // Set decimal places to 3
    await page.addInitScript(() => {
      window.localStorage.setItem("smartpad-settings", JSON.stringify({ decimalPlaces: 3 }));
    });

    // Navigate to the app
    await page.goto("/");
    await page.waitForSelector('[data-testid="smart-pad-editor"]');

    // Type an expression that will result in a decimal
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("10/3 =>");
    await page.keyboard.press("Enter");

    // Wait for evaluation and check decoration shows 3 decimal places
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /3\.333$/
    );

    // Create a variable assignment
    await page.keyboard.type("pi = 3.14159 =>");
    await page.keyboard.press("Enter");

    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /3\.142$/
    );

    // Check that variable panel also shows 3 decimal places
    const variablePanel = page.locator('[data-testid="variable-panel"]');
    await expect(variablePanel.getByText("3.142")).toBeVisible();

    // Change setting to 1 decimal place
    const settingsButton = page.getByLabel("Open settings");
    await settingsButton.click();

    const numberInput = page.getByRole("spinbutton");
    await numberInput.fill("1");
    await numberInput.press("Enter");

    // Close settings
    await page.keyboard.press("Escape");

    // Wait for the editor to update and check decorations now show 1 decimal place
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").nth(0)).toHaveAttribute(
      "data-result",
      /3\.3$/
    );
    await expect(page.locator(".semantic-result-display").nth(1)).toHaveAttribute(
      "data-result",
      /3\.1$/
    );

    // Check that variable panel also shows 1 decimal place
    await expect(variablePanel.getByText("3.1")).toBeVisible();
  });

  test("decimal places setting affects new calculations immediately", async ({ page }) => {
    // Set decimal places to 4
    await page.addInitScript(() => {
      window.localStorage.setItem("smartpad-settings", JSON.stringify({ decimalPlaces: 4 }));
    });

    // Navigate to the app
    await page.goto("/");
    await page.waitForSelector('[data-testid="smart-pad-editor"]');

    // Type a new calculation
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("22/7 =>");
    await page.keyboard.press("Enter");

    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /3\.1429$/
    );
  });

  test("changing decimal places setting updates existing content", async ({ page }) => {
    // Start with default 2 decimal places
    await page.goto("/");
    await page.waitForSelector('[data-testid="smart-pad-editor"]');

    // Create some content with 2 decimal places
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("10/3 =>");
    await page.keyboard.press("Enter");
    await page.keyboard.type("pi = 3.14159 =>");
    await page.keyboard.press("Enter");

    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").nth(0)).toHaveAttribute(
      "data-result",
      /3\.33$/
    );
    await expect(page.locator(".semantic-result-display").nth(1)).toHaveAttribute(
      "data-result",
      /3\.14$/
    );

    // Check variable panel
    const variablePanel = page.locator('[data-testid="variable-panel"]');
    await expect(variablePanel.getByText("3.14")).toBeVisible();

    // Change setting to 3 decimal places
    const settingsButton = page.getByLabel("Open settings");
    await settingsButton.click();

    const numberInput = page.getByRole("spinbutton");
    await numberInput.fill("3");
    await numberInput.press("Enter");

    // Close settings
    await page.keyboard.press("Escape");

    // Wait a moment for the editor to update
    await page.waitForTimeout(500);

    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").nth(0)).toHaveAttribute(
      "data-result",
      /3\.333$/
    );
    await expect(page.locator(".semantic-result-display").nth(1)).toHaveAttribute(
      "data-result",
      /3\.142$/
    );
    await expect(variablePanel.getByText("3.142")).toBeVisible();
  });

  test("has modern header layout", async ({ page }) => {
    // Check for modern header elements
    const header = page.locator("header.app-header");
    await expect(header).toBeVisible();

    await expect(page.getByText("SmartPad")).toBeVisible();
    await expect(
      page.getByText("Text-based calculator with real-time mathematical calculations")
    ).toBeVisible();
  });

  test("has constrained editor container", async ({ page }) => {
    const editorContainer = page.locator(".editor-container");
    await expect(editorContainer).toBeVisible();

    const mainContainer = page.locator(".app-main");
    await expect(mainContainer).toBeVisible();
  });

  /*
   * DEBUGGING EXAMPLES - Uncomment to debug invisible element issues
   */
  /*
  test("debug invisible checkbox", async ({ page }) => {
    // Open settings
    const settingsButton = page.getByLabel("Open settings");
    await settingsButton.click();
    await expect(page.getByText("Settings")).toBeVisible();

    // Method 1: Check if element exists but is not visible
    const checkbox = page.getByRole("checkbox");
    console.log("Checkbox exists:", await checkbox.count()); // Should be 1
    console.log("Checkbox visible:", await checkbox.isVisible()); // Should be false
    
    // Method 2: Click the visible toggle switch container instead
    const toggleSwitch = page.locator(".toggle-switch");
    await toggleSwitch.click(); // Click the visible container
    
    // Method 3: Click by label (most semantic approach)
    const label = page.getByText("Auto-jump cursor to end");
    await label.click(); // Click the label, which should toggle the checkbox
    
    // Method 4: Use CSS selector for the visual toggle
    const visualToggle = page.locator(".toggle-slider");
    await visualToggle.click(); // Click the visual toggle element
    
    // Method 5: Force click (what we used in the fix)
    await checkbox.click({ force: true });
  });
  */
});
