import { test, expect } from "@playwright/test";
import { waitForUIRenderComplete } from "./utils";

test.describe("Quick Tour template", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="smart-pad-editor"]');
  });

  test("loads as a multiline mission template without result errors", async ({ page }) => {
    await page.click('button[title="Quick Tour"]');
    await waitForUIRenderComplete(page);

    const resultWidgets = page.locator(".semantic-result-display");
    const errorWidgets = page.locator(".semantic-error-result");
    expect(await resultWidgets.count()).toBeGreaterThanOrEqual(10);
    await expect(errorWidgets).toHaveCount(0);

    await expect(page.locator(".ProseMirror")).toContainText(
      "@view plot x=x y=base + bump*x domain=0..8"
    );
  });
});
