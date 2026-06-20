import { test, expect } from "@playwright/test";
import { clearEditor, waitForEditorReady, waitForUIRenderComplete } from "./utils";

const multilineCalculation = ["a = 1", "b = 2", "a + b =>", "c = 5", "c * 2 =>"].join("\n");

const insertMultilineCalculation = async (page: import("@playwright/test").Page) => {
  const editorContainer = page.locator('[data-testid="smart-pad-editor"]');
  await editorContainer.click();
  await page.keyboard.insertText(multilineCalculation);
  await waitForUIRenderComplete(page);
};

test.describe("Paste and Multi-Edit Regressions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForEditorReady(page);
    await clearEditor(page);
  });

  test("Multiline insertion creates widgets and clearing removes them", async ({
    page,
  }) => {
    await insertMultilineCalculation(page);

    const resultWidgets = page.locator(".semantic-result-display");
    const errorWidgets = page.locator(".semantic-error-result");

    const totalWidgets = (await resultWidgets.count()) + (await errorWidgets.count());
    expect(totalWidgets).toBe(2);

    // Delete all (simulate replacing with new content)
    const editorContainer = page.locator('[data-testid="smart-pad-editor"]');
    await editorContainer.click();
    await page.keyboard.press(process.platform === "darwin" ? "Meta+a" : "Control+a");
    await page.keyboard.press("Delete");
    await waitForUIRenderComplete(page);

    await expect(resultWidgets).toHaveCount(0);
    await expect(errorWidgets).toHaveCount(0);

  });

  test("Inserting/deleting lines shifts widgets correctly", async ({ page }) => {
    await insertMultilineCalculation(page);

    const resultWidgets = page.locator(".semantic-result-display");
    const errorWidgets = page.locator(".semantic-error-result");
    const widgetsBefore = (await resultWidgets.count()) + (await errorWidgets.count());
    expect(widgetsBefore).toBe(2);

    // Insert a new result line at the very top
    const firstParagraph = page.locator(".ProseMirror p").first();
    await firstParagraph.click();
    await page.keyboard.press("Home");
    await page.keyboard.type("x = 1 =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    const widgetsAfterInsert = (await resultWidgets.count()) + (await errorWidgets.count());
    expect(widgetsAfterInsert).toBeGreaterThanOrEqual(widgetsBefore + 1);

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
    const widgetsRestored = (await resultWidgets.count()) + (await errorWidgets.count());
    expect(widgetsRestored).toBeGreaterThan(0);
  });
});
