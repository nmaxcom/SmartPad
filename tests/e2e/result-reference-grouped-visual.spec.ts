import { expect, test } from "@playwright/test";
import { waitForUIRenderComplete } from "./utils";

test("result reference grouped-thousands visual check", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector('[data-testid="smart-pad-editor"]');
  await page.setViewportSize({ width: 1400, height: 900 });

  await page.evaluate(() => {
    const key = "smartpad-settings";
    const existing = JSON.parse(localStorage.getItem(key) || "{}");
    existing.groupThousands = true;
    localStorage.setItem(key, JSON.stringify(existing));
  });
  await page.reload();
  await page.waitForSelector('[data-testid="smart-pad-editor"]');

  const editor = page.locator('[data-testid="smart-pad-editor"]');
  await editor.click();
  await page.keyboard.type("known = 20");
  await page.keyboard.press("Enter");
  await page.keyboard.type("known*83");
  await page.keyboard.press("Enter");
  await page.keyboard.type(" ");
  await waitForUIRenderComplete(page);

  const sourceChip = page.locator(".ProseMirror p").nth(1).locator(".semantic-live-result-display");
  await sourceChip.click();
  await page.keyboard.type(" *3");
  await waitForUIRenderComplete(page);

  await expect(page.locator(".ProseMirror p").nth(2).locator(".semantic-live-result-display")).toHaveAttribute(
    "data-result",
    /4,?980/
  );

  await page.screenshot({
    path: "test-results/result-reference-grouped-thousands.png",
    fullPage: true,
  });
});
