import { expect, test } from "@playwright/test";
import { waitForEditorReady, waitForUIRenderComplete } from "./utils";

test.describe("Decision Playground first run", () => {
  test("opens as a focused live model with a connected plot and target", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForEditorReady(page);
    await waitForUIRenderComplete(page);

    await expect(
      page.locator(".sheet-item.active .sheet-title-text"),
    ).toHaveText("Decision Playground");

    const editor = page.locator(".ProseMirror");
    await expect(editor).toContainText(
      "First move: open profit's result menu (⋯), choose Set baseline, then drag 32.",
    );
    await expect(editor).toContainText("Save current scenario…");
    await expect(editor).toContainText(
      "make profit = 2500 EUR by ticket price =>",
    );
    await expect(page.locator(".semantic-error-result")).toHaveCount(0);
    await expect(page.locator(".plot-view-disconnected")).toHaveCount(0);
    await expect(page.locator(".plot-view")).toHaveCount(1);
    await expect(page.locator(".plot-view-line").first()).toBeVisible();
  });
});
