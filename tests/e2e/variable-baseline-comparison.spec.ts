import { expect, test } from "@playwright/test";
import { waitForEditorReady, waitForUIRenderComplete } from "./utils";

test.describe("Inline baseline comparison", () => {
  test("captures from a result menu and keeps comparisons inside the sheet", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      if (!window.sessionStorage.getItem("baseline-test-cleaned")) {
        window.localStorage.removeItem("smartpad-variable-baselines-v1");
        window.sessionStorage.setItem("baseline-test-cleaned", "true");
      }
    });
    await page.goto("/");
    await waitForEditorReady(page);
    await waitForUIRenderComplete(page);

    const variablePanel = page.getByTestId("variable-panel");
    await expect(
      variablePanel.getByRole("button", { name: /baseline/i }),
    ).toHaveCount(0);

    const editor = page.locator(".ProseMirror");
    const profitLine = editor
      .locator("p")
      .filter({ hasText: "profit = attendees" })
      .first();
    const profitChip = profitLine.locator(".semantic-result-display").first();

    await profitChip.hover();
    await profitChip.locator(".semantic-result-menu").click();
    let menu = page.locator(".semantic-result-action-menu");
    await expect(
      menu.getByRole("menuitem", { name: "Set baseline" }),
    ).toBeVisible();
    await menu.getByRole("menuitem", { name: "Set baseline" }).click();

    await expect(page.locator(".semantic-result-action-menu")).toHaveCount(0);
    await expect(editor).toHaveClass(/sp-baseline-active/);
    await expect(editor.locator(".semantic-baseline-input-delta")).toHaveCount(
      0,
    );
    await expect(editor.locator("[data-baseline-delta]")).toHaveCount(0);

    const ticketLine = editor
      .locator("p")
      .filter({ hasText: "ticket price =" })
      .first();
    const ticketLiteral = ticketLine
      .locator(".semantic-scrubbableNumber", { hasText: "32" })
      .first();
    await ticketLiteral.scrollIntoViewIfNeeded();
    const box = await ticketLiteral.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 20, startY, { steps: 4 });
    await page.mouse.up();
    await waitForUIRenderComplete(page);

    const inputDelta = ticketLine.locator(".semantic-baseline-input-delta");
    await expect(inputDelta).toContainText("Base 32 EUR");
    await expect(inputDelta).toContainText(/\+\d/);
    await expect(
      profitLine.locator(".semantic-wrapper[data-baseline-delta]").first(),
    ).toHaveAttribute("data-baseline-delta", /^\+\d/);

    await profitChip.hover();
    await profitChip.locator(".semantic-result-menu").click();
    menu = page.locator(".semantic-result-action-menu");
    await expect(
      menu.getByRole("menuitem", { name: "Update baseline" }),
    ).toBeVisible();
    await expect(
      menu.getByRole("menuitem", { name: "Clear baseline" }),
    ).toBeVisible();
    await menu.getByRole("menuitem", { name: "Update baseline" }).click();
    await expect(editor.locator(".semantic-baseline-input-delta")).toHaveCount(
      0,
    );
    await expect(editor.locator("[data-baseline-delta]")).toHaveCount(0);

    await page.reload();
    await waitForEditorReady(page);
    await waitForUIRenderComplete(page);
    await expect(page.locator(".ProseMirror")).toHaveClass(
      /sp-baseline-active/,
    );

    const reloadedProfitLine = page
      .locator(".ProseMirror p")
      .filter({ hasText: "profit = attendees" })
      .first();
    const reloadedProfitChip = reloadedProfitLine
      .locator(".semantic-result-display")
      .first();
    await reloadedProfitChip.hover();
    await reloadedProfitChip.locator(".semantic-result-menu").click();
    menu = page.locator(".semantic-result-action-menu");
    await menu.getByRole("menuitem", { name: "Clear baseline" }).click();

    await expect(page.locator(".ProseMirror")).not.toHaveClass(
      /sp-baseline-active/,
    );
    await reloadedProfitChip.hover();
    await reloadedProfitChip.locator(".semantic-result-menu").click();
    await expect(
      page
        .locator(".semantic-result-action-menu")
        .getByRole("menuitem", { name: "Set baseline" }),
    ).toBeVisible();
  });
});
