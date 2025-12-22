// @ts-nocheck
/**
 * Migration Verification Tests
 *
 * Tests migration verification and baseline functionality including:
 * - Variable assignment verification
 * - Expression evaluation verification
 * - Real-time propagation verification
 * - Error handling verification
 * - Semantic highlighting verification
 * - Performance monitoring
 */

import { test, expect } from "@playwright/test";
import { waitForUIRenderComplete } from "./utils";

test.describe("Migration Verification", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");

    // ENABLE AST PIPELINE FOR TESTING
    await page.evaluate(() => {
      localStorage.setItem("smartpad-use-ast-pipeline", "true");
    });
    await page.reload(); // Reload to pick up the feature flag

    await page.waitForSelector('[data-testid="smart-pad-editor"]');

    // Clear any existing content
    const editor = page.locator(".ProseMirror");
    await editor.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    await waitForUIRenderComplete(page);
  });

  test("BASELINE: Variable Assignments - All Types", async ({ page }) => {
    const editor = page.locator(".ProseMirror");

    // Simple numeric assignment
    await editor.type("price = 10.5", { delay: 50 });
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    // Phrase-based variable
    await editor.type("my password = 2929", { delay: 50 });
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    // Expression-based assignment
    await editor.type("total = price * 2", { delay: 50 });
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    // Verify all variables exist in panel
    const panelContent = await page.locator('[data-testid="variable-panel"]').textContent();
    expect(panelContent).toContain("price");
    expect(panelContent).toContain("10.5");
    expect(panelContent).toContain("my password");
    expect(panelContent).toContain("2929");
    expect(panelContent).toContain("total");
    expect(panelContent).toContain("21"); // price * 2
  });

  test("BASELINE: Expression Evaluation - All Patterns", async ({ page }) => {
    const editor = page.locator(".ProseMirror");

    // Setup variables
    await editor.type("x = 10", { delay: 50 });
    await page.keyboard.press("Enter");
    await editor.type("y = 5", { delay: 50 });
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    // Basic arithmetic
    await editor.type("2 + 3 =>", { delay: 50 });
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    // Variable expressions
    await editor.type("x * y =>", { delay: 50 });
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    // Mathematical functions
    await editor.type("sqrt(16) + abs(-3) =>", { delay: 50 });
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    // Combined assignment and evaluation
    await editor.type("result = x + y =>", { delay: 50 });
    await waitForUIRenderComplete(page);

    // Verify all evaluations via widgets (respecting decimal places formatting)
    const results = page.locator(".semantic-result-display");
    await expect(results.nth(0)).toHaveAttribute("data-result", /5(\.0+)?$/);
    await expect(results.nth(1)).toHaveAttribute("data-result", /50(\.0+)?$/);
    await expect(results.nth(2)).toHaveAttribute("data-result", /7(\.0+)?$/);
    await expect(results.nth(3)).toHaveAttribute("data-result", /15(\.0+)?$/);

    // Verify result variable was created
    const panelContent = await page.locator('[data-testid="variable-panel"]').textContent();
    expect(panelContent).toContain("result");
    expect(panelContent).toContain("15");
  });

  test("BASELINE: Real-time Propagation", async ({ page }) => {
    const editor = page.locator(".ProseMirror");

    // Create dependency chain
    await editor.type("base = 10", { delay: 50 });
    await page.keyboard.press("Enter");
    await editor.type("derived = base * 2 =>", { delay: 50 });
    await page.keyboard.press("Enter");
    await editor.type("final = derived + 5 =>", { delay: 50 });
    await waitForUIRenderComplete(page);

    // Verify initial values via widgets
    await expect(page.locator(".semantic-result-display").nth(0)).toHaveAttribute(
      "data-result",
      /20/
    );
    await expect(page.locator(".semantic-result-display").nth(1)).toHaveAttribute(
      "data-result",
      /25/
    );

    // Change base value - click at end of first line and edit the "10"
    const firstLine = editor.locator("p").first();
    await firstLine.click(); // Click on first line
    await page.keyboard.press("End"); // Go to end of line
    await page.keyboard.press("Backspace"); // Delete "0"
    await page.keyboard.press("Backspace"); // Delete "1"
    await editor.type("15", { delay: 50 }); // Type "15"
    await waitForUIRenderComplete(page);

    // Verify propagation via widgets
    await expect(page.locator(".semantic-result-display").nth(0)).toHaveAttribute(
      "data-result",
      /30/
    );
    await expect(page.locator(".semantic-result-display").nth(1)).toHaveAttribute(
      "data-result",
      /35/
    );
  });

  test("BASELINE: Error Handling - All Error Types", async ({ page }) => {
    const editor = page.locator(".ProseMirror");

    // Undefined variable error
    await editor.type("undefined_var + 5 =>", { delay: 50 });
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    // Division by zero
    await editor.type("10 / 0 =>", { delay: 50 });
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    // Invalid function
    await editor.type("sqrt(-1) =>", { delay: 50 });
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    // Verify all errors are shown via widgets
    const errors = page.locator(".semantic-error-result");
    await expect(errors.nth(0)).toHaveAttribute("data-result", /Undefined variable/);
    await expect(errors.nth(1)).toHaveAttribute("data-result", /Division by zero/);
    await expect(errors.nth(2)).toHaveAttribute("data-result", /Square root/);
  });

  test("BASELINE: Cascading Error Propagation", async ({ page }) => {
    const editor = page.locator(".ProseMirror");

    // Create working dependency chain
    await editor.type("a = 10", { delay: 50 });
    await page.keyboard.press("Enter");
    await editor.type("b = a * 2 =>", { delay: 50 });
    await page.keyboard.press("Enter");
    await editor.type("c = b + 5 =>", { delay: 50 });
    await waitForUIRenderComplete(page);

    // Verify working state via widgets
    await expect(page.locator(".semantic-result-display").nth(0)).toHaveAttribute(
      "data-result",
      /20/
    );
    await expect(page.locator(".semantic-result-display").nth(1)).toHaveAttribute(
      "data-result",
      /25/
    );

    // Break the chain by changing 'a' to 'ax'
    const firstLine = editor.locator("p").first();
    await firstLine.click({ position: { x: 0, y: 10 } });
    await page.keyboard.type("x", { delay: 50 }); // Changes "a = 10" to "xa = 10"
    await waitForUIRenderComplete(page);

    // Verify cascading errors via widgets
    const errors = page.locator(".semantic-error-result");
    await expect(errors.nth(0)).toHaveAttribute(
      "data-result",
      /'a' not defined|Undefined variable/i
    );
    await expect(errors.nth(1)).toHaveAttribute(
      "data-result",
      /'b' not defined|Undefined variable/i
    );
  });

  test("BASELINE: Semantic Highlighting - All Token Types", async ({ page }) => {
    const editor = page.locator(".ProseMirror");

    // Setup variables for highlighting test
    await editor.type("price = 10", { delay: 50 });
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    await editor.type("total = price * (1 + 0.08) =>", { delay: 50 });
    await waitForUIRenderComplete(page);

    // Check all semantic highlighting classes exist
    const variables = page.locator(".semantic-variable");
    const operators = page.locator(".semantic-operator");
    const numbers = page.locator(".semantic-scrubbableNumber, .semantic-number");
    const triggers = page.locator(".semantic-trigger");
    const results = page.locator(".semantic-result-display");

    expect(await variables.count()).toBeGreaterThanOrEqual(3); // price, total, price
    expect(await operators.count()).toBeGreaterThanOrEqual(3); // =, *, +
    expect(await numbers.count()).toBeGreaterThanOrEqual(3); // 10, 1, 0.08
    expect(await triggers.count()).toBeGreaterThanOrEqual(1); // =>
    expect(await results.count()).toBeGreaterThanOrEqual(1); // result widget
  });

  test("BASELINE: Phrase-based Variables with Spaces", async ({ page }) => {
    const editor = page.locator(".ProseMirror");

    // Test phrase-based variables
    await editor.type("base price = 100", { delay: 50 });
    await page.keyboard.press("Enter");
    await editor.type("tax rate = 0.08", { delay: 50 });
    await page.keyboard.press("Enter");
    await editor.type("final cost = base price * (1 + tax rate) =>", { delay: 50 });
    await waitForUIRenderComplete(page);

    // Verify via widget result and preserve paragraph text
    const row = editor.locator("p", { hasText: "final cost = base price" }).first();
    await expect(row.locator(".semantic-result-display")).toHaveAttribute("data-result", /108/);
    const rowText = await row.textContent();
    expect(rowText?.trim()).toMatch(/final cost = base price \* \(1 \+ tax rate\) =>$/);

    // Verify variables in panel
    const panelContent = await page.locator('[data-testid="variable-panel"]').textContent();
    expect(panelContent).toContain("base price");
    expect(panelContent).toContain("tax rate");
    expect(panelContent).toContain("final cost");
  });

  test("BASELINE: Performance Monitoring", async ({ page }) => {
    const editor = page.locator(".ProseMirror");

    // Listen for console logs to capture performance data
    const perfLogs: string[] = [];
    page.on("console", (msg) => {
      if (msg.text().includes("[PERF BASELINE]")) {
        perfLogs.push(msg.text());
      }
    });

    // Create a larger document to trigger performance logging
    for (let i = 0; i < 10; i++) {
      await editor.type(`var${i} = ${i * 10}`, { delay: 30 });
      await page.keyboard.press("Enter");
      await editor.type(`expr${i} = var${i} * 2 =>`, { delay: 30 });
      await page.keyboard.press("Enter");
    }

    await waitForUIRenderComplete(page);

    // Edit a variable to trigger recalculation
    await page.keyboard.press("Home");
    await page.keyboard.press("End");
    await page.keyboard.press("Backspace");
    await editor.type("5", { delay: 50 });
    await waitForUIRenderComplete(page);

    // Note: Performance logs are captured for later analysis
    console.log("Performance baseline established with", perfLogs.length, "measurements");
  });

  test("BASELINE: Complex Mixed Content", async ({ page }) => {
    const editor = page.locator(".ProseMirror");

    // Test realistic mixed content
    await editor.type("Project Budget", { delay: 50 });
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");

    await editor.type("initial budget = 10000", { delay: 50 });
    await page.keyboard.press("Enter");
    await editor.type("marketing spend = 2500", { delay: 50 });
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");

    await editor.type("remaining = initial budget - marketing spend =>", { delay: 50 });
    await page.keyboard.press("Enter");
    await editor.type("percentage = (marketing spend / initial budget) * 100 =>", { delay: 50 });
    await waitForUIRenderComplete(page);

    // Verify calculations via widgets
    await expect(page.locator(".semantic-result-display").nth(0)).toHaveAttribute(
      "data-result",
      /7500/
    );
    await expect(page.locator(".semantic-result-display").nth(1)).toHaveAttribute(
      "data-result",
      /25/
    );

    // Verify plain text is preserved
    const textOnly = await editor.textContent();
    expect(textOnly || "").toContain("Project Budget");
  });
});
