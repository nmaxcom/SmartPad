import { expect, test } from "@playwright/test";
import {
  clearEditor,
  setEditorText,
  waitForEditorReady,
  waitForUIRenderComplete,
} from "./utils";

test.describe("Uncertainty, models, and inline thinking aids", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForEditorReady(page);
    await clearEditor(page);
  });

  test("keeps an uncertain model editable in text and draws its graph envelope", async ({
    page,
  }) => {
    await setEditorText(
      page,
      [
        "model Revenue(demand, price):",
        "  projected = demand * price",
        "  return projected",
        "demand = 100 ± 10",
        "price = 2",
        "forecast = Revenue(demand, price) =>",
        "@view plot x=price y=forecast domain=1..3",
      ].join("\n")
    );

    await expect(page.locator(".smartpad-model-header")).toHaveCount(1);
    await expect(page.locator(".smartpad-model-body")).toHaveCount(2);
    await expect(page.locator(".smartpad-model-return")).toContainText("return projected");
    await expect(
      page.locator(".semantic-result-value").filter({ hasText: "200  [180 – 220]" })
    ).toBeVisible();
    await expect(page.locator(".plot-view-uncertainty-band")).toHaveCount(1);
    await expect(page.locator(".semantic-error-result")).toHaveCount(0);

    const demandLine = page.locator(".ProseMirror p").nth(3);
    await expect(demandLine.locator(".semantic-scrubbableNumber")).toHaveCount(2);
    const tolerance = demandLine
      .locator(".semantic-scrubbableNumber")
      .filter({ hasText: /^10$/ });
    const box = await tolerance.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 20, y);
    await page.mouse.up();
    await waitForUIRenderComplete(page);

    await expect(demandLine).toContainText("100 ± 20");
    await expect(
      page.locator(".semantic-result-value").filter({ hasText: "200  [160 – 240]" })
    ).toBeVisible();
  });

  test("shows substitutions only at the current formula", async ({ page }) => {
    await setEditorText(
      page,
      [
        "demand = 100 ± 10",
        "price = 2",
        "revenue = demand * price =>",
        "other = 5",
      ].join("\n")
    );

    const formula = page.locator(".ProseMirror p").nth(2);
    await formula
      .locator(".semantic-variable")
      .filter({ hasText: /^demand$/ })
      .click();
    await expect(formula.locator(".smartpad-substitution-lens")).toContainText(
      "(100 ± 10) * 2"
    );
    await expect(formula.locator(".smartpad-substitution-result")).toContainText(
      "200"
    );
    await expect(formula.locator(".smartpad-substitution-result")).toContainText("180 – 220");
    await expect(page.locator(".smartpad-substitution-lens")).toHaveCount(1);

    await page.locator(".ProseMirror p").last().click();
    await expect(page.locator(".smartpad-substitution-lens")).toHaveCount(0);
  });

  test("turns a numeric selection into a normal live calculation", async ({ page }) => {
    await setEditorText(page, ["first = 10", "second = 20", "third = 5"].join("\n"));

    await page.evaluate(() => {
      const editor = (window as any).tiptapEditor;
      const first = 1;
      let end = 0;
      editor.state.doc.forEach((node: any, offset: number, index: number) => {
        if (index === 2) end = offset + node.nodeSize - 1;
      });
      editor.commands.setTextSelection({ from: first, to: end });
      editor.commands.focus();
    });

    const toolbar = page.locator(".smartpad-selection-insights");
    await expect(toolbar).toBeVisible();
    await expect(toolbar).toContainText("3 numbers");
    await expect(toolbar).toContainText("Σ 35");
    await expect(toolbar).toContainText("μ 11.666667");

    await toolbar
      .locator(".smartpad-selection-insight-action")
      .filter({ hasText: /^Σ 35$/ })
      .click();
    await waitForUIRenderComplete(page);

    await expect(page.locator(".ProseMirror")).toContainText("sum(10, 20, 5) =>");
    await expect(
      page.locator(".semantic-result-value").filter({ hasText: /^35$/ })
    ).toBeVisible();
  });

  test("keeps selection actions attached to the selected text while scrolling", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 900, height: 620 });
    await page.evaluate(() => {
      const editor = (window as any).tiptapEditor;
      const lines = Array.from({ length: 80 }, () => "<p>padding = 1</p>");
      lines.splice(
        40,
        0,
        "<p>first = 10</p>",
        "<p>second = 20</p>",
        "<p>third = 5</p>"
      );
      editor.commands.setContent(lines.join(""));

      let from = 1;
      for (let index = 0; index < 40; index += 1) {
        from += editor.state.doc.child(index).nodeSize;
      }
      let to = from;
      for (let index = 40; index <= 42; index += 1) {
        to += editor.state.doc.child(index).nodeSize;
      }
      editor.commands.setTextSelection({ from, to: to - 1 });
      editor.commands.focus();

      const scroller = [
        document.querySelector<HTMLElement>(".editor-content"),
        document.querySelector<HTMLElement>(".editor-card-container"),
      ].reduce<HTMLElement | null>((best, candidate) => {
        if (!candidate) return best;
        const range = candidate.scrollHeight - candidate.clientHeight;
        const bestRange = best ? best.scrollHeight - best.clientHeight : -1;
        return range > bestRange ? candidate : best;
      }, null);
      const anchor = editor.view.coordsAtPos(to - 1);
      if (scroller) scroller.scrollTop += anchor.top - window.innerHeight / 2;
    });

    const toolbar = page.locator(".smartpad-selection-insights");
    await expect(toolbar).toBeVisible();
    const before = await page.evaluate(() => {
      const editor = (window as any).tiptapEditor;
      return {
        toolbarTop: document
          .querySelector(".smartpad-selection-insights")!
          .getBoundingClientRect().top,
        anchorTop: editor.view.coordsAtPos(editor.state.selection.to).top,
      };
    });

    await page.evaluate(() => {
      const scroller = [
        document.querySelector<HTMLElement>(".editor-content"),
        document.querySelector<HTMLElement>(".editor-card-container"),
      ].reduce<HTMLElement | null>((best, candidate) => {
        if (!candidate) return best;
        const range = candidate.scrollHeight - candidate.clientHeight;
        const bestRange = best ? best.scrollHeight - best.clientHeight : -1;
        return range > bestRange ? candidate : best;
      }, null);
      if (scroller) scroller.scrollTop += 60;
    });

    await expect
      .poll(() => toolbar.evaluate((element) => element.getBoundingClientRect().top))
      .toBeLessThan(before.toolbarTop - 20);
    const after = await page.evaluate(() => {
      const editor = (window as any).tiptapEditor;
      return {
        toolbarTop: document
          .querySelector(".smartpad-selection-insights")!
          .getBoundingClientRect().top,
        anchorTop: editor.view.coordsAtPos(editor.state.selection.to).top,
      };
    });
    expect(after.toolbarTop - before.toolbarTop).toBeCloseTo(
      after.anchorTop - before.anchorTop,
      0
    );
  });
});
