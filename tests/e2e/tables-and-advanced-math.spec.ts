import { expect, test } from "@playwright/test";
import {
  clearEditor,
  setEditorText,
  waitForEditorReady,
  waitForUIRenderComplete,
} from "./utils";

test.describe("Tables and advanced mathematics", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForEditorReady(page);
    await clearEditor(page);
  });

  test("turns a spreadsheet paste into an editable table, derives a column, and plots it", async ({
    page,
  }) => {
    await page.locator(".ProseMirror").click();
    await page.evaluate(() => {
      const clipboard = new DataTransfer();
      clipboard.setData(
        "text/plain",
        "item\tqty\tprice\nA\t12\t9 EUR\nB\t5\t14 EUR"
      );
      const event = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: clipboard,
      });
      document.querySelector(".ProseMirror")?.dispatchEvent(event);
    });
    await waitForUIRenderComplete(page);

    await expect(page.locator(".ProseMirror")).toContainText("Pasted data:");
    await expect(page.locator(".smartpad-table-title")).toHaveCount(1);
    await expect(page.locator(".smartpad-table-header-row")).toContainText(
      "item | qty | price"
    );
    await expect(page.locator(".smartpad-table-data-row")).toHaveCount(2);
    await expect(page.locator(".semantic-result-value").filter({ hasText: "2 rows × 3 columns" })).toBeVisible();

    const lastLine = page.locator(".ProseMirror p").last();
    await lastLine.click();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await page.keyboard.insertText(
      "Pasted data.total = Pasted data.qty * Pasted data.price\nsum(Pasted data.total) =>\n@view scatter x=Pasted data.qty y=Pasted data.total"
    );
    await waitForUIRenderComplete(page);

    await expect(page.locator(".semantic-result-value").filter({ hasText: "108 EUR, 70 EUR" })).toBeVisible();
    await expect(page.locator(".semantic-result-value").filter({ hasText: "178 EUR" })).toBeVisible();
    await expect(page.locator(".plot-view-scatter-dot")).toHaveCount(2);
    await expect(page.locator(".semantic-error-result")).toHaveCount(0);
    await expect(page.locator(".variable-panel")).not.toContainText("Pasted data.qty");
  });

  test("renders reusable matrix, complex, and symbolic results without leaving the sheet", async ({
    page,
  }) => {
    await setEditorText(
      page,
      [
        "A = [[1, 2], [3, 4]]",
        "det(A) =>",
        "inv(A) =>",
        "z = 3 + 4i",
        "z * (2 - i) =>",
        "derive(x^3 + sin(x), x) =>",
        "factor(x^2 - 5*x + 6) =>",
        "roots(x^2 - 5*x + 6, x) =>",
      ].join("\n")
    );

    const results = page.locator(".semantic-result-value");
    await expect(results.filter({ hasText: /^-2$/ })).toBeVisible();
    await expect(results.filter({ hasText: /^\[-2, 1; 1\.5, -0\.5\]$/ })).toBeVisible();
    await expect(results.filter({ hasText: /^10 \+ 5i$/ })).toBeVisible();
    await expect(results.filter({ hasText: /^3 \* x \^ 2 \+ cos\(x\)$/ })).toBeVisible();
    await expect(results.filter({ hasText: /^\(-2 \+ x\) \* \(-3 \+ x\)$/ })).toBeVisible();
    await expect(results.filter({ hasText: /^2, 3$/ })).toBeVisible();
    await expect(page.locator(".semantic-error-result")).toHaveCount(0);
  });

  test("keeps the native number scrubber live inside table cells", async ({ page }) => {
    await setEditorText(
      page,
      [
        "Orders:",
        "  item | qty | price",
        "  A | 12 | 9 EUR",
        "  B | 5 | 14 EUR",
        "Orders.total = Orders.qty * Orders.price",
        "sum(Orders.total) =>",
      ].join("\n")
    );

    const quantity = page
      .locator(".smartpad-table-data-row .semantic-scrubbableNumber")
      .filter({ hasText: /^12$/ });
    const box = await quantity.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 20, startY);
    await page.mouse.up();
    await waitForUIRenderComplete(page);

    await expect(page.locator(".ProseMirror")).toContainText("A | 22 | 9 EUR");
    await expect(page.locator(".semantic-result-value").filter({ hasText: "268 EUR" })).toBeVisible();
  });
});
