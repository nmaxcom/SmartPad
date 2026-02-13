import { expect, test } from "@playwright/test";
import { waitForUIRenderComplete } from "./utils";

test.describe("User Repro: Duplicate Literal After Reference", () => {
  test("PI*10 -> click result -> *2= -> > remains stable without duplication/red-state", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="smart-pad-editor"]');
    await page.evaluate(() => {
      const key = "smartpad-settings";
      const existing = JSON.parse(localStorage.getItem(key) || "{}");
      localStorage.setItem(
        key,
        JSON.stringify({
          ...existing,
          liveResultEnabled: true,
          chipInsertMode: "reference",
          groupThousands: false,
          resultLaneEnabled: false,
        })
      );
    });
    await page.reload();
    await page.waitForSelector('[data-testid="smart-pad-editor"]');
    await page.evaluate(() => {
      const editor = (window as any).tiptapEditor;
      if (!editor) return;
      editor.commands.setContent("<p></p>");
      window.dispatchEvent(new Event("forceEvaluation"));
    });
    await waitForUIRenderComplete(page);

    let reproduced = false;
    let lastLineText = "";
    for (let i = 0; i < 30 && !reproduced; i++) {
      await page.evaluate(() => {
        const editor = (window as any).tiptapEditor;
        if (!editor) return;
        editor.commands.setContent("<p></p>");
        window.dispatchEvent(new Event("forceEvaluation"));
      });
      await waitForUIRenderComplete(page);

      const editor = page.locator('[data-testid="smart-pad-editor"]');
      await editor.click();
      await page.keyboard.type("PI * 10");
      await page.keyboard.press("Enter");
      await page.keyboard.type(" ");
      await waitForUIRenderComplete(page);

      const sourceLive = page.locator(".ProseMirror p").first().locator(".semantic-live-result-display");
      const dependent = page.locator(".ProseMirror p").nth(1);
      await dependent.click({ position: { x: 16, y: 8 } });
      await sourceLive.click();
      await page.keyboard.type("*2=");
      await waitForUIRenderComplete(page);
      await page.keyboard.type(">");
      await waitForUIRenderComplete(page);

      lastLineText = ((await dependent.textContent()) || "").replace(/\s+/g, "");
      const hasDuplicateLiteral = lastLineText.includes("31.4231.42");
      const hasSemanticError = await dependent
        .locator(".semantic-error, .semantic-error-result")
        .count()
        .then((count) => count > 0);
      const hasExpectedRefChip = (await dependent.locator(".semantic-reference-chip").count()) === 1;
      const hasExpectedResult = await dependent
        .locator(".semantic-result-display")
        .last()
        .getAttribute("data-result")
        .then((value) => /62\.84/.test(String(value || "")))
        .catch(() => false);

      if ((hasDuplicateLiteral || hasSemanticError) && !hasExpectedRefChip && !hasExpectedResult) {
        reproduced = true;
      }
    }

    expect(
      reproduced,
      `Detected duplicated literal/red-state issue. Last normalized line text: ${lastLineText}`
    ).toBe(false);
  });
});
