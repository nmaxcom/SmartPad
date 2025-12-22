// @ts-nocheck
/**
 * DOM Structure Validation Tests
 *
 * Tests DOM structure and element validation including:
 * - Editor structure validation
 * - Variable panel structure
 * - Element attribute validation
 * - DOM integrity checks
 */

import { test, expect } from "@playwright/test";
import { waitForUIRenderComplete } from "./utils";

test.describe("DOM Structure Validation - AST → DOM Pipeline", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="smart-pad-editor"]');
  });

  test("should have correct spacing structure for basic expressions", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.click();

    // Test basic arithmetic
    await editor.fill("2 + 3 =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    // Check DOM structure
    const paragraphHTML = await page.locator(".ProseMirror p").first().innerHTML();
    console.log("Basic expression HTML:", paragraphHTML);

    // Verify there is a space node between trigger and widget container
    expect(paragraphHTML).toMatch(
      /<span[^>]*semantic-trigger[^>]*>=&gt;<\/span><span[^>]*>\s+<span[^>]*semantic-result-container[^>]*>\s*<span[^>]*semantic-result-display[^>]*data-result="5"/
    );

    // Verify text content is clean (no inline result text)
    const textContent = await page.locator(".ProseMirror p").first().textContent();
    expect(textContent?.trim()).toBe("2 + 3 =>");
  });

  test("should have correct spacing structure for unit expressions", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.click();

    // Test unit expressions
    await editor.fill("10 m =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    // Check DOM structure
    const paragraphHTML = await page.locator(".ProseMirror p").first().innerHTML();
    console.log("Unit expression HTML:", paragraphHTML);

    // Verify the widget container appears after a space and carries data-result
    expect(paragraphHTML).toMatch(
      /<span[^>]*semantic-trigger[^>]*>=&gt;<\/span><span[^>]*>\s+<span[^>]*semantic-result-container[^>]*>\s*<span[^>]*semantic-result-display[^>]*data-result="10 m"/
    );

    // Verify text content is clean (no inline result text)
    const textContent = await page.locator(".ProseMirror p").first().textContent();
    expect(textContent?.trim()).toBe("10 m =>");
  });

  test("should have correct spacing structure for complex unit expressions", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.click();

    // Test complex unit arithmetic
    await editor.fill("10 m * 5 m =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    // Check DOM structure
    const paragraphHTML = await page.locator(".ProseMirror p").first().innerHTML();
    console.log("Complex unit expression HTML:", paragraphHTML);

    // Verify space then widget container with data-result
    expect(paragraphHTML).toMatch(
      /<span[^>]*semantic-trigger[^>]*>=&gt;<\/span><span[^>]*>\s+<span[^>]*semantic-result-container[^>]*>\s*<span[^>]*semantic-result-display[^>]*data-result="50 m\^2"/
    );

    // Verify text content is clean (no inline result text)
    const textContent = await page.locator(".ProseMirror p").first().textContent();
    expect(textContent?.trim()).toBe("10 m * 5 m =>");
  });

  test("should have correct spacing structure for error cases", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.click();

    // Test incompatible units (should produce error)
    await editor.fill("10 m + 5 kg =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    // Check DOM structure
    const paragraphHTML = await page.locator(".ProseMirror p").first().innerHTML();
    console.log("Error case HTML:", paragraphHTML);

    // Verify space then widget container with error span carrying data-result
    expect(paragraphHTML).toMatch(
      /<span[^>]*semantic-trigger[^>]*>=&gt;<\/span><span[^>]*>\s+<span[^>]*semantic-result-container[^>]*>\s*<span[^>]*semantic-error-result[^>]*data-result=/
    );

    // Verify error widget carries message in data-result
    await expect(page.locator(".semantic-error-result").first()).toHaveAttribute(
      "data-result",
      /incompatible|dimension/i
    );
  });

  test("should maintain semantic highlighting classes with proper spacing", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.click();

    // Test a simple expression with multiple semantic elements
    await editor.fill("2 * 3 + 4 =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    // Check that semantic classes are preserved
    const numberElements = page.locator(".semantic-scrubbableNumber");
    const operatorElements = page.locator(".semantic-operator");
    const triggerElements = page.locator(".semantic-trigger");
    const resultElements = page.locator(".semantic-result-display");

    await expect(numberElements.first()).toBeVisible(); // Should have numbers
    await expect(operatorElements.first()).toBeVisible();
    await expect(triggerElements).toHaveCount(1);
    await expect(resultElements).toHaveCount(1);

    // Verify the result has proper spacing
    const paragraphHTML = await page.locator(".ProseMirror p").first().innerHTML();
    console.log("Complex expression HTML:", paragraphHTML);

    // Should have space before widget and data-result="10"
    expect(paragraphHTML).toMatch(
      /<span[^>]*semantic-trigger[^>]*>=&gt;<\/span><span[^>]*>\s+<span[^>]*semantic-result-container[^>]*>\s*<span[^>]*semantic-result-display[^>]*data-result="10"/
    );
  });

  test("should handle multiple expressions with consistent spacing", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.click();

    // Type multiple expressions
    const expressions = ["2 + 3 =>", "10 m =>", "5 * 4 =>", "1 km + 500 m =>"];

    for (const expr of expressions) {
      await editor.fill(expr);
      await page.keyboard.press("Enter");
      await waitForUIRenderComplete(page);
    }

    // Check all paragraphs have correct structure
    const paragraphs = page.locator(".ProseMirror p");
    const paragraphCount = await paragraphs.count();

    console.log(`Testing ${paragraphCount} expressions for consistent spacing`);

    for (let i = 0; i < paragraphCount - 1; i++) {
      // -1 to skip empty last paragraph
      const paragraphHTML = await paragraphs.nth(i).innerHTML();
      const textContent = await paragraphs.nth(i).textContent();

      console.log(`Expression ${i + 1}: "${textContent}"`);
      console.log(`HTML ${i + 1}:`, paragraphHTML);

      // Each should have the trigger followed by space outside result span
      if (textContent?.includes("=>")) {
        // Accept either direct space inside the wrapper start or nested result-container; focus on space after trigger
        expect(paragraphHTML).toMatch(
          /<span[^>]*semantic-trigger[^>]*>=&gt;<\/span><span[^>]*semantic-wrapper[^>]*>\s+<span[^>]*semantic-result-container[^>]*>\s*<span[^>]*semantic-(?:result-display|error-result)[^>]*>/
        );
      }
    }
  });

  test("should preserve spacing structure after editor updates", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.click();

    // Type initial expression
    await editor.fill("5 + 5 =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    // Verify initial structure (data-result on widget)
    let paragraphHTML = await page.locator(".ProseMirror p").first().innerHTML();
    expect(paragraphHTML).toMatch(
      /<span[^>]*semantic-trigger[^>]*>=&gt;<\/span><span[^>]*>\s+<span[^>]*semantic-result-container[^>]*>\s*<span[^>]*semantic-result-display[^>]*data-result="10"/
    );

    // Modify the expression
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowRight"); // Move to after "5"
    await page.keyboard.press("Backspace");
    await page.keyboard.type("7"); // Change to "7 + 5 =>"
    await waitForUIRenderComplete(page);

    // Verify structure is maintained after edit
    paragraphHTML = await page.locator(".ProseMirror p").first().innerHTML();
    expect(paragraphHTML).toMatch(
      /<span[^>]*semantic-trigger[^>]*>=&gt;<\/span><span[^>]*semantic-wrapper[^>]*>\s+<span[^>]*semantic-result-container[^>]*>\s*<span[^>]*semantic-result-display[^>]*data-result="12"/
    );

    // Verify widget holds the updated result and paragraph text remains unchanged
    await expect(page.locator(".semantic-result-display").first()).toHaveAttribute(
      "data-result",
      /12/
    );
    const textContent = await page.locator(".ProseMirror p").first().textContent();
    expect(textContent?.trim()).toBe("7 + 5 =>");
  });

  test("should not have leading spaces in result text content", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.click();

    // Test various expression types
    const testCases = [
      { input: "10 =>", expectedResult: "10" },
      { input: "5 m =>", expectedResult: "5 m" },
      { input: "2 + 3 =>", expectedResult: "5" },
      { input: "10 m * 2 =>", expectedResult: "20 m" },
    ];

    for (const testCase of testCases) {
      // Clear editor first
      await editor.fill("");

      await editor.fill(testCase.input);
      await page.keyboard.press("Enter");
      await waitForUIRenderComplete(page);

      // Get the result element's text content
      const resultElement = page.locator(".semantic-result-display, .semantic-error-result").last();
      const resultText = await resultElement.textContent();

      console.log(`Input: "${testCase.input}" -> Result text: "${resultText}"`);

      // Result text is rendered via ::after; attribute holds the value
      const attrValue = await resultElement.getAttribute("data-result");
      expect(attrValue).toBe(testCase.expectedResult);

      // Paragraph text should remain the user's input without inline result text
      const fullText = await page.locator(".ProseMirror p").first().textContent();
      expect(fullText?.trim()).toBe(testCase.input);
    }
  });
});
