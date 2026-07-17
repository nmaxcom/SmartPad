import { expect, test } from "@playwright/test";
import { waitForEditorReady, waitForUIRenderComplete } from "./utils";

async function setModel(page: any, value = 100) {
  await page.evaluate((nextValue: number) => {
    const editor = (window as any).tiptapEditor;
    editor.commands.setContent(
      `<p>assumption = ${nextValue}</p><p>outcome = assumption * 2 =&gt;</p>`,
    );
    editor.commands.focus("start");
    window.dispatchEvent(new Event("forceEvaluation"));
  }, value);
  await waitForUIRenderComplete(page);
}

async function getDocumentText(page: any): Promise<string> {
  return page.evaluate(() => (window as any).tiptapEditor.getText());
}

test.describe("Number scrubber interactions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForEditorReady(page);
  });

  test("Shift gives fine control and explains the active mode", async ({ page }) => {
    await setModel(page);
    const number = page.locator(".semantic-scrubbableNumber", { hasText: "100" }).first();
    const box = await number.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await page.keyboard.down("Shift");
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 30, startY);

    await expect(page.locator(".number-scrub-delta-chip")).toContainText("fine");
    expect(await getDocumentText(page)).toContain("assumption = 103");

    await page.mouse.up();
    await page.keyboard.up("Shift");
    await expect(page.locator(".number-scrub-delta-chip")).toHaveCount(0);
  });

  test("Alt or Option gives coarse control", async ({ page }) => {
    await setModel(page);
    const number = page.locator(".semantic-scrubbableNumber", { hasText: "100" }).first();
    const box = await number.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await page.keyboard.down("Alt");
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 10, startY);

    await expect(page.locator(".number-scrub-delta-chip")).toContainText("coarse");
    expect(await getDocumentText(page)).toContain("assumption = 200");

    await page.mouse.up();
    await page.keyboard.up("Alt");
  });

  test("Escape cancels the gesture and restores the exact starting text", async ({ page }) => {
    await setModel(page);
    const number = page.locator(".semantic-scrubbableNumber", { hasText: "100" }).first();
    const box = await number.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 25, startY);
    expect(await getDocumentText(page)).toContain("assumption = 125");

    await page.keyboard.press("Escape");
    expect(await getDocumentText(page)).toContain("assumption = 100");
    await expect(page.locator(".number-scrub-delta-chip")).toHaveCount(0);

    await page.mouse.up();
    expect(await getDocumentText(page)).toContain("assumption = 100");
  });
});
