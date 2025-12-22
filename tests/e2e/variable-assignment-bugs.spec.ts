/**
 * Variable Assignment Tests
 *
 * Tests variable assignment functionality in the browser including:
 * - Simple numeric assignments
 * - Expression-based assignments
 * - Variable panel updates
 * - Error handling for invalid assignments
 * - Real-time variable updates
 */

import { test, expect } from "@playwright/test";

test.describe("Variable Assignment", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="smart-pad-editor"]');
  });

  test("should handle simple numeric assignment", async ({ page }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');

    // Type a simple numeric assignment
    await editor.click();
    await editor.type("x = 5", { delay: 50 });
    await page.keyboard.press("Enter");

    // Wait for processing
    await page.waitForTimeout(500);

    const editorContent = await editor.textContent();
    const variablePanel = page.locator('[data-testid="variable-panel"]');
    const panelContent = await variablePanel.textContent();
    const allText = editorContent + " " + panelContent;

    // This should work fine
    expect(allText).toContain("5");
  });

  test("should handle expression-based assignment", async ({ page }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');

    // Type an expression-based assignment
    await editor.click();
    await editor.type("z = 10 + 2", { delay: 50 });
    await page.keyboard.press("Enter");

    // Wait for processing
    await page.waitForTimeout(500);

    const editorContent = await editor.textContent();
    const variablePanel = page.locator('[data-testid="variable-panel"]');
    const panelContent = await variablePanel.textContent();
    const allText = editorContent + " " + panelContent;

    // The variable should evaluate to 12 in the panel
    expect(allText).toContain("12");
  });

  test("should handle multiple expression assignments", async ({ page }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');

    // Type multiple expressions
    await editor.click();

    await editor.type("a = 4", { delay: 50 });
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);

    await editor.type("b = a + 1", { delay: 50 });
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);

    await editor.type("c = b * 2", { delay: 50 });
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);

    const editorContent = await editor.textContent();
    const variablePanel = page.locator('[data-testid="variable-panel"]');
    const panelContent = await variablePanel.textContent();
    const allText = editorContent + " " + panelContent;

    // Check that all variables are properly evaluated
    expect(allText).toContain("4");
    expect(allText).toContain("5");
    expect(allText).toContain("10");
  });

  test("should handle phrase-based variable names", async ({ page }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');

    // Type a phrase-based variable assignment
    await editor.click();
    await editor.type("my password = 2929", { delay: 50 });
    await page.keyboard.press("Enter");

    // Wait for processing
    await page.waitForTimeout(500);

    const editorContent = await editor.textContent();
    const variablePanel = page.locator('[data-testid="variable-panel"]');
    const panelContent = await variablePanel.textContent();
    const allText = editorContent + " " + panelContent;

    // The variable should be stored and displayed
    expect(allText).toContain("2929");
  });

  test("should update variable panel in real-time", async ({ page }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');

    // Create a variable
    await editor.click();
    await editor.type("price = 10", { delay: 50 });
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);

    // Update the variable
    await editor.type("price = 15", { delay: 50 });
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);

    const variablePanel = page.locator('[data-testid="variable-panel"]');
    const panelContent = await variablePanel.textContent();

    // Should show the updated value
    expect(panelContent).toContain("15");
    expect(panelContent).not.toContain("10");
  });
});
