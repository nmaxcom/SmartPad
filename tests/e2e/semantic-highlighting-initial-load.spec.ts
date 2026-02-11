import { expect, test } from "@playwright/test";
import { waitForUIRenderComplete } from "./utils";

test("semantic highlighting is present immediately after reload (no typing needed)", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForSelector('[data-testid="smart-pad-editor"]');

  const editor = page.locator(".ProseMirror");
  await editor.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Delete");

  await page.keyboard.type("30 euros to USD");
  await waitForUIRenderComplete(page);

  const firstLine = page.locator(".ProseMirror p").first();
  await expect(firstLine.locator(".semantic-scrubbableNumber", { hasText: "30" })).toBeVisible();
  await expect(firstLine.locator(".semantic-unit", { hasText: "euros" })).toBeVisible();
  await expect(firstLine.locator(".semantic-keyword", { hasText: "to" })).toBeVisible();
  await expect(firstLine.locator(".semantic-unit", { hasText: "USD" })).toBeVisible();

  await page.waitForTimeout(200);
  await page.reload();
  await page.waitForSelector('[data-testid="smart-pad-editor"]');
  await waitForUIRenderComplete(page);

  const reloadedLine = page.locator(".ProseMirror p").first();
  await expect(
    reloadedLine.locator(".semantic-scrubbableNumber", { hasText: "30" })
  ).toBeVisible();
  await expect(reloadedLine.locator(".semantic-unit", { hasText: "euros" })).toBeVisible();
  await expect(reloadedLine.locator(".semantic-keyword", { hasText: "to" })).toBeVisible();
  await expect(reloadedLine.locator(".semantic-unit", { hasText: "USD" })).toBeVisible();
});
