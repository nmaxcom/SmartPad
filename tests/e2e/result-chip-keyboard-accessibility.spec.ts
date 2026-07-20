import { expect, test } from "@playwright/test";
import {
  setEditorText,
  waitForEditorReady,
  waitForUIRenderComplete,
} from "./utils";

const tabTo = async (page: any, target: any) => {
  for (let index = 0; index < 30; index += 1) {
    await page.keyboard.press("Tab");
    if (
      await target.evaluate(
        (element: Element) => element === document.activeElement,
      )
    ) {
      return;
    }
  }
  throw new Error("Unable to reach the requested result with Tab");
};

test.describe("Result chip keyboard accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForEditorReady(page);
  });

  test("gives live and triggered result values one clear keyboard entry point", async ({
    page,
  }) => {
    await setEditorText(page, "2 + 3\n4 + 5 =>");

    const values = page.locator(
      ".semantic-result-display .semantic-result-value",
    );
    await expect(values).toHaveCount(2);
    for (const value of await values.all()) {
      await expect(value).toHaveAttribute("tabindex", "0");
      await expect(value).toHaveAttribute("role", "button");
      await expect(value).toHaveAttribute("aria-haspopup", "menu");
      await expect(value).toHaveAttribute(
        "aria-label",
        /Result: .+\. Press Enter for actions; drag to reuse\./,
      );
    }
  });

  test("opens, navigates, activates, and closes result actions without a pointer", async ({
    page,
  }) => {
    await setEditorText(
      page,
      "keep rate = 78%\ngross = 3000 EUR\ntake home = gross * keep rate =>",
    );

    let value = page
      .locator(".ProseMirror p")
      .nth(2)
      .locator(".semantic-result-value")
      .first();
    await tabTo(page, value);
    await expect(value).toBeFocused();
    await expect(value).toHaveCSS("outline-style", "solid");
    await expect(value).toHaveCSS("outline-width", "2px");
    await page.keyboard.press("Enter");

    let menu = page.getByRole("menu", {
      name: /Actions for result/,
    });
    await expect(menu).toBeVisible();
    await expect(
      menu.getByRole("menuitem", { name: "Copy value" }),
    ).toBeFocused();

    await page.keyboard.press("ArrowDown");
    await expect(
      menu.getByRole("menuitem", { name: "Go to source line" }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator(".ProseMirror p").nth(2)).toHaveClass(
      /semantic-source-line-highlight/,
    );

    value = page
      .locator(".ProseMirror p")
      .nth(2)
      .locator(".semantic-result-value")
      .first();
    await value.focus();
    await page.keyboard.press("Enter");
    menu = page.getByRole("menu", { name: /Actions for result/ });
    await page.keyboard.press("ArrowUp");
    await expect(
      menu.locator('button[role="menuitem"]:not(:disabled)').last(),
    ).toBeFocused();
    await page.keyboard.press("Home");
    await expect(
      menu.getByRole("menuitem", { name: "Copy value" }),
    ).toBeFocused();

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    const goalAction = menu.getByRole("menuitem", {
      name: "Find gross for a target…",
    });
    for (let index = 0; index < 12; index += 1) {
      if (await goalAction.evaluate((element) => element === document.activeElement)) {
        break;
      }
      await page.keyboard.press("ArrowDown");
    }
    await expect(goalAction).toBeFocused();
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    const goalLine = page.locator(".ProseMirror p").nth(3);
    await expect(goalLine).toContainText("make take home =");
    await expect(goalLine).toContainText("by gross =>");

    value = page
      .locator(".ProseMirror p")
      .nth(2)
      .locator(".semantic-result-value")
      .first();
    await value.focus();
    await page.keyboard.press(" ");
    menu = page.getByRole("menu", { name: /Actions for result/ });
    await expect(menu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(value).toBeFocused();
  });

  test("jumps from a focused reference to its source line", async ({
    page,
  }) => {
    await setEditorText(page, "100 + 20 =>\ntarget = ");
    const sourceLine = page.locator(".ProseMirror p").first();
    const sourceLineId = await sourceLine.getAttribute("data-line-id");
    expect(sourceLineId).toBeTruthy();

    await page.evaluate((lineId) => {
      const editor = (window as any).tiptapEditor;
      editor?.commands?.focus("end");
      editor?.commands?.insertContent({
        type: "referenceToken",
        attrs: {
          sourceLineId: lineId,
          sourceLine: 1,
          placeholderKey: "keyboard-reference",
          label: "120",
          sourceValue: "120",
        },
      });
    }, sourceLineId);

    const reference = page.locator(".semantic-reference-chip").first();
    await expect(reference).toHaveAttribute("tabindex", "0");
    await expect(reference).toHaveAttribute("role", "link");
    await expect(reference).toHaveAttribute(
      "aria-label",
      "Reference: 120. Press Enter to go to its source.",
    );
    await reference.focus();
    await page.keyboard.press("Enter");
    await expect(sourceLine).toHaveClass(/semantic-source-line-highlight/);
  });
});
