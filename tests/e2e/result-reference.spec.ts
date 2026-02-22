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

const dispatchResultDrop = async (
  page: any,
  options: { sourceLineIndex?: number; targetLineIndex?: number; dropAtBottom?: boolean } = {}
) => {
  await page.evaluate(({ sourceLineIndex, targetLineIndex, dropAtBottom }) => {
    const editor = document.querySelector('[data-testid="smart-pad-editor"] .ProseMirror') as HTMLElement | null;
    if (!editor) return;

    const paragraphs = Array.from(document.querySelectorAll(".ProseMirror p")) as HTMLElement[];
    const sourceLine = paragraphs[sourceLineIndex || 0] || paragraphs[0];
    const sourceChip = (sourceLine?.querySelector(
      ".semantic-live-result-display, .semantic-result-display"
    ) ||
      document.querySelector(
        ".ProseMirror .semantic-live-result-display, .ProseMirror .semantic-result-display"
      )) as HTMLElement | null;
    if (!sourceChip) return;

    const payload = {
      sourceLineId: String(sourceChip.getAttribute("data-source-line-id") || "").trim(),
      sourceLine: Number(sourceChip.getAttribute("data-source-line") || 0),
      sourceLabel: String(sourceChip.getAttribute("data-source-label") || "").trim() || "value",
      sourceValue: String(sourceChip.getAttribute("data-result") || "").trim(),
      placeholderKey: String(sourceChip.getAttribute("data-placeholder-key") || "").trim() || undefined,
    };
    const dt = new DataTransfer();
    dt.setData("application/x-smartpad-result-reference", JSON.stringify(payload));

    let dropTarget: HTMLElement = editor;
    let clientX = 24;
    let clientY = 24;

    if (dropAtBottom) {
      const rect = editor.getBoundingClientRect();
      clientX = rect.left + Math.max(24, rect.width * 0.25);
      clientY = rect.bottom - 8;
    } else {
      const targetLine = paragraphs[targetLineIndex || 1] || paragraphs[paragraphs.length - 1];
      if (!targetLine) return;
      const rect = targetLine.getBoundingClientRect();
      dropTarget = targetLine;
      clientX = Math.max(rect.left + 24, rect.right - 10);
      clientY = rect.top + Math.max(8, rect.height * 0.5);
    }

    dropTarget.dispatchEvent(
      new DragEvent("dragover", {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
        clientX,
        clientY,
      })
    );
    dropTarget.dispatchEvent(
      new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
        clientX,
        clientY,
      })
    );
  }, options);
};

test.describe("Result References", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="smart-pad-editor"]');
    await page.evaluate(() => {
      const key = "smartpad-settings";
      const existing = JSON.parse(localStorage.getItem(key) || "{}");
      localStorage.setItem(
        key,
        JSON.stringify({
          ...existing,
          liveResultEnabled: true,
          groupThousands: false,
          resultLaneEnabled: false,
          chipInsertMode: "reference",
          referenceTextExportMode: "preserve",
        })
      );
    });
    await page.reload();
    await page.waitForSelector('[data-testid="smart-pad-editor"]');
    await page.evaluate(() => {
      const editor = (window as any).tiptapEditor;
      if (!editor) return;
      editor.commands.setContent("<p></p>");
      window.dispatchEvent(new Event("forceEvaluation"));
    });
    await waitForUIRenderComplete(page);
    await expect(page.locator(".ProseMirror p").first()).toHaveText("");
    await page.evaluate(() => {
      const editor = (window as any).tiptapEditor;
      if (!editor) return;
      editor.commands.setContent("<p></p>");
      window.dispatchEvent(new Event("forceEvaluation"));
    });
    await waitForUIRenderComplete(page);
  });

  test("dragging a result chip inserts an invisible structured reference at caret", async ({
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
    await expect(page.locator(".ProseMirror p").first().locator(".semantic-result-display")).toHaveCount(1);
    await dispatchResultDrop(page, { targetLineIndex: 1 });
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

  test("dragging a live result from the same source line inserts chip on a new line", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("max(3, 7) * 1492429");
    await waitForUIRenderComplete(page);

    const line = page.locator(".ProseMirror p").first();
    const liveChip = line.locator(".semantic-live-result-display");
    await expect(liveChip).toHaveCount(1);

    await dispatchResultDrop(page, { sourceLineIndex: 0, dropAtBottom: true });
    await waitForUIRenderComplete(page);

    const secondLine = page.locator(".ProseMirror p").nth(1);
    await expect(secondLine.locator(".semantic-reference-chip")).toHaveCount(1);
    await expect(secondLine.locator(".semantic-reference-chip").first()).toHaveText("10447003");
    await expect(line).not.toContainText("source line has error");
    await expect(secondLine).not.toContainText("source line has error");
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

    const taxLine = page.locator(".ProseMirror p").nth(1);
    const shippingLine = page.locator(".ProseMirror p").nth(2);

    await taxLine.click({ position: { x: 12, y: 8 } });
    await dispatchResultDrop(page, { targetLineIndex: 1 });
    await page.keyboard.type(" / 2");
    await waitForUIRenderComplete(page);

    await dispatchResultDrop(page, { targetLineIndex: 2 });
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
        (line) => line.chips >= 2
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
    await dispatchResultDrop(page, { targetLineIndex: 1 });
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
    await page.evaluate(() => {
      const key = "smartpad-settings";
      const existing = JSON.parse(localStorage.getItem(key) || "{}");
      existing.resultLaneEnabled = true;
      localStorage.setItem(key, JSON.stringify(existing));
    });
    await page.reload();
    await page.waitForSelector('[data-testid="smart-pad-editor"]');
    await page.evaluate(() => {
      const editor = (window as any).tiptapEditor;
      if (!editor) return;
      editor.commands.setContent("<p></p>");
      window.dispatchEvent(new Event("forceEvaluation"));
    });
    await waitForUIRenderComplete(page);
    await expect(page.locator(".ProseMirror p").first()).toHaveText("");

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
    desktopGeometry.forEach((row) => {
      expect(row.centerDelta).not.toBeNull();
      expect(row.centerDelta || 0).toBeLessThanOrEqual(4);
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
    const dependentLine = page.locator(".ProseMirror p").nth(1);
    await dependentLine.click({ position: { x: 14, y: 8 } });
    await dispatchResultDrop(page, { targetLineIndex: 1 });
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

    const dependentLine = page.locator(".ProseMirror p").nth(1);
    await dependentLine.click({ position: { x: 14, y: 8 } });
    await dispatchResultDrop(page, { targetLineIndex: 1 });
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
    const dependentLine = page.locator(".ProseMirror p").nth(1);
    await dependentLine.click({ position: { x: 14, y: 8 } });
    await dispatchResultDrop(page, { targetLineIndex: 1 });
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

  test("drag-inserting a standalone reference does not also render a duplicate live result", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("future value = principal * rate =>");
    await page.keyboard.press("Enter");
    await page.keyboard.type(" ");
    await waitForUIRenderComplete(page);

    const targetLine = page.locator(".ProseMirror p").nth(1);
    await targetLine.click({ position: { x: 14, y: 8 } });
    await dispatchResultDrop(page, { targetLineIndex: 1 });
    await waitForUIRenderComplete(page);

    await expect(targetLine.locator(".semantic-reference-chip")).toHaveCount(1);
    await expect(targetLine.locator(".semantic-live-result-display")).toHaveCount(0);
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
    await page.getByLabel("Create new sheet").click();
    await waitForUIRenderComplete(page);

    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("known = 20");
    await page.keyboard.press("Enter");
    await page.keyboard.type("known*83 =>");
    await page.keyboard.press("Enter");
    await page.keyboard.type(" ");
    await waitForUIRenderComplete(page);

    await expect(page.locator(".semantic-result-display").first()).toHaveCount(1);
    await dispatchResultDrop(page, { targetLineIndex: 2 });
    await page.keyboard.type(" *3");
    await waitForUIRenderComplete(page);

    const dependentLine = page.locator(".ProseMirror p", { hasText: "*3" }).first();
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
    await dispatchResultDrop(page, { sourceLineIndex: 1, targetLineIndex: 2 });
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
    await dispatchResultDrop(page, { targetLineIndex: 1 });
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
    await page.getByLabel("Create new sheet").click();
    await waitForUIRenderComplete(page);

    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("3*4 =>");
    await page.keyboard.press("Enter");
    await page.keyboard.type(" ");
    await waitForUIRenderComplete(page);

    const dependentLine = page.locator(".ProseMirror p").last();
    await dependentLine.click({ position: { x: 14, y: 8 } });
    await expect(page.locator(".semantic-result-display").first()).toHaveCount(1);
    await dispatchResultDrop(page, { targetLineIndex: 1 });
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
      await dispatchResultDrop(page, { targetLineIndex: 1 });
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

  test("typing '=' before completing '=>' on a reference expression does not leak placeholder gibberish", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("25 C to K");
    await page.keyboard.press("Enter");
    await page.keyboard.type(" ");
    await waitForUIRenderComplete(page);

    const targetLine = page.locator(".ProseMirror p").nth(1);
    await targetLine.click({ position: { x: 14, y: 8 } });
    await dispatchResultDrop(page, { targetLineIndex: 1 });
    await page.keyboard.type(" + ");
    await dispatchResultDrop(page, { targetLineIndex: 1 });
    await waitForUIRenderComplete(page);

    await expect(targetLine.locator(".semantic-live-result-display").last()).toHaveAttribute(
      "data-result",
      /596\.3.*K/
    );

    await page.keyboard.type("=");
    await waitForUIRenderComplete(page);
    await expect(targetLine).not.toContainText("__sp_ref_");
    await expect(targetLine.locator(".semantic-live-result-display")).toHaveCount(0);

    await page.keyboard.type(">");
    await waitForUIRenderComplete(page);

    await expect(targetLine).not.toContainText("__sp_ref_");
    await expect(targetLine.locator(".semantic-error-result")).toHaveCount(0);
    await expect(targetLine.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /596\.3.*K/
    );
  });

  test("copy/paste with mixed lines and reference chips keeps whole selection content", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("100 + 20 =>");
    await page.keyboard.press("Enter");
    await page.keyboard.type(" ");
    await waitForUIRenderComplete(page);

    const line2 = page.locator(".ProseMirror p").nth(1);
    await line2.click({ position: { x: 16, y: 8 } });
    await dispatchResultDrop(page, { targetLineIndex: 1 });
    await page.keyboard.type(" + 5 =>");
    await waitForUIRenderComplete(page);

    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.press("ControlOrMeta+c");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await page.keyboard.press("ControlOrMeta+v");
    await waitForUIRenderComplete(page);

    const paragraphTexts = await page.$$eval(".ProseMirror p", (paragraphs) =>
      paragraphs.map((p) => (p.textContent || "").trim()).filter(Boolean)
    );
    expect(paragraphTexts.some((line) => line.includes("100 + 20 =>"))).toBeTruthy();
    expect(paragraphTexts.some((line) => line.includes("+ 5 =>"))).toBeTruthy();
    await expect(page.locator(".semantic-reference-chip")).toHaveCount(2);
  });

  test("select-all copy with chips does not collapse clipboard text to a single placeholder", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("100 + 20 =>");
    await page.keyboard.press("Enter");
    await page.keyboard.type(" ");
    await waitForUIRenderComplete(page);

    const line2 = page.locator(".ProseMirror p").nth(1);
    await line2.click({ position: { x: 16, y: 8 } });
    await dispatchResultDrop(page, { targetLineIndex: 1 });
    await page.keyboard.type(" + 5 =>");
    await waitForUIRenderComplete(page);

    const copiedText = await page.evaluate(() => {
      const editorInstance = (window as any).tiptapEditor;
      if (!editorInstance) return "";
      editorInstance.commands.focus();
      editorInstance.commands.selectAll();
      const clipboard = new DataTransfer();
      const evt = new ClipboardEvent("copy", { clipboardData: clipboard });
      editorInstance.view.dom.dispatchEvent(evt);
      return clipboard.getData("text/plain");
    });

    expect(copiedText).toContain("100 + 20 =>");
    expect(copiedText).toContain("+ 5 =>");
    expect(copiedText.trim()).not.toMatch(/^__sp_ref_[a-z0-9]+__$/i);
  });

  test("live preview renders for phrase percentage unit expressions without =>", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("10% of 155 N");
    await waitForUIRenderComplete(page);

    await expect(page.locator(".ProseMirror p").first().locator(".semantic-live-result-display")).toHaveAttribute(
      "data-result",
      /15\.5\s*N/
    );
  });

  test("drag-inserted reference used in explicit trigger expression keeps a single reference token", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("PI * 9.2");
    await page.keyboard.press("Enter");
    await page.keyboard.type(" ");
    await waitForUIRenderComplete(page);

    const dependent = page.locator(".ProseMirror p").nth(1);
    await dependent.click({ position: { x: 16, y: 8 } });
    await dispatchResultDrop(page, { targetLineIndex: 1 });
    await page.keyboard.type("*2=>");
    await waitForUIRenderComplete(page);

    await expect(dependent.locator(".semantic-reference-chip")).toHaveCount(1);
    await expect(dependent.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /57\.8/
    );

    const nodeSummary = await page.evaluate(() => {
      const editorInstance = (window as any).tiptapEditor;
      if (!editorInstance) return null;
      const paragraph = editorInstance.state.doc.child(1);
      const parts: string[] = [];
      let referenceCount = 0;
      paragraph.forEach((node: any) => {
        if (node.type?.name === "referenceToken") {
          parts.push("ref");
          referenceCount += 1;
        }
        if (node.isText) parts.push(node.text || "");
      });
      return { parts, referenceCount };
    });
    expect(nodeSummary?.referenceCount).toBe(1);
    expect(nodeSummary?.parts.join("")).toContain(" *2=>");
    expect(nodeSummary?.parts.join("")).not.toContain("28.928.9");
  });

  test("completing => after an intermediate '=' does not duplicate chip value text", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("PI * 10");
    await page.keyboard.press("Enter");
    await page.keyboard.type(" ");
    await waitForUIRenderComplete(page);

    const dependent = page.locator(".ProseMirror p").nth(1);
    await dependent.click({ position: { x: 16, y: 8 } });
    await dispatchResultDrop(page, { targetLineIndex: 1 });
    await page.keyboard.type("*2=");
    await waitForUIRenderComplete(page);
    await page.keyboard.type(">");
    await waitForUIRenderComplete(page);

    await expect(dependent.locator(".semantic-reference-chip")).toHaveCount(1);
    await expect(dependent.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /62\.84/
    );
    await expect(dependent).not.toContainText("__sp_ref_");

    const nodeSummary = await page.evaluate(() => {
      const editorInstance = (window as any).tiptapEditor;
      if (!editorInstance) return null;
      const paragraph = editorInstance.state.doc.child(1);
      let referenceCount = 0;
      let literalText = "";
      paragraph.forEach((node: any) => {
        if (node.type?.name === "referenceToken") {
          referenceCount += 1;
        } else if (node.isText) {
          literalText += node.text || "";
        }
      });
      return { referenceCount, literalText };
    });
    expect(nodeSummary?.referenceCount).toBe(1);
    expect(nodeSummary?.literalText).toContain("*2=>");
    expect(nodeSummary?.literalText.replace(/\s+/g, "")).not.toContain("31.4231.42");
  });

  test("typing while reference chip is node-selected inserts after chip without flattening", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("PI * 10");
    await page.keyboard.press("Enter");
    await page.keyboard.type(" ");
    await waitForUIRenderComplete(page);

    const dependent = page.locator(".ProseMirror p").nth(1);
    await dependent.click({ position: { x: 16, y: 8 } });
    await dispatchResultDrop(page, { targetLineIndex: 1 });
    await waitForUIRenderComplete(page);

    await dependent.locator(".semantic-reference-chip").first().click();
    await page.keyboard.type("*2=>");
    await waitForUIRenderComplete(page);

    await expect(dependent.locator(".semantic-reference-chip")).toHaveCount(1);
    await expect(dependent).not.toContainText("__sp_ref_");
    await expect(dependent).not.toContainText("31.4231.42");
    await expect(dependent.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /62\.84/
    );
  });

  test("selected reference chip typing ignores accidental echoed chip label prefix", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("PI*10");
    await waitForUIRenderComplete(page);

    await dispatchResultDrop(page, { sourceLineIndex: 0, dropAtBottom: true });
    await waitForUIRenderComplete(page);

    const dependent = page.locator(".ProseMirror p").nth(1);
    const chip = dependent.locator(".semantic-reference-chip").first();
    await chip.click();
    await page.keyboard.type("31.42 *2=>");
    await waitForUIRenderComplete(page);

    await expect(dependent.locator(".semantic-reference-chip")).toHaveCount(1);
    await expect(dependent).not.toContainText("31.4231.42");
    await expect(dependent.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /62\.84/
    );
  });

  test("reference chip does not get synthetic duplicate value via semantic-error::after", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("PI*10");
    await waitForUIRenderComplete(page);

    await dispatchResultDrop(page, { sourceLineIndex: 0, dropAtBottom: true });
    await page.keyboard.type("*2=>");
    await waitForUIRenderComplete(page);

    const dependent = page.locator(".ProseMirror p").nth(1);
    const chip = dependent.locator(".semantic-reference-chip").first();
    await expect(chip).toHaveCount(1);
    await expect(chip).not.toHaveClass(/semantic-error/);

    const afterContent = await chip.evaluate((el) => {
      return window.getComputedStyle(el as Element, "::after").content || "";
    });
    expect(afterContent).not.toContain("31.42");

    await expect(dependent).not.toContainText("31.4231.42");
  });

  test("duplicate literal cleanup works even when reference sourceValue and visible label differ", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("PI*10");
    await waitForUIRenderComplete(page);

    await dispatchResultDrop(page, { sourceLineIndex: 0, dropAtBottom: true });
    await waitForUIRenderComplete(page);

    await page.evaluate(() => {
      const editorInstance = (window as any).tiptapEditor;
      if (!editorInstance) return;
      const paragraph = editorInstance.state.doc.child(1);
      let refPos = -1;
      let refNode: any = null;
      let offset = 1;
      paragraph.forEach((node: any) => {
        if (refPos >= 0) {
          return;
        }
        if (node.type?.name === "referenceToken") {
          refPos = offset;
          refNode = node;
        }
        offset += node.nodeSize;
      });
      if (!refNode || refPos < 0) return;
      const tr = editorInstance.state.tr;
      const absolutePos = 1 + editorInstance.state.doc.child(0).nodeSize + (refPos - 1);
      tr.setNodeMarkup(absolutePos, undefined, {
        ...refNode.attrs,
        label: "31.42",
        sourceValue: "31.41592653589793",
      });
      const insertAt = absolutePos + refNode.nodeSize;
      tr.insertText("31.42 ", insertAt, insertAt);
      editorInstance.view.dispatch(tr);
      window.dispatchEvent(new Event("forceEvaluation"));
    });
    await waitForUIRenderComplete(page);

    const dependent = page.locator(".ProseMirror p").nth(1);
    await expect(dependent).not.toContainText("31.4231.42");

    const nodeSummary = await page.evaluate(() => {
      const editorInstance = (window as any).tiptapEditor;
      if (!editorInstance) return null;
      const paragraph = editorInstance.state.doc.child(1);
      let literalText = "";
      paragraph.forEach((node: any) => {
        if (node.isText) {
          literalText += node.text || "";
        }
      });
      return { literalText };
    });
    expect(nodeSummary?.literalText).not.toContain("31.42");
  });

});
