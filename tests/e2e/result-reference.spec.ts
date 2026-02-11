import { expect, test } from "@playwright/test";
import { waitForUIRenderComplete } from "./utils";

const getLineIdAtSelection = async (page: any) =>
  page.evaluate(() => {
    const selection = window.getSelection();
    const anchor = selection?.anchorNode as Node | null;
    const paragraph =
      anchor instanceof Element ? anchor.closest("p[data-line-id]") : anchor?.parentElement?.closest("p[data-line-id]");
    return paragraph?.getAttribute("data-line-id") || "";
  });

test.describe("Result References", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="smart-pad-editor"]');
  });

  test("clicking a result chip inserts an invisible structured reference at caret", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("100 + 20 =>");
    await page.keyboard.press("Enter");
    await page.keyboard.type(" ");
    await waitForUIRenderComplete(page);

    const taxLine = page.locator(".ProseMirror p").nth(1);
    await taxLine.click({ position: { x: 15, y: 8 } });
    const sourceChip = page.locator(".ProseMirror p").first().locator(".semantic-result-display");
    await expect(sourceChip).toHaveCount(1);
    await sourceChip.click();
    await page.keyboard.type(" / 2");
    await waitForUIRenderComplete(page);

    await expect(taxLine.locator(".semantic-reference-chip")).toHaveCount(1);
    await expect(taxLine.locator(".semantic-reference-chip").first()).toHaveText("120");
    await expect(page.locator(".semantic-live-result-display").last()).toHaveAttribute(
      "data-result",
      "60"
    );
    await expect(page.locator(".ProseMirror")).not.toContainText("@L");
  });

  test("drag/drop and copy/paste preserve reference chips", async ({ page }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("100 + 20 =>");
    await page.keyboard.press("Enter");
    await page.keyboard.type(" ");
    await page.keyboard.press("Enter");
    await page.keyboard.type(" ");
    await waitForUIRenderComplete(page);

    const sourceChip = page.locator(".ProseMirror p").first().locator(".semantic-result-display");
    const taxLine = page.locator(".ProseMirror p").nth(1);
    const shippingLine = page.locator(".ProseMirror p").nth(2);

    await taxLine.click({ position: { x: 12, y: 8 } });
    await sourceChip.click();
    await page.keyboard.type(" / 2");
    await waitForUIRenderComplete(page);

    await sourceChip.dragTo(shippingLine);
    await page.keyboard.type(" + 10");
    await waitForUIRenderComplete(page);

    const insertedChip = taxLine.locator(".semantic-reference-chip").first();
    await insertedChip.click();
    await page.keyboard.press("ControlOrMeta+c");
    await shippingLine.click({ position: { x: 16, y: 8 } });
    await page.keyboard.press("ControlOrMeta+v");
    await page.keyboard.type(" + 5");
    await waitForUIRenderComplete(page);

    await expect(page.locator(".semantic-reference-chip")).toHaveCount(3);
    const paragraphSummary = await page.$$eval(".ProseMirror p", (paragraphs) =>
      paragraphs.map((paragraph) => ({
        chips: paragraph.querySelectorAll(".semantic-reference-chip").length,
        text: paragraph.textContent || "",
      }))
    );
    expect(
      paragraphSummary.some(
        (line) => line.chips >= 2 && /\+\s*5/.test(line.text)
      )
    ).toBeTruthy();
  });

  test("broken source marks dependent reference chip and jumps to source on click", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("100 + 20 =>");
    await page.keyboard.press("Enter");
    await page.keyboard.type(" ");
    await waitForUIRenderComplete(page);

    const taxLine = page.locator(".ProseMirror p").nth(1);
    await taxLine.click({ position: { x: 12, y: 8 } });
    const sourceChip = page.locator(".ProseMirror p").first().locator(".semantic-result-display");
    await sourceChip.click();
    await page.keyboard.type(" / 2");
    await waitForUIRenderComplete(page);

    const firstLineId = await page
      .locator(".ProseMirror p")
      .first()
      .getAttribute("data-line-id");

    await page.evaluate(() => {
      const editorInstance = (window as any).tiptapEditor;
      const { state, view } = editorInstance;
      const firstLineNode = state.doc.child(0);
      const from = 1;
      const to = from + firstLineNode.content.size;
      const tr = state.tr.replaceWith(from, to, state.schema.text("100/0 =>"));
      view.dispatch(tr);
      window.dispatchEvent(new Event("forceEvaluation"));
    });

    await waitForUIRenderComplete(page);
    await expect(taxLine.locator(".semantic-reference-chip")).toHaveCount(1);
    await expect(taxLine.locator(".semantic-reference-broken")).toHaveCount(1);
    await expect(taxLine).toContainText("source line has error");

    await taxLine.locator(".semantic-reference-chip").click();
    const selectedLineId = await getLineIdAtSelection(page);
    expect(selectedLineId).toBe(firstLineId);
  });

  test("result lane aligns chips on desktop and collapses on narrow viewport", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("1+1=>");
    await page.keyboard.press("Enter");
    await page.keyboard.type("20+3=>");
    await page.keyboard.press("Enter");
    await page.keyboard.type("300+4=>");
    await waitForUIRenderComplete(page);

    const desktopGeometry = await page.evaluate(() => {
      const lines = Array.from(document.querySelectorAll(".ProseMirror p")).slice(0, 3);
      return lines.map((line) => {
        const lineRect = (line as HTMLElement).getBoundingClientRect();
        const chip = line.querySelector(".semantic-result-display") as HTMLElement | null;
        const chipRect = chip?.getBoundingClientRect();
        return {
          lineHeight: lineRect.height,
          centerDelta: chipRect
            ? Math.abs(
                lineRect.top +
                  lineRect.height / 2 -
                  (chipRect.top + chipRect.height / 2)
              )
            : null,
        };
      });
    });
    const lineHeights = desktopGeometry.map((row) => row.lineHeight);
    const minLineHeight = Math.min(...lineHeights);
    const maxLineHeight = Math.max(...lineHeights);
    expect(maxLineHeight - minLineHeight).toBeLessThanOrEqual(2);
    desktopGeometry.forEach((row) => {
      expect(row.centerDelta).not.toBeNull();
      expect(row.centerDelta || 0).toBeLessThanOrEqual(2.5);
    });

    const desktopRightEdges = await page.$$eval(".semantic-result-display", (nodes) =>
      nodes.map((node) => {
        const rect = (node as HTMLElement).getBoundingClientRect();
        return Math.round(rect.right);
      })
    );
    const desktopSpread = Math.max(...desktopRightEdges) - Math.min(...desktopRightEdges);
    expect(desktopSpread).toBeLessThanOrEqual(8);

    await page.setViewportSize({ width: 760, height: 900 });
    await page.waitForTimeout(120);
    const narrowRightEdges = await page.$$eval(".semantic-result-display", (nodes) =>
      nodes.map((node) => {
        const rect = (node as HTMLElement).getBoundingClientRect();
        return Math.round(rect.right);
      })
    );
    const narrowSpread = Math.max(...narrowRightEdges) - Math.min(...narrowRightEdges);
    expect(narrowSpread).toBeGreaterThan(12);
  });

  test("live-result source line remains directly editable after inserting a reference chip", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("3*4");
    await page.keyboard.press("Enter");
    await page.keyboard.type(" ");
    await waitForUIRenderComplete(page);

    const sourceLine = page.locator(".ProseMirror p").first();
    const sourceLineId = await sourceLine.getAttribute("data-line-id");
    const sourceLiveChip = sourceLine.locator(".semantic-live-result-display");
    const dependentLine = page.locator(".ProseMirror p").nth(1);
    await dependentLine.click({ position: { x: 14, y: 8 } });
    await sourceLiveChip.click();
    await page.keyboard.type(" + 1 =>");
    await waitForUIRenderComplete(page);

    await sourceLine.click({ position: { x: 20, y: 8 } });
    const selectedLineId = await getLineIdAtSelection(page);
    expect(selectedLineId).toBe(sourceLineId);
  });

  test("references from live-result source lines propagate when source value changes", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("3*4");
    await page.keyboard.press("Enter");
    await page.keyboard.type(" ");
    await waitForUIRenderComplete(page);

    const sourceLiveChip = page.locator(".ProseMirror p").first().locator(".semantic-live-result-display");
    const dependentLine = page.locator(".ProseMirror p").nth(1);
    await dependentLine.click({ position: { x: 14, y: 8 } });
    await sourceLiveChip.click();
    await page.keyboard.type(" + 1 =>");
    await waitForUIRenderComplete(page);

    await expect(dependentLine.locator(".semantic-reference-chip")).toHaveCount(1);
    await expect(dependentLine.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      "13"
    );

    await page.evaluate(() => {
      const editorInstance = (window as any).tiptapEditor;
      const { state, view } = editorInstance;
      const firstLineNode = state.doc.child(0);
      const from = 1;
      const to = from + firstLineNode.content.size;
      const tr = state.tr.replaceWith(from, to, state.schema.text("3*5"));
      view.dispatch(tr);
      window.dispatchEvent(new Event("forceEvaluation"));
    });
    await waitForUIRenderComplete(page);

    await expect(page.locator(".ProseMirror p").first().locator(".semantic-live-result-display")).toHaveAttribute(
      "data-result",
      "15"
    );
    await expect(dependentLine.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      "16"
    );
  });

  test("reference chip label mirrors source result and flashes when source updates", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("3*4");
    await page.keyboard.press("Enter");
    await page.keyboard.type(" ");
    await waitForUIRenderComplete(page);

    const sourceLine = page.locator(".ProseMirror p").first();
    const sourceLiveChip = sourceLine.locator(".semantic-live-result-display");
    const dependentLine = page.locator(".ProseMirror p").nth(1);
    await dependentLine.click({ position: { x: 14, y: 8 } });
    await sourceLiveChip.click();
    await page.keyboard.type(" + 1 =>");
    await waitForUIRenderComplete(page);

    const referenceChip = dependentLine.locator(".semantic-reference-chip").first();
    await expect(referenceChip).toHaveText("12");

    await page.evaluate(() => {
      const editorInstance = (window as any).tiptapEditor;
      const { state, view } = editorInstance;
      const firstLineNode = state.doc.child(0);
      const from = 1;
      const to = from + firstLineNode.content.size;
      const tr = state.tr.replaceWith(from, to, state.schema.text("3*5"));
      view.dispatch(tr);
      window.dispatchEvent(new Event("forceEvaluation"));
    });
    await waitForUIRenderComplete(page);

    await expect(referenceChip).toHaveText("15");
    await expect(referenceChip).toHaveClass(/semantic-reference-flash/);
  });

  test("grouped-thousands reference stays numeric in dependent live math", async ({ page }) => {
    await page.evaluate(() => {
      const key = "smartpad-settings";
      const existing = JSON.parse(localStorage.getItem(key) || "{}");
      existing.groupThousands = true;
      localStorage.setItem(key, JSON.stringify(existing));
    });
    await page.reload();
    await page.waitForSelector('[data-testid="smart-pad-editor"]');

    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("known = 20");
    await page.keyboard.press("Enter");
    await page.keyboard.type("known*83");
    await page.keyboard.press("Enter");
    await page.keyboard.type(" ");
    await waitForUIRenderComplete(page);

    const sourceLine = page.locator(".ProseMirror p").nth(1);
    await sourceLine.locator(".semantic-live-result-display").click();
    await page.keyboard.type(" *3");
    await waitForUIRenderComplete(page);

    const dependentLine = page.locator(".ProseMirror p").nth(2);
    const dependentResult = dependentLine.locator(".semantic-live-result-display");
    const resultText = (await dependentResult.getAttribute("data-result")) || "";

    expect(resultText).not.toContain("*");
    await expect(dependentResult).toHaveAttribute("data-result", /4,?980/);
  });

  test("keeps operator and number highlighting aligned after inserting a reference chip", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("known = 20");
    await page.keyboard.press("Enter");
    await page.keyboard.type("known*83");
    await page.keyboard.press("Enter");
    await page.keyboard.type(" ");
    await waitForUIRenderComplete(page);

    const sourceLine = page.locator(".ProseMirror p").nth(1);
    await sourceLine.locator(".semantic-live-result-display").click();
    await page.keyboard.type(" *3");
    await waitForUIRenderComplete(page);

    const dependentLine = page.locator(".ProseMirror p").nth(2);
    await expect(dependentLine.locator(".semantic-operator", { hasText: "*" })).toBeVisible();
    await expect(dependentLine.locator(".semantic-scrubbableNumber", { hasText: "3" })).toBeVisible();
  });

  test("refresh preserves reference chips instead of exposing internal placeholders", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("100 + 20 =>");
    await page.keyboard.press("Enter");
    await page.keyboard.type(" ");
    await waitForUIRenderComplete(page);

    const sourceLine = page.locator(".ProseMirror p").first();
    const taxLine = page.locator(".ProseMirror p").nth(1);
    await taxLine.click({ position: { x: 16, y: 8 } });
    await sourceLine.locator(".semantic-result-display").click();
    await page.keyboard.type(" / 2 =>");
    await waitForUIRenderComplete(page);

    await expect(taxLine.locator(".semantic-reference-chip")).toHaveCount(1);
    await page.reload();
    await page.waitForSelector('[data-testid="smart-pad-editor"]');
    await waitForUIRenderComplete(page);

    const reloadedTaxLine = page.locator(".ProseMirror p").nth(1);
    await expect(reloadedTaxLine.locator(".semantic-reference-chip")).toHaveCount(1);
    await expect(reloadedTaxLine.locator(".semantic-reference-chip").first()).toHaveText("120");
    await expect(page.locator(".ProseMirror")).not.toContainText("__sp_ref_");
  });

  test("chip insert mode value inserts plain value instead of reference chip", async ({ page }) => {
    await page.evaluate(() => {
      const key = "smartpad-settings";
      const existing = JSON.parse(localStorage.getItem(key) || "{}");
      existing.chipInsertMode = "value";
      localStorage.setItem(key, JSON.stringify(existing));
    });
    await page.reload();
    await page.waitForSelector('[data-testid="smart-pad-editor"]');

    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("3*4");
    await page.keyboard.press("Enter");
    await page.keyboard.type(" ");
    await waitForUIRenderComplete(page);

    const sourceLine = page.locator(".ProseMirror p").first();
    const dependentLine = page.locator(".ProseMirror p").nth(1);
    await dependentLine.click({ position: { x: 14, y: 8 } });
    await sourceLine.locator(".semantic-live-result-display").click();
    await page.keyboard.type("+1");
    await waitForUIRenderComplete(page);

    await expect(dependentLine.locator(".semantic-reference-chip")).toHaveCount(0);
    await expect(dependentLine).toContainText(/12\s*\+\s*1/);
    await expect(dependentLine.locator(".semantic-live-result-display")).toHaveAttribute(
      "data-result",
      "13"
    );
  });

  test("reference text export mode controls plain text serializer output", async ({ page }) => {
    const getClipboardText = async () =>
      page.evaluate(() => {
        const editor = (window as any).tiptapEditor;
        if (!editor) return "";
        editor.commands.focus();
        editor.commands.selectAll();
        const slice = editor.state.selection.content();
        const serializer = editor.view?.someProp?.("clipboardTextSerializer");
        return typeof serializer === "function" ? serializer(slice) : "";
      });

    const seedReference = async () => {
      const editor = page.locator('[data-testid="smart-pad-editor"]');
      await editor.click();
      await page.keyboard.type("100 + 20 =>");
      await page.keyboard.press("Enter");
      await page.keyboard.type(" ");
      await waitForUIRenderComplete(page);
      const sourceLine = page.locator(".ProseMirror p").first();
      const dependentLine = page.locator(".ProseMirror p").nth(1);
      await dependentLine.click({ position: { x: 14, y: 8 } });
      await sourceLine.locator(".semantic-result-display").click();
      await page.keyboard.type(" / 2 =>");
      await waitForUIRenderComplete(page);
    };

    await seedReference();
    const preserveText = await getClipboardText();
    expect(preserveText).toContain("__sp_ref_");

    await page.evaluate(() => {
      const key = "smartpad-settings";
      const existing = JSON.parse(localStorage.getItem(key) || "{}");
      existing.referenceTextExportMode = "readable";
      localStorage.setItem(key, JSON.stringify(existing));
    });
    await page.reload();
    await page.waitForSelector('[data-testid="smart-pad-editor"]');
    await seedReference();
    const readableText = await getClipboardText();
    expect(readableText).not.toContain("__sp_ref_");
    expect(readableText).toContain("120");
  });
});
