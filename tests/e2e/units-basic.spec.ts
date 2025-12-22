/**
 * Units Integration Tests
 *
 * Tests units functionality in the browser including:
 * - Basic unit expressions and arithmetic
 * - Unit conversions and dimensional analysis
 * - Variable assignments with units
 * - Error handling for incompatible units
 * - Complex physics calculations
 */

import { test, expect } from "@playwright/test";
import { waitForUIRenderComplete, waitForEditorReady } from "./utils";

test.describe("Units Integration", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForEditorReady(page);
  });

  test("should handle basic unit expressions", async ({ page }) => {
    // Wait for editor to be ready
    const editor = page.locator(".ProseMirror");
    await editor.click();

    // Type a simple unit expression
    await editor.fill("10 m =>");
    await page.keyboard.press("Enter");

    // Check that the result appears with units
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display")).toHaveAttribute("data-result", /10 m/);
  });

  test("should handle unit arithmetic", async ({ page }) => {
    const editor = page.getByRole("textbox");
    await expect(editor).toBeVisible();

    // Type unit addition
    await editor.fill("10 m + 5 m =>");
    await page.keyboard.press("Enter");

    // Check the result
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display")).toHaveAttribute("data-result", /15 m/);
  });

  test("should handle dimensional analysis", async ({ page }) => {
    const editor = page.getByRole("textbox");
    await expect(editor).toBeVisible();

    // Type area calculation
    await editor.fill("10 m * 5 m =>");
    await page.keyboard.press("Enter");

    // Check that result shows area units
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display")).toHaveAttribute(
      "data-result",
      /50 m\^2/
    );
  });

  test("should handle unit conversion", async ({ page }) => {
    const editor = page.getByRole("textbox");
    await expect(editor).toBeVisible();

    // Type mixed units
    await editor.fill("1 km + 500 m =>");
    await page.keyboard.press("Enter");

    // Check the conversion result
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display")).toHaveAttribute(
      "data-result",
      /1\.5 km/
    );
  });

  test("should show error for incompatible units", async ({ page }) => {
    const editor = page.getByRole("textbox");
    await expect(editor).toBeVisible();

    // Type incompatible units
    await editor.fill("10 m + 5 kg =>");
    await page.keyboard.press("Enter");

    // Check that an error is shown
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-error-result").last()).toHaveAttribute(
      "data-result",
      /incompatible|dimension/i
    );
  });

  test("should handle variable assignments with units", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.click();

    // Assign a variable with units
    await editor.fill("distance = 100 m");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    // Use the variable in an expression
    await editor.fill("distance * 2 =>");
    await page.keyboard.press("Enter");

    // Check the result
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /200\s*m/
    );
  });

  test("should handle complex physics calculations", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.click();

    // Set up variables for physics calculation
    await editor.fill("mass = 5 kg");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    await editor.fill("acceleration = 9.8 m/s^2");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    // Calculate force
    await editor.fill("force = mass * acceleration =>");
    await page.keyboard.press("Enter");

    // Check the result
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /49\s*N/
    );
  });

  test("should handle temperature conversions", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.click();

    // Test temperature with units
    await editor.fill("temp = 25°C");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    await editor.fill("temp + 10°C =>");
    await page.keyboard.press("Enter");

    // Check the result
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /35\s*°C/
    );
  });
});
