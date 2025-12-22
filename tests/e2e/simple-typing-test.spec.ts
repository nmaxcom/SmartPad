/**
 * Simple Typing Tests
 *
 * Tests basic typing functionality including:
 * - Basic text input
 * - Variable assignment typing
 * - Expression typing
 * - Real-time typing behavior
 */

import { test, expect } from "@playwright/test";

test.describe("Simple Typing Test", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="smart-pad-editor"]');
  });

  test("Debug: Basic typing should work", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.click();

    // Clear content
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(100);

    // Type simple content
    await editor.type("hello", { delay: 50 });

    let content = await editor.textContent();
    console.log("After typing 'hello':", content);
    expect(content).toContain("hello");

    // Move to start and add character
    await page.keyboard.press("Home");
    await page.keyboard.type("x", { delay: 50 });

    content = await editor.textContent();
    console.log("After adding 'x' at start:", content);
    expect(content).toContain("xhello");
  });

  test("Debug: Variable assignment basic functionality", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.click();

    // Clear content
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(100);

    // Type variable assignment
    await editor.type("x=5", { delay: 50 });
    await page.waitForTimeout(200);

    let content = await editor.textContent();
    console.log("After 'x=5':", content);
    expect(content).toContain("x=5");

    // Check variable panel
    const variablePanel = page.locator('[data-testid="variable-panel"]');
    const panelContent = await variablePanel.textContent();
    console.log("Variable panel:", panelContent);

    // Add expression
    await page.keyboard.press("Enter");
    await editor.type("x*2 =>", { delay: 50 });
    await page.waitForTimeout(300);

    // Should show result via decoration
    const widget = page.locator(".semantic-result-display").first();
    await expect(widget).toHaveAttribute("data-result", /10/);
  });

  test("Debug: Editing existing variable name", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.click();

    // Clear content
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(100);

    // Type variable
    await editor.type("first=1", { delay: 50 });
    await page.waitForTimeout(200);

    let content = await editor.textContent();
    console.log("Initial state:", content);
    expect(content).toContain("first=1");

    // Try to edit it - move to beginning
    await page.keyboard.press("Home");
    await page.keyboard.type("p", { delay: 50 });
    await page.waitForTimeout(200);

    content = await editor.textContent();
    console.log("After adding 'p' at start:", content);

    // Should now show "pfirst=1"
    expect(content).toContain("pfirst=1");
  });

  test("Debug: Complex scenario step by step", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.click();

    // Clear content
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(100);

    console.log("=== Step 1: Create first variable ===");
    await editor.type("first=1", { delay: 50 });
    await page.waitForTimeout(200);

    let content = await editor.textContent();
    console.log("After first=1:", content);

    console.log("=== Step 2: Add dependent expression ===");
    await page.keyboard.press("Enter");
    await editor.type("second = first*2 =>", { delay: 50 });
    await page.waitForTimeout(500);

    content = await editor.textContent();
    console.log("After second = first*2 =>:", content);

    console.log("=== Step 3: Edit first variable name ===");
    await page.keyboard.press("Control+Home");
    await page.keyboard.type("p", { delay: 50 });
    await page.waitForTimeout(500);

    content = await editor.textContent();
    console.log("After adding 'p':", content);

    // Take screenshot
    await page.screenshot({ path: "test-results/debug-typing.png" });
  });
});
