import { expect, test } from "@playwright/test";
import {
  setEditorText,
  waitForEditorReady,
  waitForUIRenderComplete,
} from "./utils";

const model = [
  "customers = 100",
  "price = 50 EUR",
  "cost per customer = 10 EUR",
  "fixed costs = 1000 EUR",
  "revenue = customers * price",
  "variable costs = customers * cost per customer",
  "profit = revenue - variable costs - fixed costs =>",
  "margin = profit / revenue * 100 =>",
].join("\n");

test.describe("Inline sensitivity analysis", () => {
  test("ranks root inputs and keeps the tornado live beside the result", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      if (!window.sessionStorage.getItem("sensitivity-test-cleaned")) {
        window.localStorage.removeItem("smartpad-sensitivity-analyses-v1");
        window.sessionStorage.setItem("sensitivity-test-cleaned", "true");
      }
    });
    await page.goto("/");
    await waitForEditorReady(page);
    await setEditorText(page, model);

    const editor = page.locator(".ProseMirror");
    const variablePanel = page.getByTestId("variable-panel");
    await expect(
      variablePanel.getByRole("button", { name: /sensitivity|matters most/i }),
    ).toHaveCount(0);

    const profitLine = editor
      .locator("p")
      .filter({ hasText: "profit = revenue" })
      .first();
    const profitChip = profitLine.locator(".semantic-result-display").first();
    await expect(profitChip).toContainText("3,000 EUR");
    await profitChip.hover();
    await profitChip.locator(".semantic-result-menu").click();

    const menu = page.getByRole("menu", { name: /Actions for result/ });
    const action = menu.getByRole("menuitem", {
      name: "See what matters most",
    });
    await expect(action).toBeEnabled();
    await expect(action).toHaveAttribute(
      "title",
      "Vary 4 root inputs by ±10%, one at a time",
    );
    await action.click();

    let analysis = profitLine.locator(
      '.semantic-sensitivity-analysis[data-sensitivity-target="profit"]',
    );
    await expect(analysis).toBeVisible();
    await expect(analysis).toHaveAttribute("data-sensitivity-input-count", "4");
    await expect(analysis).toHaveAttribute(
      "data-sensitivity-top-input",
      "price",
    );
    await expect(analysis).toContainText("What matters most · profit");
    await expect(analysis).toContainText("±10% · one input at a time");
    await expect(analysis).toContainText("Live result 3,000 EUR");

    const rows = analysis.locator(".semantic-sensitivity-row");
    await expect(rows).toHaveCount(4);
    await expect(rows.nth(0)).toHaveAttribute(
      "data-sensitivity-input",
      "price",
    );
    await expect(rows.nth(1)).toHaveAttribute(
      "data-sensitivity-input",
      "customers",
    );
    await expect(rows.nth(0)).toContainText("2,500 EUR");
    await expect(rows.nth(0)).toContainText("3,500 EUR");
    await expect(rows.nth(1)).toContainText("2,600 EUR");
    await expect(rows.nth(1)).toContainText("3,400 EUR");

    await setEditorText(
      page,
      model.replace("price = 50 EUR", "price = 60 EUR"),
    );

    analysis = page.locator(
      '.ProseMirror .semantic-sensitivity-analysis[data-sensitivity-target="profit"]',
    );
    await expect(analysis).toContainText("Live result 4,000 EUR");
    await expect(
      analysis.locator('[data-sensitivity-input="price"]'),
    ).toContainText("3,400 EUR");
    await expect(
      analysis.locator('[data-sensitivity-input="price"]'),
    ).toContainText("4,600 EUR");

    const marginLine = page
      .locator(".ProseMirror p")
      .filter({ hasText: "margin = profit" })
      .first();
    const marginChip = marginLine.locator(".semantic-result-display").first();
    await marginChip.hover();
    await marginChip.locator(".semantic-result-menu").click();
    await page
      .getByRole("menu", { name: /Actions for result/ })
      .getByRole("menuitem", { name: "Move sensitivity here" })
      .click();
    await expect(
      marginLine.locator(
        '.semantic-sensitivity-analysis[data-sensitivity-target="margin"]',
      ),
    ).toBeVisible();
    await expect(
      profitLine.locator(".semantic-sensitivity-analysis"),
    ).toHaveCount(0);

    await page.reload();
    await waitForEditorReady(page);
    await waitForUIRenderComplete(page);
    analysis = page.locator(
      '.ProseMirror .semantic-sensitivity-analysis[data-sensitivity-target="margin"]',
    );
    await expect(analysis).toBeVisible();
    await expect(analysis).toContainText("What matters most · margin");

    await analysis
      .getByRole("button", { name: "Hide sensitivity analysis" })
      .click();
    await expect(
      page.locator(".ProseMirror .semantic-sensitivity-analysis"),
    ).toHaveCount(0);
  });
});
