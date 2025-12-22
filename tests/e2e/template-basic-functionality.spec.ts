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

test.describe("Template Basic Functionality", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="smart-pad-editor"]');
  });

  test("Templates insert and evaluate correctly", async ({ page }) => {
    // Test rent calculator template
    await page.click('button[title="Rent Calculator"]');
    await waitForUIRenderComplete(page);

    // Should have 2 result widgets (expressions with =>)
    let resultWidgets = await page.locator(".semantic-result-display").count();
    expect(resultWidgets).toBe(2);

    // Check that calculations are correct
    const firstResult = await page
      .locator(".semantic-result-display")
      .first()
      .getAttribute("data-result");
    const secondResult = await page
      .locator(".semantic-result-display")
      .last()
      .getAttribute("data-result");

    expect(firstResult).toBe("1510"); // 1250 + 185 + 75
    expect(secondResult).toBe("18120"); // 1510 * 12

    // Clear and test pizza template
    await page.click('[data-testid="smart-pad-editor"]');
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");

    await page.click('button[title="Pizza Party"]');
    await waitForUIRenderComplete(page);

    // Should have 3 result widgets
    resultWidgets = await page.locator(".semantic-result-display").count();
    expect(resultWidgets).toBe(3);

    // Check first calculation is approximately correct (18.99 / 6)
    const pizzaResult = await page
      .locator(".semantic-result-display")
      .first()
      .getAttribute("data-result");
    expect(pizzaResult).toMatch(/3\.16\d*/);
  });

  test("All templates create the expected number of result widgets", async ({ page }) => {
    const templates = [
      { name: "Rent Calculator", expectedWidgets: 2 },
      { name: "Pizza Party", expectedWidgets: 3 },
      { name: "Road Trip", expectedWidgets: 3 },
      { name: "Phone Bill", expectedWidgets: 2 },
      { name: "Fitness Goal", expectedWidgets: 3 },
    ];

    for (const template of templates) {
      // Clear editor
      await page.click('[data-testid="smart-pad-editor"]');
      await page.keyboard.press("Control+a");
      await page.keyboard.press("Delete");

      // Click template
      await page.click(`button[title="${template.name}"]`);
      await waitForUIRenderComplete(page);

      // Check result widgets were created
      const resultWidgets = await page.locator(".semantic-result-display").count();
      expect(resultWidgets).toBe(template.expectedWidgets);
    }
  });

  test("Templates create proper widget decorations (not just text)", async ({ page }) => {
    await page.click('button[title="Rent Calculator"]');
    await waitForUIRenderComplete(page);

    // Check that widgets have the proper ProseMirror widget structure
    const widgetElements = await page.locator(".ProseMirror-widget").count();
    expect(widgetElements).toBeGreaterThan(0);

    // Check that results are in semantic-result-display spans (new architecture)
    const newStyleResults = await page.locator(".semantic-result-display").count();
    expect(newStyleResults).toBe(2);

    // Check that we don't have old-style semantic-result spans (should be 0)
    const oldStyleResults = await page
      .locator(".semantic-result:not(.semantic-result-display)")
      .count();
    expect(oldStyleResults).toBe(0);
  });
});
