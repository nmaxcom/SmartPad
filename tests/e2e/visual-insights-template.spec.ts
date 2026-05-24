import { expect, test } from "@playwright/test";
import { waitForUIRenderComplete } from "./utils";

test.describe("Visual Insights template", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="smart-pad-editor"]');
  });

  test("loads the new plot examples without disconnected views", async ({ page }) => {
    await page.click('button[title="Visual Insights"]');
    await waitForUIRenderComplete(page);

    const editor = page.locator(".ProseMirror");
    await expect(editor).toContainText("@view plot x=time y=speed domain=0.25..6 size=md");
    await expect(editor).toContainText("@view hist y=wait times size=md");
    await expect(editor).toContainText("@view scatter x=study hours y=test score size=md");

    await expect(page.locator(".semantic-error-result")).toHaveCount(0);
    await expect(page.locator(".plot-view-disconnected")).toHaveCount(0);
    await expect(page.locator(".plot-view")).toHaveCount(8);
    await expect(page.locator(".plot-view-bar").first()).toBeVisible();
    await expect(page.locator(".plot-view-scatter-dot").first()).toBeVisible();
  });
});
