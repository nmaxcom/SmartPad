import { expect, test } from "@playwright/test";
import { waitForUIRenderComplete } from "./utils";

test("result reference visual quality check", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector('[data-testid="smart-pad-editor"]');
  await page.setViewportSize({ width: 1600, height: 980 });

  const editor = page.locator('[data-testid="smart-pad-editor"]');
  await editor.click();
  await page.keyboard.type("subtotal = 120 =>");
  await page.keyboard.press("Enter");
  await page.keyboard.type("tax = ");
  await waitForUIRenderComplete(page);

  const sourceChip = page.locator(".ProseMirror p").first().locator(".semantic-result-display");
  const taxLine = page.locator(".ProseMirror p").nth(1);
  await taxLine.click({ position: { x: 80, y: 8 } });
  await sourceChip.click();
  await page.keyboard.type(" * 0.15 =>");
  await page.keyboard.press("Enter");
  await page.keyboard.type("total = ");
  await sourceChip.click();
  await page.keyboard.type(" + 5 =>");
  await waitForUIRenderComplete(page);

  await page.screenshot({
    path: "test-results/result-reference-desktop-lane.png",
    fullPage: true,
  });

  await page.setViewportSize({ width: 760, height: 980 });
  await waitForUIRenderComplete(page);
  await page.screenshot({
    path: "test-results/result-reference-mobile-inline.png",
    fullPage: true,
  });

  await page.setViewportSize({ width: 1600, height: 980 });
  await waitForUIRenderComplete(page);

  await page.evaluate(() => {
    const editorInstance = (window as any).tiptapEditor;
    const { state, view } = editorInstance;
    const firstLineNode = state.doc.child(0);
    const from = 1;
    const to = from + firstLineNode.content.size;
    const tr = state.tr.replaceWith(from, to, state.schema.text("subtotal = 12/0 =>"));
    view.dispatch(tr);
    window.dispatchEvent(new Event("forceEvaluation"));
  });

  await waitForUIRenderComplete(page);
  await expect(page.locator(".semantic-reference-chip")).toHaveCount(2);
  await expect(page.locator(".semantic-reference-broken")).toHaveCount(2);

  await page.screenshot({
    path: "test-results/result-reference-broken-state.png",
    fullPage: true,
  });
});
