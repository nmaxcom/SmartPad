import { expect, test } from "@playwright/test";
import { waitForUIRenderComplete } from "./utils";

test("result reference source-line highlight visual check", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector('[data-testid="smart-pad-editor"]');
  await page.setViewportSize({ width: 1400, height: 900 });

  const editor = page.locator('[data-testid="smart-pad-editor"]');
  await editor.click();
  await page.keyboard.type("100 + 20 =>");
  await page.keyboard.press("Enter");
  await page.keyboard.type(" ");
  await waitForUIRenderComplete(page);

  const sourceLine = page.locator(".ProseMirror p").first();
  const dependentLine = page.locator(".ProseMirror p").nth(1);
  await dependentLine.click({ position: { x: 14, y: 8 } });
  await sourceLine.locator(".semantic-result-display").click();
  await waitForUIRenderComplete(page);
  await expect(dependentLine.locator(".semantic-reference-chip")).toHaveCount(1);

  await dependentLine.locator(".semantic-reference-chip").first().hover();

  await expect(sourceLine).toHaveClass(/semantic-source-line-highlight/);
  await page.screenshot({
    path: "test-results/result-reference-source-highlight.png",
    fullPage: true,
  });
});
