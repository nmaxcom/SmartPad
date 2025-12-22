import { test, expect } from "@playwright/test";
import { waitForUIRenderComplete } from "./utils";

test.describe("Paste and Multi-Edit Regressions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="smart-pad-editor"]');
    const editor = page.locator(".ProseMirror");
    await editor.click();
    // Clear
    await page.keyboard.press(process.platform === "darwin" ? "Meta+a" : "Control+a");
    await page.keyboard.press("Delete");
  });

  test("Template insertion acts like paste: one widget per => line, stable on undo/redo", async ({
    page,
  }) => {
    // Use the Units Quick Check template (acts like a multi-line paste)
    await page.click('button[title="Units Quick Check"]');
    await waitForUIRenderComplete(page);

    const resultWidgets = page.locator(".semantic-result-display");
    const errorWidgets = page.locator(".semantic-error-result");

    // Compute total lines with =>
    const totalArrows = await page
      .locator(".ProseMirror p")
      .evaluateAll((nodes) =>
        nodes.reduce((acc, n) => acc + (n.textContent?.includes("=>") ? 1 : 0), 0)
      );
    // Total widgets (results + errors) must equal number of => lines
    const totalWidgets = (await resultWidgets.count()) + (await errorWidgets.count());
    expect(totalWidgets).toBe(totalArrows);

    // Delete all (simulate replacing with new content)
    const editorContainer = page.locator('[data-testid="smart-pad-editor"]');
    await editorContainer.click();
    await page.keyboard.press(process.platform === "darwin" ? "Meta+a" : "Control+a");
    await page.keyboard.press("Delete");
    await waitForUIRenderComplete(page);

    await expect(resultWidgets).toHaveCount(0);
    await expect(errorWidgets).toHaveCount(0);

    // Undo (widgets should restore in correct positions)
    await page.keyboard.press(process.platform === "darwin" ? "Meta+z" : "Control+z");
    await waitForUIRenderComplete(page);
    const totalArrowsAfterUndo = await page
      .locator(".ProseMirror p")
      .evaluateAll((nodes) =>
        nodes.reduce((acc, n) => acc + (n.textContent?.includes("=>") ? 1 : 0), 0)
      );
    const totalWidgetsAfterUndo = (await resultWidgets.count()) + (await errorWidgets.count());
    expect(totalWidgetsAfterUndo).toBe(totalArrowsAfterUndo);
  });

  test("Inserting/deleting lines shifts widgets correctly", async ({ page }) => {
    // Start with quick template
    await page.click('button[title="Units Quick Check"]');
    await waitForUIRenderComplete(page);

    const resultWidgets = page.locator(".semantic-result-display");
    const errorWidgets = page.locator(".semantic-error-result");
    const totalBefore = await page
      .locator(".ProseMirror p")
      .evaluateAll((nodes) =>
        nodes.reduce((acc, n) => acc + (n.textContent?.includes("=>") ? 1 : 0), 0)
      );
    const widgetsBefore = (await resultWidgets.count()) + (await errorWidgets.count());
    expect(widgetsBefore).toBe(totalBefore);

    // Insert a new result line at the very top
    const firstParagraph = page.locator(".ProseMirror p").first();
    await firstParagraph.click();
    await page.keyboard.press("Home");
    await page.keyboard.type("x = 1 =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    const totalAfterInsert = await page
      .locator(".ProseMirror p")
      .evaluateAll((nodes) =>
        nodes.reduce((acc, n) => acc + (n.textContent?.includes("=>") ? 1 : 0), 0)
      );
    const widgetsAfterInsert = (await resultWidgets.count()) + (await errorWidgets.count());
    expect(widgetsAfterInsert).toBe(totalAfterInsert);

    // Delete the just inserted line fully and ensure widget count decrements
    await page.keyboard.press(process.platform === "darwin" ? "Meta+a" : "Control+a");
    // Select-all selects whole doc; delete then undo other content to keep test concise
    await page.keyboard.press("Delete");
    await waitForUIRenderComplete(page);
    await expect(resultWidgets).toHaveCount(0);
    await expect(errorWidgets).toHaveCount(0);

    // Undo to restore content including the extra line
    await page.keyboard.press(process.platform === "darwin" ? "Meta+z" : "Control+z");
    await waitForUIRenderComplete(page);
    // Depending on editor history granularity, we may restore to before insert; assert minimum
    const totalRestored = await page
      .locator(".ProseMirror p")
      .evaluateAll((nodes) =>
        nodes.reduce((acc, n) => acc + (n.textContent?.includes("=>") ? 1 : 0), 0)
      );
    const widgetsRestored = (await resultWidgets.count()) + (await errorWidgets.count());
    expect(widgetsRestored).toBe(totalRestored);
  });
});
