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
});
