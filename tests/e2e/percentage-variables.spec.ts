/**
 * Percentage Variables E2E Tests
 *
 * Tests that variables with percentage values (like discount=20%) 
 * actually appear in the variable panel and don't disappear
 */

import { test, expect } from "@playwright/test";
import { waitForUIRenderComplete } from "./utils";

test.describe("Percentage Variables in Variable Panel", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="smart-pad-editor"]');
  });

  test("should display percentage variable in variable panel", async ({ page }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    const variablePanel = page.locator('[data-testid="variable-panel"]');

    // Type a percentage variable assignment
    await editor.click();
    await editor.type("discount = 20%", { delay: 50 });
    await page.keyboard.press("Enter");

    // Wait for the variable to be processed and displayed
    await waitForUIRenderComplete(page);

    // Check that the variable appears in the variable panel
    const panelContent = await variablePanel.textContent();
    console.log("Variable panel content:", panelContent);

    // The variable panel should show the percentage variable
    expect(panelContent).toContain("discount");
    expect(panelContent).toContain("20%");

    // Verify the variable item is visible
    const variableItem = variablePanel.locator(".variable-item", { hasText: "discount" });
    await expect(variableItem).toBeVisible();
  });

  test("should display multiple percentage variables correctly", async ({ page }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    const variablePanel = page.locator('[data-testid="variable-panel"]');

    // Type multiple percentage variable assignments
    const assignments = [
      "tax_rate = 15%",
      "discount = 20%",
      "commission = 5.5%"
    ];

    for (const assignment of assignments) {
      await editor.click();
      await editor.type(assignment, { delay: 50 });
      await page.keyboard.press("Enter");
      await waitForUIRenderComplete(page);
    }

    // Check that all variables appear in the variable panel
    const panelContent = await variablePanel.textContent();
    console.log("Variable panel content:", panelContent);

    // All percentage variables should be visible
    expect(panelContent).toContain("tax_rate");
    expect(panelContent).toContain("15%");
    expect(panelContent).toContain("discount");
    expect(panelContent).toContain("20%");
    expect(panelContent).toContain("commission");
    expect(panelContent).toContain("5.5%");

    // Verify each variable item is visible
    await expect(variablePanel.locator(".variable-item", { hasText: "tax_rate" })).toBeVisible();
    await expect(variablePanel.locator(".variable-item", { hasText: "discount" })).toBeVisible();
    await expect(variablePanel.locator(".variable-item", { hasText: "commission" })).toBeVisible();
  });

  test("percentage variables should persist after adding expressions", async ({ page }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    const variablePanel = page.locator('[data-testid="variable-panel"]');

    // Create a percentage variable
    await editor.click();
    await editor.type("discount = 20%", { delay: 50 });
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    // Verify it's in the panel
    let panelContent = await variablePanel.textContent();
    expect(panelContent).toContain("discount");
    expect(panelContent).toContain("20%");

    // Add an expression that uses the variable
    await editor.click();
    await editor.type("discount of 100 =>", { delay: 50 });
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    // The variable should still be in the panel
    panelContent = await variablePanel.textContent();
    expect(panelContent).toContain("discount");
    expect(panelContent).toContain("20%");

    // The expression should show a result
    const resultWidget = page.locator(".semantic-result-display").last();
    await expect(resultWidget).toBeVisible();
  });

  test("should handle percentage variables with currency", async ({ page }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    const variablePanel = page.locator('[data-testid="variable-panel"]');

    // Create a percentage variable
    await editor.click();
    await editor.type("tax_rate = 15%", { delay: 50 });
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    // Create a currency variable
    await editor.click();
    await editor.type("price = $100", { delay: 50 });
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    // Check both variables are in the panel
    const panelContent = await variablePanel.textContent();
    expect(panelContent).toContain("tax_rate");
    expect(panelContent).toContain("15%");
    expect(panelContent).toContain("price");
    expect(panelContent).toContain("$100");

    // Use the percentage variable in a calculation
    await editor.click();
    await editor.type("tax_rate of price =>", { delay: 50 });
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    // Both variables should still be visible
    const updatedPanelContent = await variablePanel.textContent();
    expect(updatedPanelContent).toContain("tax_rate");
    expect(updatedPanelContent).toContain("15%");
    expect(updatedPanelContent).toContain("price");
    expect(updatedPanelContent).toContain("$100");
  });
});


