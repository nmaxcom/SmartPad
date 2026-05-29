import { expect, test } from "@playwright/test";
import { waitForUIRenderComplete } from "./utils";

test.describe("Goal Seek template", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="smart-pad-editor"]');
  });

  test("loads progressive goal-seek examples without errors", async ({ page }) => {
    await page.click('button[title="Goal Seek"]');
    await waitForUIRenderComplete(page);

    const editor = page.locator(".ProseMirror");
    await expect(editor).toContainText("make checkout total = 150 EUR by items =>");
    await expect(editor).toContainText("make runway = 12 month by monthly burn =>");
    await expect(editor).toContainText("make projected signups = 850 by ad spend =>");
    await expect(editor).toContainText("make target distance / target time = 100 km/h by target time =>");

    await expect(page.locator(".semantic-error-result")).toHaveCount(0);
    expect(await page.locator(".semantic-result-display").count()).toBeGreaterThanOrEqual(18);
  });
});
