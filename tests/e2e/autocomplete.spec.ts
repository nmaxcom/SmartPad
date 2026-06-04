import { expect, test } from "@playwright/test";
import { waitForEditorReady, waitForUIRenderComplete } from "./utils";

test.describe("Autocomplete", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForEditorReady(page);
  });

  test("inserts a phrase variable from the suggestion menu", async ({ page }) => {
    await page.evaluate(() => {
      const editor = (window as any).tiptapEditor;
      editor.commands.setContent("monthly subscription revenue = $1200\n");
      editor.commands.focus("end");
      window.dispatchEvent(new Event("forceEvaluation"));
    });
    await waitForUIRenderComplete(page);

    await page.keyboard.press("Enter");
    await page.keyboard.type("total = monthly sub");
    await expect(page.locator(".smartpad-autocomplete-menu")).toBeVisible();
    await expect(page.getByRole("option", { name: /monthly subscription revenue/i })).toBeVisible();

    await page.keyboard.press("Tab");

    const text = await page.locator(".ProseMirror").innerText();
    expect(text).toContain("total = monthly subscription revenue");
  });

  test("inserts a user-defined function call", async ({ page }) => {
    await page.evaluate(() => {
      const editor = (window as any).tiptapEditor;
      editor.commands.setContent(
        "compound(principal, rate, years) = principal * (1 + rate)^years\n"
      );
      editor.commands.focus("end");
      window.dispatchEvent(new Event("forceEvaluation"));
    });
    await waitForUIRenderComplete(page);

    await page.keyboard.press("Enter");
    await page.keyboard.type("growth = comp");
    await expect(page.locator(".smartpad-autocomplete-menu")).toBeVisible();
    await expect(page.getByRole("option", { name: /compound/i })).toBeVisible();

    await page.keyboard.press("Enter");

    const text = await page.locator(".ProseMirror").innerText();
    expect(text).toContain("growth = compound(");
  });
});
