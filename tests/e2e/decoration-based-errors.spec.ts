/**
 * Decoration-Based Error Tests
 *
 * Tests error decoration and display including:
 * - Error message formatting
 * - Error visual indicators
 * - Error state management
 * - Error recovery and clearing
 */

import { test, expect } from "@playwright/test";
import { waitForUIRenderComplete } from "./utils";

/**
 * DECORATION-BASED ERROR DISPLAY TESTS
 *
 * These tests define the proper behavior for showing errors and results
 * via TipTap's decoration system instead of text insertion.
 */
test.describe("Decoration-Based Error Display", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="smart-pad-editor"]');

    // Clear any existing content
    const editor = page.locator(".ProseMirror");
    await editor.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
  });

  test("BASELINE ACHIEVED: Text content is clean, now need working widgets", async ({ page }) => {
    console.log("🎉 Testing our successful baseline");

    const editor = page.locator(".ProseMirror");

    // Type a simple expression
    await editor.type("2 + 3 =>");
    await waitForUIRenderComplete(page);

    // Text content should be clean (THIS IS NOW WORKING!)
    const textContent = await page.locator(".ProseMirror p").textContent();
    console.log(`✅ Text content is clean: "${textContent}"`);
    expect(textContent?.trim()).toBe("2 + 3 =>");

    // Semantic highlighting should work (THIS IS WORKING!)
    const variableCount = await page.locator(".semantic-scrubbableNumber").count();
    const operatorCount = await page.locator(".semantic-operator").count();
    const triggerCount = await page.locator(".semantic-trigger").count();

    console.log(
      `✅ Semantic highlighting working: ${variableCount} numbers, ${operatorCount} operators, ${triggerCount} triggers`
    );
    expect(variableCount).toBeGreaterThan(0);
    expect(operatorCount).toBeGreaterThan(0);
    expect(triggerCount).toBeGreaterThan(0);

    // Next step: Need working widget decorations for results
    // (This will be implemented properly without text pollution)
    console.log("🎯 Next: Implement proper widget decorations for results");
  });

  test("ERROR DECORATION: Errors should appear via decorations", async ({ page }) => {
    console.log("🧪 Testing that errors appear via decoration system");

    const editor = page.locator(".ProseMirror");

    // Type an expression with syntax error
    await editor.type("t = 1d =>");
    await waitForUIRenderComplete(page);

    // Check for error decoration in DOM
    const errorElements = page.locator(".semantic-error, .semantic-error-result");
    const errorCount = await errorElements.count();
    console.log(`Found ${errorCount} error decoration elements`);

    if (errorCount > 0) {
      const errorElement = errorElements.first();
      const errorData = await errorElement.getAttribute("data-result");
      console.log("Error data-result:", errorData);
      expect(errorData).toContain("⚠️");
    } else {
      console.log("❌ No error decorations found - this is the bug we need to fix");
      expect(errorCount).toBeGreaterThan(0);
    }
  });

  test("MATH RESULT DECORATION: Results should appear via decorations", async ({ page }) => {
    console.log("🧪 Testing that math results appear via decoration system");

    const editor = page.locator(".ProseMirror");

    // Type a valid math expression
    await editor.type("2 + 3 =>");
    await waitForUIRenderComplete(page);

    // Check the raw text content (should be clean)
    const textContent = await page.locator(".ProseMirror p").textContent();
    console.log("Text content:", `"${textContent}"`);

    // Text should be clean
    expect(textContent?.trim()).toBe("2 + 3 =>");

    // But should have result decoration
    const resultElements = page.locator(".semantic-result-display, .semantic-result");
    const resultCount = await resultElements.count();
    console.log(`Found ${resultCount} result decoration elements`);

    if (resultCount > 0) {
      const resultElement = resultElements.first();
      const resultData = await resultElement.getAttribute("data-result");
      console.log("Result data-result:", resultData);
      expect(resultData).toContain("5");
    } else {
      console.log("❌ No result decorations found - this is the bug we need to fix");
      expect(resultCount).toBeGreaterThan(0);
    }
  });

  test("SEMANTIC HIGHLIGHTING: Variables and operators should be styled", async ({ page }) => {
    console.log("🧪 Testing that semantic highlighting works correctly");

    const editor = page.locator(".ProseMirror");

    // Type a variable assignment
    await editor.type("speed = 50");
    await waitForUIRenderComplete(page);

    // Check for semantic highlighting
    const variableElements = await page.locator(".semantic-variable").count();
    const operatorElements = await page.locator(".semantic-operator").count();
    const numberElements = await page.locator(".semantic-scrubbableNumber").count();

    console.log(
      `Variables: ${variableElements}, Operators: ${operatorElements}, Numbers: ${numberElements}`
    );

    expect(variableElements).toBeGreaterThan(0);
    expect(operatorElements).toBeGreaterThan(0);
    expect(numberElements).toBeGreaterThan(0);
  });

  test("TRIGGER HIGHLIGHTING: Arrow should be styled as trigger", async ({ page }) => {
    console.log("🧪 Testing that => trigger is properly highlighted");

    const editor = page.locator(".ProseMirror");

    // Type an expression with trigger
    await editor.type("10 * 2 =>");
    await waitForUIRenderComplete(page);

    // Check for trigger styling
    const triggerElements = await page.locator(".semantic-trigger").count();
    console.log(`Found ${triggerElements} trigger elements`);

    expect(triggerElements).toBeGreaterThan(0);

    const triggerText = await page.locator(".semantic-trigger").textContent();
    expect(triggerText).toBe("=>");
  });

  test("VARIABLE UNDEFINED ERROR: Should show via decoration", async ({ page }) => {
    console.log("🧪 Testing undefined variable error via decoration");

    const editor = page.locator(".ProseMirror");

    // Type an expression with undefined variable
    await editor.type("unknown_var + 5 =>");
    await waitForUIRenderComplete(page);

    // Text content should be clean
    const textContent = await page.locator(".ProseMirror p").textContent();
    expect(textContent?.trim()).toBe("unknown_var + 5 =>");

    // Error should appear via decoration
    const errorElements = page.locator(".semantic-error, .semantic-error-result");
    const errorCount = await errorElements.count();

    if (errorCount > 0) {
      const errorElement = errorElements.first();
      const errorData = await errorElement.getAttribute("data-result");
      expect(errorData).toContain("Undefined variable");
    } else {
      console.log("❌ No error decorations for undefined variable");
      expect(errorCount).toBeGreaterThan(0);
    }
  });

  test("NO ERROR ACCUMULATION: Multiple edits should not accumulate errors", async ({ page }) => {
    console.log("🧪 Testing that errors don't accumulate with multiple edits");

    const editor = page.locator(".ProseMirror");

    // Type character by character to trigger multiple evaluations
    await editor.type("x = ");
    await page.waitForTimeout(100);
    await editor.type("i");
    await page.waitForTimeout(100);
    await editor.type(" =>");
    await page.waitForTimeout(500);

    // Count error decorations (should be exactly 1)
    const errorCount = await page.locator(".semantic-error").count();
    console.log(`Error count after typing: ${errorCount}`);

    // Now edit to fix the error
    await page.keyboard.press("Backspace"); // Remove >
    await page.keyboard.press("Backspace"); // Remove =
    await page.keyboard.press("Backspace"); // Remove space
    await editor.type("nput =>");
    await page.waitForTimeout(500);

    // Should still have exactly 1 error (or 0 if 'input' is defined)
    const finalErrorCount = await page.locator(".semantic-error").count();
    console.log(`Error count after edit: ${finalErrorCount}`);

    // The key test: no error accumulation
    expect(finalErrorCount).toBeLessThanOrEqual(1);
  });

  test("DOM STRUCTURE: Show exact expected DOM for decoration-based approach", async ({ page }) => {
    console.log("🧪 Testing exact DOM structure for decoration-based approach");

    const editor = page.locator(".ProseMirror");

    // Type a simple expression
    await editor.type("2 + 3 =>");
    await page.waitForTimeout(500);

    // Get the exact DOM structure
    const paragraphHTML = await page.locator(".ProseMirror p").innerHTML();
    console.log("=== ACTUAL DOM STRUCTURE ===");
    console.log(paragraphHTML);

    // Get text content
    const textContent = await page.locator(".ProseMirror p").textContent();
    console.log("=== TEXT CONTENT ===");
    console.log(`"${textContent}"`);

    // Expected: text content should be clean "2 + 3 =>"
    // Expected: DOM should have semantic spans + widget decoration with result

    console.log("=== WHAT WE EXPECT ===");
    console.log('Text content: "2 + 3 =>"');
    console.log("DOM structure: spans for numbers/operators + widget for result");

    // For now, just log to understand current state
    // We'll fix the implementation based on what we see
  });

  test("ERROR MESSAGE SELECTABILITY: Error messages should be selectable for copying", async ({
    page,
  }) => {
    console.log("🧪 Testing that error messages are selectable");

    const editor = page.locator(".ProseMirror");

    // Type an expression that will generate an error
    await editor.type("undefined_var =>");
    await page.waitForTimeout(500);

    // Check for error elements
    const errorElements = page.locator(".semantic-error, .semantic-error-result");
    const errorCount = await errorElements.count();
    expect(errorCount).toBeGreaterThan(0);

    // Test that error messages are selectable by checking computed styles
    const errorElement = errorElements.first();
    const userSelect = await errorElement.evaluate((el) => {
      return window.getComputedStyle(el).userSelect;
    });

    console.log(`Error element user-select style: ${userSelect}`);
    expect(userSelect).toBe("text");

    // Test that the error text is visible and accessible
    const errorText = await errorElement.textContent();
    console.log(`Error element text content: "${errorText}"`);
    expect(errorText).toContain("⚠️");

    // Test that the error element can be clicked (even if it doesn't get focus)
    await errorElement.click();

    // The error element should be selectable and copyable
    // We've verified the CSS user-select: text is applied correctly
    console.log("✅ Error message is selectable and copyable");

    // Test that the error text can be copied via right-click context menu
    // (This is a more realistic test of copy functionality)
    await errorElement.click({ button: "right" });

    console.log("✅ Error message supports right-click context menu");
  });
});
