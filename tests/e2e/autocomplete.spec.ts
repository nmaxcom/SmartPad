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
        "<p>compound(principal, rate, years) = principal * (1 + rate)^years</p>"
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

  test("does not open just by moving the caret onto an existing variable", async ({ page }) => {
    await page.evaluate(() => {
      const editor = (window as any).tiptapEditor;
      editor.commands.setContent("roi = 44%\nwin = roi");
      editor.commands.focus("end");
      window.dispatchEvent(new Event("forceEvaluation"));
    });
    await waitForUIRenderComplete(page);

    await page.evaluate(() => {
      const editor = (window as any).tiptapEditor;
      const documentEnd = editor.state.doc.content.size;
      editor.commands.setTextSelection(Math.max(1, documentEnd - 1));
    });

    await expect(page.locator(".smartpad-autocomplete-menu")).toBeHidden();
  });

  test("closes exact variable suggestions after a trailing space", async ({ page }) => {
    await page.evaluate(() => {
      const editor = (window as any).tiptapEditor;
      editor.commands.setContent("roi = 44%\n");
      editor.commands.focus("end");
      window.dispatchEvent(new Event("forceEvaluation"));
    });
    await waitForUIRenderComplete(page);

    await page.keyboard.press("Enter");
    await page.keyboard.type("win = roi");
    await expect(page.locator(".smartpad-autocomplete-menu")).toBeHidden();

    await page.keyboard.type(" ");
    await expect(page.locator(".smartpad-autocomplete-menu")).toBeHidden();
  });

  test("auto-suggest waits for a token character after whitespace", async ({ page }) => {
    await page.evaluate(() => {
      const editor = (window as any).tiptapEditor;
      editor.commands.setContent("<p>roi = 44%</p><p>roi tax = 21%</p>");
      editor.commands.focus("end");
      window.dispatchEvent(new Event("forceEvaluation"));
    });
    await waitForUIRenderComplete(page);

    await page.keyboard.press("Enter");
    await page.keyboard.type("win = roi ");
    await expect(page.locator(".smartpad-autocomplete-menu")).toBeHidden();

    await page.keyboard.type("t");
    await expect(page.locator(".smartpad-autocomplete-menu")).toBeVisible();
    await expect(page.getByRole("option", { name: /roi tax/i })).toBeVisible();
  });

  test("manual shortcut opens contextual suggestions without a token prefix", async ({ page }) => {
    await page.evaluate(() => {
      const editor = (window as any).tiptapEditor;
      editor.commands.setContent("<p>roi = 44%</p><p>roi tax = 21%</p>");
      editor.commands.focus("end");
      window.dispatchEvent(new Event("forceEvaluation"));
    });
    await waitForUIRenderComplete(page);

    await page.keyboard.press("Enter");
    await page.keyboard.type("win = roi ");
    await expect(page.locator(".smartpad-autocomplete-menu")).toBeHidden();

    await page.keyboard.press("Control+Shift+K");
    await expect(page.locator(".smartpad-autocomplete-menu")).toBeVisible();
    await expect(page.getByRole("option", { name: /roi tax/i })).toBeVisible();
  });

  test("manual autocomplete shortcut can be changed in settings", async ({ page }) => {
    await page.getByLabel("Open Settings", { exact: true }).click();
    const shortcutRecorder = page.locator("#settings-modal-autocomplete-manual-shortcut");
    await shortcutRecorder.click();
    await page.keyboard.press("Control+Alt+K");
    await expect(shortcutRecorder).toContainText("Ctrl+Alt+K");
    await page.getByLabel("Close settings").click();

    await page.evaluate(() => {
      const editor = (window as any).tiptapEditor;
      editor.commands.setContent("<p>roi = 44%</p><p>roi tax = 21%</p>");
      editor.commands.focus("end");
      window.dispatchEvent(new Event("forceEvaluation"));
    });
    await waitForUIRenderComplete(page);

    await page.keyboard.press("Enter");
    await page.keyboard.type("win = roi ");

    await page.keyboard.press("Control+Shift+K");
    await expect(page.locator(".smartpad-autocomplete-menu")).toBeHidden();

    await page.keyboard.press("Control+Alt+K");
    await expect(page.locator(".smartpad-autocomplete-menu")).toBeVisible();
    await expect(page.getByRole("option", { name: /roi tax/i })).toBeVisible();
  });

  test("recorded manual shortcut opens after returning focus with a real editor click", async ({
    page,
  }) => {
    await page.getByLabel("Open Settings", { exact: true }).click();
    const shortcutRecorder = page.locator("#settings-modal-autocomplete-manual-shortcut");
    await shortcutRecorder.click();
    await page.keyboard.press("Control+Alt+K");
    await expect(shortcutRecorder).toContainText("Ctrl+Alt+K");
    await page.getByLabel("Close settings").click();

    await page.evaluate(() => {
      const editor = (window as any).tiptapEditor;
      editor.commands.setContent("<p></p>");
      window.dispatchEvent(new Event("forceEvaluation"));
    });
    await waitForUIRenderComplete(page);

    const editor = page.locator(".ProseMirror");
    await editor.click();
    await page.keyboard.type("roi = 44%");
    await page.keyboard.press("Enter");
    await page.keyboard.type("roi tax = 21%");
    await page.keyboard.press("Enter");

    await page.keyboard.press("Control+Alt+K");
    await expect(page.locator(".smartpad-autocomplete-menu")).toBeVisible();
    await expect(page.getByRole("option", { name: /roi 44%/i })).toBeVisible();
    await expect(page.getByRole("option", { name: /roi tax/i })).toBeVisible();
    await expect(page.getByRole("option", { name: /sqrt\(value\)/i })).toBeVisible();
  });

  test("closes when a variable name is completed exactly", async ({ page }) => {
    await page.evaluate(() => {
      const editor = (window as any).tiptapEditor;
      editor.commands.setContent("market = 7%\nfundfee = 0.35%\nplatformfee = 0.15%\n");
      editor.commands.focus("end");
      window.dispatchEvent(new Event("forceEvaluation"));
    });
    await waitForUIRenderComplete(page);

    await page.keyboard.press("Enter");
    await page.keyboard.type("annual = market - fundfee - platformfee");
    await expect(page.locator(".smartpad-autocomplete-menu")).toBeHidden();
  });

  test("keeps the highlighted option visible while navigating long menus", async ({ page }) => {
    await page.evaluate(() => {
      const editor = (window as any).tiptapEditor;
      const suffixes = [
        "alpha",
        "bravo",
        "charlie",
        "delta",
        "echo",
        "foxtrot",
        "golf",
        "hotel",
        "india",
        "juliet",
        "kilo",
        "lima",
        "mike",
        "november",
      ];
      const variables = suffixes.map((suffix, index) => `item ${suffix} = ${index + 1}`);
      editor.commands.setContent(variables.map((line) => `<p>${line}</p>`).join(""));
      editor.commands.focus("end");
      window.dispatchEvent(new Event("forceEvaluation"));
    });
    await waitForUIRenderComplete(page);

    await page.keyboard.press("Enter");
    await page.keyboard.type("total = item");
    const menu = page.locator(".smartpad-autocomplete-menu");
    await expect(menu).toBeVisible();

    for (let index = 0; index < 10; index++) {
      await page.keyboard.press("ArrowDown");
    }

    const geometry = await page.evaluate(() => {
      const menuEl = document.querySelector(".smartpad-autocomplete-menu") as HTMLElement | null;
      const activeEl = document.querySelector(
        ".smartpad-autocomplete-item-active"
      ) as HTMLElement | null;
      if (!menuEl || !activeEl) return null;
      const menuRect = menuEl.getBoundingClientRect();
      const activeRect = activeEl.getBoundingClientRect();
      return {
        scrollTop: menuEl.scrollTop,
        activeTop: activeRect.top,
        activeBottom: activeRect.bottom,
        menuTop: menuRect.top,
        menuBottom: menuRect.bottom,
      };
    });

    expect(geometry).not.toBeNull();
    expect((geometry as any).scrollTop).toBeGreaterThan(0);
    expect((geometry as any).activeTop).toBeGreaterThanOrEqual((geometry as any).menuTop);
    expect((geometry as any).activeBottom).toBeLessThanOrEqual((geometry as any).menuBottom);
  });
});
