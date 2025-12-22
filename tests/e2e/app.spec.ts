/**
 * Visual App Tests
 *
 * Tests visual layout and appearance including:
 * - App layout stability
 * - Variable panel visual updates
 * - Visual regression prevention
 * - Layout consistency
 */

import { test, expect } from "@playwright/test";

test("App should have a stable layout on load", async ({ page }) => {
  // Navigate to the app
  await page.goto("/");

  // Wait for the main grid layout to be present
  const mainGrid = page.locator(".main-grid-layout");
  await expect(mainGrid).toBeVisible();

  // Assert that the full page matches the saved screenshot
  await expect(page).toHaveScreenshot("landing-page.png");
});

test("Variable panel should update when a variable is defined", async ({ page }) => {
  // Navigate to the app
  await page.goto("/");

  // Type a variable assignment into the editor
  const editor = page.locator(".ProseMirror");
  await editor.type("price = 125");

  // Wait for the variable panel to update and show the new variable
  const variableItem = page.locator(".variable-item", { hasText: "price" });
  await expect(variableItem).toBeVisible();
  await expect(variableItem.locator(".variable-value")).toHaveText("125");

  // Assert that the page, now with the variable, matches the saved screenshot
  await expect(page).toHaveScreenshot("variable-display.png");
});
