/**
 * Template Basic Functionality Tests
 *
 * Tests template panel basic functionality including:
 * - Template creation and management
 * - Template application
 * - Template UI interactions
 * - Template state management
 */

import { test, expect } from "@playwright/test";
import { waitForUIRenderComplete } from "./utils";

const selectAllShortcut = process.platform === "darwin" ? "Meta+a" : "Control+a";

const clearEditor = async (page: import("@playwright/test").Page) => {
  await page.locator(".ProseMirror").click();
  await page.keyboard.press(selectAllShortcut);
  await page.keyboard.press("Backspace");
  await waitForUIRenderComplete(page);
};

test.describe("Template Basic Functionality", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="smart-pad-editor"]');
  });

  test("Templates insert and evaluate correctly", async ({ page }) => {
    await page.click('button[title="Quick Tour"]');
    await waitForUIRenderComplete(page);

    const resultWidgets = await page.locator(".semantic-result-display").count();
    expect(resultWidgets).toBeGreaterThanOrEqual(10);
    await expect(page.locator(".semantic-error-result")).toHaveCount(0);

    await page.click('button[title="Goal Seek"]');
    await waitForUIRenderComplete(page);

    await expect(page.locator(".semantic-result-display").first()).toBeVisible();
    await expect(page.locator(".semantic-error-result")).toHaveCount(0);
  });

  test("All launch templates create result widgets without errors", async ({ page }) => {
    const templates = [
      "Quick Tour",
      "Capability Sprint",
      "New stuff",
      "Goal Seek",
      "Investment Lab",
      "Unit Aliases & Ratios",
    ];

    for (const templateName of templates) {
      await page.click(`button[title="${templateName}"]`);
      await waitForUIRenderComplete(page);

      const resultWidgets = await page.locator(".semantic-result-display").count();
      expect(resultWidgets).toBeGreaterThan(0);
      await expect(page.locator(".semantic-error-result")).toHaveCount(0);
    }
  });

  test("Templates create proper widget decorations (not just text)", async ({ page }) => {
    await page.click('button[title="Quick Tour"]');
    await waitForUIRenderComplete(page);

    // Check that widgets have the proper ProseMirror widget structure
    const widgetElements = await page.locator(".ProseMirror-widget").count();
    expect(widgetElements).toBeGreaterThan(0);

    // Check that results are in semantic-result-display spans (new architecture)
    const newStyleResults = await page.locator(".semantic-result-display").count();
    expect(newStyleResults).toBeGreaterThanOrEqual(10);

    // Check that we don't have old-style semantic-result spans (should be 0)
    const oldStyleResults = await page
      .locator(".semantic-result:not(.semantic-result-display)")
      .count();
    expect(oldStyleResults).toBe(0);
  });

  test("Template click creates a new sheet instead of replacing current content", async ({
    page,
  }) => {
    const marker = `Origin Sheet ${Date.now()}`;
    await clearEditor(page);
    const editor = page.locator(".ProseMirror");
    await editor.click();
    await page.keyboard.type(`${marker}\nx = 2\nx =>`);
    await waitForUIRenderComplete(page);

    const beforeCount = await page.locator(".sheet-item").count();

    await page.click('button[title="Quick Tour"]');
    await waitForUIRenderComplete(page);

    await expect(page.locator(".sheet-item")).toHaveCount(beforeCount + 1);
    await expect(page.locator(".sheet-item.active .sheet-title-text")).toContainText(
      "Quick Tour"
    );
    await expect(page.locator(".ProseMirror")).not.toContainText(marker);
  });
});
