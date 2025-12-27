/**
 * Semantic Highlighting Tests
 *
 * Tests semantic syntax highlighting including:
 * - Variable name highlighting
 * - Expression operator highlighting
 * - Error state highlighting
 * - Real-time highlighting updates
 */

import { test, expect } from "@playwright/test";
import { waitForUIRenderComplete } from "./utils";

test.describe("Semantic Highlighting", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000");
    await page.waitForSelector('[data-testid="smart-pad-editor"]');
    const editor = page.locator(".ProseMirror");
    await editor.click();
    // Clear any existing content
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
  });

  test("highlights variable names", async ({ page }) => {
    await page.keyboard.type("price = 10.5");
    await waitForUIRenderComplete(page);

    const priceElement = await page.locator(".semantic-variable").first();
    await expect(priceElement).toHaveText("price");
    await expect(priceElement).toBeVisible();
  });

  test("highlights operators", async ({ page }) => {
    await page.keyboard.type("5 + 3 =>");
    await waitForUIRenderComplete(page);

    const operators = await page.locator(".semantic-operator").all();
    expect(operators.length).toBeGreaterThanOrEqual(1); // + operator
  });

  test("highlights trigger symbol", async ({ page }) => {
    await page.keyboard.type("5 + 3 =>");
    await waitForUIRenderComplete(page);

    const triggers = await page.locator(".semantic-trigger").all();
    expect(triggers.length).toBeGreaterThanOrEqual(1); // => trigger
  });

  test("highlights numbers", async ({ page }) => {
    await page.keyboard.type("price = 10.5");
    await waitForUIRenderComplete(page);

    const numberElement = await page.locator(".semantic-scrubbableNumber").first();
    await expect(numberElement).toHaveText("10.5");
  });

  test("highlights mathematical functions", async ({ page }) => {
    await page.keyboard.type("sqrt(16) =>");
    await waitForUIRenderComplete(page);

    const functionElement = await page.locator(".semantic-function").first();
    await expect(functionElement).toHaveText("sqrt");
  });

  test("highlights percentage keywords", async ({ page }) => {
    await page.keyboard.type("20% off $80 =>");
    await waitForUIRenderComplete(page);

    const keywordElement = await page.locator(".semantic-keyword", { hasText: "off" }).first();
    await expect(keywordElement).toBeVisible();
  });

  test("highlights results after evaluation", async ({ page }) => {
    await page.keyboard.type("5 + 3 =>");
    await waitForUIRenderComplete(page);

    const resultElement = await page.locator(".semantic-result-display, .semantic-result").first();
    await expect(resultElement).toHaveAttribute("data-result", /8/);
  });

  test("highlights error messages", async ({ page }) => {
    await page.keyboard.type("invalid_var =>");
    await waitForUIRenderComplete(page);

    const errorElement = await page.locator(".semantic-error-result").first();
    const errorText = await errorElement.getAttribute("data-result");
    expect(errorText || "").toContain("⚠️"); // Error widget carries message in data-result
  });

  test("handles phrase-based variables", async ({ page }) => {
    await page.keyboard.type("tax rate = 0.08");
    await waitForUIRenderComplete(page);

    const variableElement = await page.locator(".semantic-variable").first();
    await expect(variableElement).toHaveText("tax rate");
  });

  test("maintains highlighting after expression evaluation", async ({ page }) => {
    // Type a variable assignment
    await page.keyboard.type("price = 10");
    await page.keyboard.press("Enter");

    // Type an expression using the variable
    await page.keyboard.type("price * 2 =>");
    await waitForUIRenderComplete(page);

    // Check that variable is still highlighted in the expression
    const variableElements = await page.locator(".semantic-variable").all();
    expect(variableElements.length).toBeGreaterThanOrEqual(2); // price in both lines

    // Check that result is highlighted
    const resultElement = await page.locator(".semantic-result-display, .semantic-result").first();
    await expect(resultElement).toHaveAttribute("data-result", /20/);
  });

  test("applies CSS styles correctly", async ({ page }) => {
    await page.keyboard.type("price = 10.5");
    await page.waitForTimeout(100);

    const variableElement = await page.locator(".semantic-variable").first();

    // Check that the element has the expected CSS applied
    const color = await variableElement.evaluate((el) => window.getComputedStyle(el).color);
    const fontWeight = await variableElement.evaluate(
      (el) => window.getComputedStyle(el).fontWeight
    );

    // We're not checking exact colors as requested, just that styles are applied
    expect(color).toBeTruthy();
    expect(fontWeight).toBeTruthy();
  });
});
