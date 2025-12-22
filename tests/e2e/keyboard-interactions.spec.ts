/**
 * Keyboard Interactions Tests
 *
 * Tests keyboard behavior and interactions including:
 * - Basic typing and Enter key behavior
 * - Expression evaluation triggers
 * - Variable creation and display
 * - Rapid typing and focus management
 * - Multiple expression evaluations
 */

import { test, expect } from "@playwright/test";
import { waitForUIRenderComplete, waitForEditorReady, attachDebugLogging } from "./utils";

test.describe("Keyboard Interactions", () => {
  test.beforeEach(async ({ page }) => {
    attachDebugLogging(page);
    await page.goto("/");
    await waitForEditorReady(page);
  });

  test("should handle basic typing and Enter key correctly", async ({ page }) => {
    const editor = page.locator(".ProseMirror");

    // Type "hello"
    await editor.type("hello");

    // Press Enter to create new line
    await editor.press("Enter");

    // Type "world" on second line
    await editor.type("world");

    // Verify the content structure - should have two paragraphs
    const paragraphs = editor.locator("p");
    await expect(paragraphs).toHaveCount(2);
    await expect(paragraphs.nth(0)).toHaveText("hello");
    await expect(paragraphs.nth(1)).toHaveText("world");
  });

  test("should evaluate simple expressions when => is typed", async ({ page }) => {
    const editor = page.locator(".ProseMirror");

    // Type a simple arithmetic expression
    await editor.type("2 + 3 =>");

    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").first()).toHaveAttribute(
      "data-result",
      /5/
    );
  });

  test("should create and display variables in real-time", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    const variablePanel = page.locator(".variable-panel");

    // Type a variable assignment
    await editor.type("price = 125");

    // Wait for variable to be processed
    await waitForUIRenderComplete(page);

    // Variable should appear in the panel
    const variableItem = variablePanel.locator(".variable-item").filter({ hasText: "price" });
    await expect(variableItem).toBeVisible();
    // For simple numeric assignments, the value is shown in .variable-value, not .variable-computed-value
    await expect(variableItem.locator(".variable-value")).toHaveText("125");
  });

  test("should handle Enter key mid-expression correctly", async ({ page }) => {
    const editor = page.locator(".ProseMirror");

    // Type partial expression
    await editor.type("x = 10 + 2");

    // Move cursor to middle (this tests real cursor manipulation)
    await editor.press("Home"); // Go to start
    await editor.press("ArrowRight"); // Move past "x"
    await editor.press("ArrowRight"); // Move past " "
    await editor.press("ArrowRight"); // Move past "="

    // Press Enter in the middle
    await editor.press("Enter");

    // Should create new line, preserving the content structure
    const paragraphs = editor.locator("p");
    await expect(paragraphs).toHaveCount(2);

    // The content should be split appropriately
    const firstParagraph = await paragraphs.nth(0).textContent();
    const secondParagraph = await paragraphs.nth(1).textContent();

    expect((firstParagraph || "") + (secondParagraph || "")).toContain("x = 10 + 2");
  });

  test("should handle rapid typing without losing characters", async ({ page }) => {
    const editor = page.locator(".ProseMirror");

    // Type quickly to test if contentEditable keeps up
    const rapidText = "The quick brown fox jumps over the lazy dog 1234567890";
    await editor.type(rapidText, { delay: 10 }); // 10ms between characters

    // Verify all characters were captured
    const editorContent = await editor.textContent();
    expect(editorContent).toBe(rapidText);
  });

  test("should maintain focus and cursor position through evaluations", async ({ page }) => {
    const editor = page.locator(".ProseMirror");

    // Type first expression
    await editor.type("a = 5");
    await editor.press("Enter");

    // Type second expression
    await editor.type("b = a * 2 =>");

    // Wait for evaluation
    await waitForUIRenderComplete(page);

    // Add more content to verify cursor stayed in right place
    await editor.press("Enter");
    await editor.type("c = 3");

    // Should have three lines with proper content
    const paragraphs = editor.locator("p");
    await expect(paragraphs).toHaveCount(3);

    await expect(paragraphs.nth(0)).toHaveText("a = 5");
    // Expect a result widget with 10
    await expect(page.locator(".semantic-result-display").first()).toHaveAttribute(
      "data-result",
      /10/
    );
    await expect(paragraphs.nth(2)).toHaveText("c = 3");
  });

  // CRITICAL BUG TESTS - These were moved from Jest because they test real keyboard/editor behavior
  test("CRITICAL: Expression evaluation with variable should not make variable disappear", async ({
    page,
  }) => {
    const editor = page.locator(".ProseMirror");
    const variablePanel = page.locator(".variable-panel");

    // Set up the exact scenario from the bug report
    await editor.type("b=3+4");
    await editor.press("Enter");

    // Wait for variable to be created
    await waitForUIRenderComplete(page);
    await expect(variablePanel.locator(".variable-item").filter({ hasText: "b" })).toBeVisible();

    await editor.type("a=b*8");
    await editor.press("Enter");

    // Wait for variable to be created
    await waitForUIRenderComplete(page);
    await expect(variablePanel.locator(".variable-item").filter({ hasText: "a" })).toBeVisible();

    // This is the critical test - a=> should show result, not make variable disappear
    await editor.type("a=>");

    // Wait for evaluation
    await waitForUIRenderComplete(page);

    // Both variables should still exist in the panel - check by variable name specifically
    await expect(
      variablePanel.locator(".variable-item").locator(".variable-name").filter({ hasText: "b" })
    ).toBeVisible();
    await expect(
      variablePanel.locator(".variable-item").locator(".variable-name").filter({ hasText: "a" })
    ).toBeVisible();

    // The editor should show the result via decoration
    await expect(page.locator(".semantic-result-display").first()).toHaveAttribute(
      "data-result",
      /56/
    );
  });

  test("CRITICAL: Multiple expression evaluations should not interfere", async ({ page }) => {
    const editor = page.locator(".ProseMirror");

    // Set up variables
    await editor.type("x=10");
    await editor.press("Enter");
    await editor.type("y=x+5");
    await editor.press("Enter");

    // Test multiple evaluations
    await editor.type("x=>");
    await waitForUIRenderComplete(page);
    await editor.press("Enter");

    await editor.type("y=>");
    await waitForUIRenderComplete(page);
    await editor.press("Enter");

    await editor.type("x+y=>");
    await waitForUIRenderComplete(page);

    // All evaluations should produce result widgets
    const results = page.locator(".semantic-result-display");
    await expect(results.nth(0)).toHaveAttribute("data-result", /10/);
    await expect(results.nth(1)).toHaveAttribute("data-result", /15/);
    await expect(results.nth(2)).toHaveAttribute("data-result", /25/);
  });

  test("should allow normal workflow after expression evaluation", async ({ page }) => {
    const editor = page.locator(".ProseMirror");

    // Ensure editor is focused before typing
    await editor.click();

    // Type expression
    await editor.type("3 * 4 =>");

    // Wait for evaluation
    await waitForUIRenderComplete(page);

    // Verify evaluation happened via result widget
    await expect(page.locator(".semantic-result-display").first()).toHaveAttribute(
      "data-result",
      /12/
    );

    // REALISTIC WORKFLOW: User presses Enter to move to next line
    await editor.press("Enter");

    // Type next calculation
    await editor.type("area = 3 * 4 => 12");

    // Should have two separate lines/paragraphs
    const paragraphs = editor.locator("p");
    await expect(paragraphs).toHaveCount(2);
    // Still ensure two paragraphs were created, but results are widgets now
    await expect(paragraphs.nth(0)).toContainText("3 * 4 =>");
    await expect(paragraphs.nth(1)).toContainText("area = 3 * 4 => 12");
  });
});
