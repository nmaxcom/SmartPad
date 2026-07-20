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

test.describe("Inline result explorer", () => {
  test("connects source, assumptions, insights, intent syntax, and direct manipulation", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      if (!window.sessionStorage.getItem("sensitivity-test-cleaned")) {
        window.localStorage.removeItem("smartpad-sensitivity-analyses-v1");
        window.localStorage.removeItem("smartpad-number-scrub-hint-v1");
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

    const priceLiteral = editor
      .locator("p")
      .filter({ hasText: "price = 50 EUR" })
      .locator(".semantic-scrubbableNumber")
      .first();
    await priceLiteral.hover();
    await expect(page.locator(".number-scrub-discovery-hint")).toContainText(
      "Drag ↔ to change",
    );

    const profitLine = editor
      .locator("p")
      .filter({ hasText: "profit = revenue" })
      .first();
    const profitChip = profitLine.locator(".semantic-result-display").first();
    await expect(profitChip).toContainText("3,000 EUR");
    await profitChip.hover();
    await profitChip.locator(".semantic-result-menu").click();

    const menu = page.getByRole("menu", { name: /Actions for result/ });
    await expect(menu).toBeVisible();
    const action = menu.getByRole("menuitem", { name: /explor/i }).first();
    await expect(action).toBeEnabled();
    await expect(action).toHaveAttribute(
      "title",
      "Open one inline place to understand and manipulate this result",
    );
    await action.click();

    let explorer = profitLine.locator(
      '.semantic-sensitivity-analysis[data-sensitivity-target="profit"]',
    );
    await expect(explorer).toBeVisible();
    await expect(explorer).toHaveAttribute("data-sensitivity-input-count", "4");
    await expect(explorer).toHaveAttribute(
      "data-sensitivity-top-input",
      "price",
    );
    await expect(explorer).toContainText("Explore · profit");
    await expect(explorer).toContainText("Now3,000 EUR");
    await expect(explorer).toContainText(
      "profit = revenue - variable costs - fixed costs",
    );
    await explorer
      .getByRole("button", { name: /Go to source: profit equals/ })
      .click();
    await expect(profitLine).toHaveClass(/semantic-source-line-highlight/);
    await expect(
      explorer.locator('[data-explorer-insight="strongest-driver"]'),
    ).toContainText("price is the strongest local driver");
    await expect(
      explorer.locator('[data-explorer-insight="break-even"]'),
    ).toContainText("price = 20 EUR");

    const rows = explorer.locator(".semantic-sensitivity-row");
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

    const priceValue = explorer.locator(
      '[data-sensitivity-input="price"] .semantic-explorer-input-value',
    );
    await expect(priceValue).toContainText("50 EUR");
    const priceBox = await priceValue.boundingBox();
    expect(priceBox).not.toBeNull();
    await page.mouse.move(
      (priceBox?.x || 0) + (priceBox?.width || 0) / 2,
      (priceBox?.y || 0) + (priceBox?.height || 0) / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      (priceBox?.x || 0) + (priceBox?.width || 0) / 2 + 40,
      (priceBox?.y || 0) + (priceBox?.height || 0) / 2,
      { steps: 4 },
    );
    await page.mouse.up();
    await expect(editor.locator("p").filter({ hasText: "price = 60 EUR" })).toBeVisible();
    await expect(profitChip).toContainText("4,000 EUR");

    explorer = profitLine.locator(
      '.semantic-sensitivity-analysis[data-sensitivity-target="profit"]',
    );
    await explorer.getByRole("button", { name: "Ask in plain language…" }).click();
    const prompt = explorer.getByRole("textbox", {
      name: "Describe what you want SmartPad to do",
    });
    const proposedSyntax = explorer.getByRole("textbox", {
      name: "Editable SmartPad syntax proposal",
    });
    await prompt.fill("grafica profit según price");
    await expect(proposedSyntax).toHaveValue(
      "@view plot x=price y=profit size=md",
    );
    await explorer.getByRole("button", { name: "Insert" }).click();
    await expect(
      editor.locator("p").filter({
        hasText: "@view plot x=price y=profit size=md",
      }),
    ).toBeVisible();

    const currentPoint = page.locator(".plot-view-current-dot").first();
    await expect(currentPoint).toBeVisible();
    await expect(page.locator(".plot-view-direct-overlay").first()).toContainText(
      "Drag ● ↔ to change price",
    );
    const curvePath = await page.locator(".plot-view-line").first().getAttribute("d");
    const curveYValues = Array.from(
      curvePath?.matchAll(/[ML]\s*[-\d.]+[ ,]+([-\d.]+)/g) || [],
      (match) => Number(match[1]).toFixed(2),
    );
    expect(new Set(curveYValues).size).toBeGreaterThan(1);
    await currentPoint.scrollIntoViewIfNeeded();
    const pointBox = await currentPoint.boundingBox();
    expect(pointBox).not.toBeNull();
    await page.mouse.move(
      (pointBox?.x || 0) + (pointBox?.width || 0) / 2,
      (pointBox?.y || 0) + (pointBox?.height || 0) / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      (pointBox?.x || 0) + (pointBox?.width || 0) / 2 + 70,
      (pointBox?.y || 0) + (pointBox?.height || 0) / 2,
      { steps: 5 },
    );
    await page.mouse.up();
    await expect(page.locator(".plot-view-scrub-chip")).toHaveCount(0);
    await expect(editor.locator("p").filter({ hasText: /^price =/ })).not.toContainText(
      "price = 60 EUR",
    );

    await setEditorText(
      page,
      model.replace("price = 50 EUR", "price = 60 EUR"),
    );

    explorer = page.locator(
      '.ProseMirror .semantic-sensitivity-analysis[data-sensitivity-target="profit"]',
    );
    await expect(explorer).toContainText("Now4,000 EUR");
    await expect(
      explorer.locator('[data-sensitivity-input="price"]'),
    ).toContainText("3,400 EUR");
    await expect(
      explorer.locator('[data-sensitivity-input="price"]'),
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
      .getByRole("menuitem", { name: "Explore this result instead" })
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
    explorer = page.locator(
      '.ProseMirror .semantic-sensitivity-analysis[data-sensitivity-target="margin"]',
    );
    await expect(explorer).toBeVisible();
    await expect(explorer).toContainText("Explore · margin");

    await explorer
      .getByRole("button", { name: "Close result explorer" })
      .click();
    await expect(
      page.locator(".ProseMirror .semantic-sensitivity-analysis"),
    ).toHaveCount(0);
  });
});
