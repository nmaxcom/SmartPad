import { test, expect, type Page } from "@playwright/test";
import { waitForEditorReady, waitForUIRenderComplete } from "./utils";

const clearEditor = async (page: Page) => {
  await page.evaluate(() => {
    const editor = (window as any).tiptapEditor;
    if (!editor) return;
    editor.commands.setContent("<p></p>");
    window.dispatchEvent(new Event("forceEvaluation"));
  });
  await waitForUIRenderComplete(page);
};

const enterLine = async (
  page: Page,
  line: string
) => {
  const pm = page.locator(".ProseMirror");
  await pm.click();
  await pm.type(line);
  await page.keyboard.press("Enter");
  await waitForUIRenderComplete(page);
};

test.describe("Edge fixes 3-7", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForEditorReady(page);
    await clearEditor(page);
  });

  test("time-literal ranges render slot results", async ({ page }) => {
    await enterLine(page, "09:00..11:00 step 30 min=>");
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /09:00.*09:30.*10:00.*10:30.*11:00/
    );
  });

  test("deferred variable formulas resolve after dependencies are defined", async ({
    page,
  }) => {
    await enterLine(page, "x = 2*y");
    await enterLine(page, "y = 3");
    await enterLine(page, "x=>");
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      "6"
    );
  });

  test("grouped numeric assignment input shows explicit validation errors", async ({
    page,
  }) => {
    await enterLine(page, "b=2,000=>");
    await expect(page.locator(".semantic-error-result").last()).toHaveAttribute(
      "data-result",
      /Thousands separators in input are not supported/
    );
  });
});
