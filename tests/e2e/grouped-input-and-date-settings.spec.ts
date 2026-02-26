import { test, expect, type Page } from "@playwright/test";
import { waitForEditorReady, waitForUIRenderComplete } from "./utils";

const clearEditor = async (page: Page) => {
  await page.evaluate(() => {
    const editor = (window as any).tiptapEditor;
    if (!editor) return;
    editor.commands.setContent("<p></p>");
    window.dispatchEvent(new Event("forceEvaluation"));
  });
  await waitForUIRenderComplete(page);
};

const setLine = async (page: Page, line: string) => {
  await page.evaluate((value) => {
    const editor = (window as any).tiptapEditor;
    if (!editor) return;
    editor.commands.setContent(`<p>${value}</p>`);
    window.dispatchEvent(new Event("forceEvaluation"));
  }, line);
  await waitForUIRenderComplete(page);
};

test.describe("Grouped numeric input and date display settings", () => {
  test("grouped numeric input is not scrubbable", async ({ page }) => {
    await page.goto("/");
    await waitForEditorReady(page);
    await clearEditor(page);
    await setLine(page, "value = 2,000");

    const line = page.locator(".ProseMirror p").first();
    await expect(line.locator(".semantic-scrubbableNumber")).toHaveCount(0);
    await expect(line.locator(".semantic-number", { hasText: "2,000" })).toHaveCount(1);
  });

  test("scrubbable numbers show hover affordance without overriding text cursor", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForEditorReady(page);
    await clearEditor(page);
    await setLine(page, "value = 20");

    const number = page.locator(".semantic-scrubbableNumber", { hasText: "20" }).first();
    await expect(number).toBeVisible();
    await number.hover();

    const hoverStyles = await number.evaluate((el) => {
      const style = window.getComputedStyle(el);
      const after = window.getComputedStyle(el, "::after");
      return {
        cursor: style.cursor,
        textShadow: style.textShadow,
        afterContent: after.content,
        afterFontSize: after.fontSize,
        afterBackgroundImage: after.backgroundImage,
        afterBoxShadow: after.boxShadow,
      };
    });
    expect(hoverStyles.cursor).toBe("text");
    expect(hoverStyles.textShadow).not.toBe("none");
    expect(hoverStyles.afterContent).toContain("↔");
    expect(parseFloat(hoverStyles.afterFontSize)).toBeGreaterThanOrEqual(11);
    expect(hoverStyles.afterBackgroundImage).not.toBe("none");
    expect(hoverStyles.afterBoxShadow).not.toBe("none");

    const box = await number.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 12, box.y + box.height / 2);

    const bodyCursorDuringDrag = await page.evaluate(() => window.getComputedStyle(document.body).cursor);
    expect(bodyCursorDuringDrag).toBe("text");

    await page.mouse.up();
  });

  test("date display format setting updates existing result chips", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "smartpad-settings",
        JSON.stringify({
          dateLocaleMode: "custom",
          dateLocaleOverride: "es-ES",
          dateDisplayFormat: "locale",
        })
      );
    });

    await page.goto("/");
    await waitForEditorReady(page);
    await clearEditor(page);
    await setLine(page, "meeting = 2024-06-05 17:00 UTC =>");

    const firstLineResult = page.locator('.semantic-result-display[data-source-line="1"]').first();
    await expect(firstLineResult).toHaveAttribute("data-result", /05\/06\/2024.*17:00.*UTC/);

    await page.getByRole("button", { name: /open settings/i }).click();
    await page.locator("#settings-modal-date-display-format").selectOption("iso");
    await page.getByRole("button", { name: /close settings/i }).click();
    await waitForUIRenderComplete(page);

    await expect(firstLineResult).toHaveAttribute("data-result", /2024-06-05 17:00 UTC/);
  });

  test("locale override updates locale-formatted result chips", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "smartpad-settings",
        JSON.stringify({
          dateLocaleMode: "custom",
          dateLocaleOverride: "en-US",
          dateDisplayFormat: "locale",
        })
      );
    });

    await page.goto("/");
    await waitForEditorReady(page);
    await clearEditor(page);
    await setLine(page, "2024-06-05 =>");

    const firstLineResult = page.locator('.semantic-result-display[data-source-line="1"]').first();
    await expect(firstLineResult).toHaveAttribute("data-result", /06\/05\/2024/);

    await page.getByRole("button", { name: /open settings/i }).click();
    await page.locator("#settings-modal-date-locale-override").fill("es-ES");
    await page.getByRole("button", { name: /close settings/i }).click();
    await waitForUIRenderComplete(page);

    await expect(firstLineResult).toHaveAttribute("data-result", /05\/06\/2024/);
  });

  test("currency annotation list expressions do not require trailing comma", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForEditorReady(page);
    await clearEditor(page);
    await setLine(page, "2,0,1,2 to $ =>");

    const firstLineResult = page.locator('.semantic-result-display[data-source-line="1"]').first();
    await expect(firstLineResult).toHaveAttribute("data-result", "$2, $0, $1, $2");
  });
});
