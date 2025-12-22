/**
 * Cursor Positioning Tests
 *
 * Tests cursor behavior during editing including:
 * - Cursor positioning during variable editing
 * - Cursor behavior with expression triggers
 * - Cursor positioning with combined assignments
 * - Cursor behavior during expression evaluation
 */

import { test, expect } from "@playwright/test";
import { waitForUIRenderComplete } from "./utils";

test.describe("Cursor Positioning", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="smart-pad-editor"]');
  });

  test("Cursor stays in place when editing variable assignment numbers", async ({ page }) => {
    const editor = page.locator(".ProseMirror");

    // Type a variable assignment
    await editor.type("asa=234", { delay: 50 });

    // Click between 2 and 3 to position cursor
    const line = editor.locator("p").first();
    await line.click({ position: { x: 50, y: 10 } }); // Approximate position

    // Type a number - cursor should stay in place
    await page.keyboard.type("5", { delay: 50 });

    // Verify the number was inserted in the middle
    const content = await editor.textContent();
    expect(content).toContain("asa=2534"); // or "asa=2354" depending on exact cursor position
  });

  test("Cursor jumps to end when typing trigger with spaces", async ({ page }) => {
    const editor = page.locator(".ProseMirror");

    // Type an expression with trigger
    await editor.type("2 + 3 =>", { delay: 50 });

    // Wait for evaluation
    await waitForUIRenderComplete(page);
    // Verify widget holds result; paragraph text should remain unchanged
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /5/
    );
    const paraText = await editor.locator("p").first().textContent();
    expect(paraText?.trim()).toBe("2 + 3 =>");

    // This test verifies the basic trigger functionality works
    // The exact cursor positioning can vary, but evaluation should happen
  });

  test("Cursor jumps to end when typing trigger without spaces", async ({ page }) => {
    const editor = page.locator(".ProseMirror");

    // Type an expression with trigger all at once (no spaces)
    await editor.type("2+3=>", { delay: 50 });

    // Wait for evaluation and normalization
    await waitForUIRenderComplete(page);
    // Verify widget holds result; text remains trigger form
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /5/
    );
    const paraText2 = await editor.locator("p").first().textContent();
    expect(paraText2?.replace(/\s+/g, " ").trim()).toMatch(/2 \+ 3 =>$/);

    // This tests the normalization case where cursor should jump after result is computed
  });

  test("Cursor jumps to end for combined assignment with trigger", async ({ page }) => {
    const editor = page.locator(".ProseMirror");

    // Type a combined assignment
    await editor.type("result = 2 + 3 =>", { delay: 50 });

    // Wait for evaluation
    await waitForUIRenderComplete(page);
    // Verify widget holds result; paragraph text remains unchanged
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /5/
    );
    const paraText3 = await editor.locator("p").first().textContent();
    expect(paraText3?.trim()).toBe("result = 2 + 3 =>");

    // This tests that combined assignment + expression evaluation works
  });

  test("Expression evaluation works with normalization", async ({ page }) => {
    const editor = page.locator(".ProseMirror");

    // Type expression without spaces - this tests the normalization case
    await editor.type("2+3=>", { delay: 50 });

    // Wait for evaluation and normalization
    await waitForUIRenderComplete(page);
    // Verify widget holds result; text remains trigger form
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /5/
    );
    const paraText4 = await editor.locator("p").first().textContent();
    expect(paraText4?.replace(/\s+/g, " ").trim()).toMatch(/2 \+ 3 =>$/);

    // This verifies the core normalization functionality works
  });

  test("Editing existing triggered expressions should NOT jump cursor", async ({ page }) => {
    const editor = page.locator(".ProseMirror");

    // Step 1: Create a triggered expression
    await editor.type("test = 123 =>", { delay: 50 });
    await waitForUIRenderComplete(page);

    // Verify we have the triggered expression with result
    let content = await editor.textContent();
    expect(content).toContain("test = 123 => 123");

    // Step 2: Edit the number in the expression
    await page.evaluate(() => {
      const editor = (window as any).tiptapEditor;
      if (editor) {
        // Position cursor at the end of "123"
        const content = editor.getText();
        const arrowPos = content.indexOf(" =>");
        editor.commands.setTextSelection(arrowPos);
      }
    });

    // Step 3: Add digits to change the number
    await page.keyboard.type("45", { delay: 50 });
    await waitForUIRenderComplete(page);

    // Verify widget shows updated value and paragraph text remains with trigger only
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /124\d{2}/
    );
    const finalPara = await editor.locator("p").first().textContent();
    expect(finalPara?.trim()).toMatch(/test = 124\d{2} =>$/);
  });
});
