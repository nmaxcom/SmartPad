/**
 * User Issues Fixed Tests
 *
 * Tests fixes for reported user issues including:
 * - Bug fixes validation
 * - User workflow verification
 * - Issue resolution confirmation
 * - User experience improvements
 */

import { test, expect } from "@playwright/test";
import { waitForUIRenderComplete } from "./utils";

test.describe("User Issues Fixed", () => {
  test("both user-reported issues should now work correctly", async ({ page }) => {
    await page.goto("/");

    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await page.waitForSelector('[data-testid="smart-pad-editor"]');

    // Issue 1: boiling_point = 100 °C => should create variable with units preserved in display
    console.log("\n=== Testing Issue 1: boiling_point = 100 °C => ===");
    await editor.click();
    const pm = page.locator(".ProseMirror");
    await pm.type("boiling_point = 100 °C =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    // Check that we get a units display
    const issue1Display = await page
      .locator(".semantic-result-display")
      .last()
      .getAttribute("data-result");
    expect(issue1Display || "").toContain("°C");

    // Clear for next test
    await pm.fill("");
    await page.waitForTimeout(500);

    // Issue 2: boiling_point = 100 °C (no =>) should create variable and display with units
    console.log("\n=== Testing Issue 2: boiling_point = 100 °C ===");
    await pm.fill("boiling_point = 100 °C");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    // Check that we get a units display (not just plain text)
    const issue2Display = await page
      .locator(".semantic-assignment-display")
      .last()
      .getAttribute("data-result");
    expect(issue2Display || "").toContain("°C");

    // Check that variable was created in the variables panel
    const variablesPanel = await page.locator('[data-testid="variable-panel"]').textContent();
    expect(variablesPanel || "").toContain("boiling_point");

    console.log("\n✅ Both issues are fixed!");
  });
});
