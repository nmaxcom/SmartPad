import { expect, test } from "@playwright/test";
import { setEditorText, waitForEditorReady, waitForUIRenderComplete } from "./utils";

test("result reference source-line highlight visual check", async ({ page }) => {
  await page.goto("/");
  await waitForEditorReady(page);
  await page.setViewportSize({ width: 1400, height: 900 });
  await setEditorText(page, "<p>100 + 20 =&gt;</p><p>target = </p>");

  const sourceLine = page.locator(".ProseMirror p").first();
  const dependentLine = page.locator(".ProseMirror p").nth(1);
  const sourceChip = sourceLine.locator(".semantic-result-display");
  await expect(sourceChip).toBeVisible();
  await sourceChip.dragTo(dependentLine, {
    sourcePosition: { x: 8, y: 8 },
    targetPosition: { x: 90, y: 8 },
  });
  await waitForUIRenderComplete(page);
  await expect(dependentLine.locator(".semantic-reference-chip")).toHaveCount(1);

  const referenceChip = dependentLine.locator(".semantic-reference-chip").first();
  await expect(referenceChip).toHaveCSS("background-color", "rgba(124, 93, 250, 0)");
  await expect(referenceChip).toHaveCSS("border-top-width", "0px");
  await expect(referenceChip).toHaveCSS("padding-left", "0px");

  await referenceChip.hover();
  await expect(referenceChip).toHaveCSS("box-shadow", "none");

  await expect(sourceLine).toHaveClass(/semantic-source-line-highlight/);
  await expect(sourceLine).toHaveCSS("box-shadow", "none");
  await expect(sourceLine).toHaveCSS("border-radius", "0px");
  await page.screenshot({
    path: "test-results/result-reference-source-highlight.png",
    fullPage: true,
  });
});
