import { expect, test } from "@playwright/test";
import { waitForUIRenderComplete } from "./utils";

test.describe("User Repro: PI*10 click live result then *2=>", () => {
  test("trace api captures result-click and reference text-input events", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="smart-pad-editor"]');
    await page.evaluate(() => {
      (window as any).__SP_REF_TRACE_CLEAR?.();
      (window as any).__SP_REF_TRACE_ENABLE?.(true);
      const key = "smartpad-settings";
      const existing = JSON.parse(localStorage.getItem(key) || "{}");
      localStorage.setItem(
        key,
        JSON.stringify({
          ...existing,
          liveResultEnabled: true,
          chipInsertMode: "reference",
          groupThousands: true,
          resultLaneEnabled: false,
        })
      );
    });
    await page.reload();
    await page.waitForSelector('[data-testid="smart-pad-editor"]');
    await page.evaluate(() => {
      const editor = (window as any).tiptapEditor;
      if (editor) {
        editor.commands.setContent("<p></p>");
        window.dispatchEvent(new Event("forceEvaluation"));
      }
      (window as any).__SP_REF_TRACE_CLEAR?.();
      (window as any).__SP_REF_TRACE_ENABLE?.(true);
    });
    await waitForUIRenderComplete(page);

    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("PI*10");
    const line = page.locator(".ProseMirror p").first();
    const sourceLive = line.locator(".semantic-live-result-display");
    await line.click({ position: { x: 8, y: 8 } });
    await sourceLive.click();
    await page.keyboard.type("*2=>");
    await waitForUIRenderComplete(page);

    const logs = await page.evaluate(() => {
      return (window as any).__SP_REF_TRACE_DUMP?.() || [];
    });
    const events = logs.map((entry: any) => String(entry?.event || ""));
    expect(events).toContain("traceToggle");
    expect(events).toContain("resultMouseDown");
    expect(events).toContain("insertReferenceAt");

    await page.evaluate(() => {
      (window as any).__SP_REF_TRACE_ENABLE?.(false);
    });
  });

  test("stays stable without duplicate literal when new line is auto-created from same source line", async ({
    page,
  }) => {
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
          chipInsertMode: "reference",
          groupThousands: true,
          resultLaneEnabled: false,
        })
      );
    });
    await page.reload();
    await page.waitForSelector('[data-testid="smart-pad-editor"]');

    let failureSnapshot: any = null;
    for (let i = 0; i < 50; i += 1) {
      await page.evaluate(() => {
        const editor = (window as any).tiptapEditor;
        if (!editor) return;
        editor.commands.setContent("<p></p>");
        window.dispatchEvent(new Event("forceEvaluation"));
      });
      await waitForUIRenderComplete(page);

      const editor = page.locator('[data-testid="smart-pad-editor"]');
      await editor.click();
      await page.keyboard.type("PI*10");
      const line = page.locator(".ProseMirror p").first();
      const sourceLive = line.locator(".semantic-live-result-display");
      await line.click({ position: { x: 8, y: 8 } });
      await sourceLive.click();
      const dependent = page.locator(".ProseMirror p").nth(1);
      await page.keyboard.type("*2=>");
      await waitForUIRenderComplete(page);

      const snapshot = await page.evaluate(() => {
        const editorInstance = (window as any).tiptapEditor;
        if (!editorInstance) return null;
        const line = editorInstance.state.doc.child(1);
        let plain = "";
        const nodes: any[] = [];
        line.forEach((node: any) => {
          if (node.type?.name === "referenceToken") {
            nodes.push({
              type: "referenceToken",
              sourceValue: node.attrs?.sourceValue || "",
              label: node.attrs?.label || "",
            });
          } else if (node.isText) {
            const text = node.text || "";
            plain += text;
            nodes.push({ type: "text", text });
          }
        });
        return {
          plain,
          normalized: plain.replace(/\s+/g, ""),
          nodeSummary: nodes,
        };
      });

      const hasVisibleDuplicate = snapshot?.normalized?.includes("31.4231.42") || false;
      const hasResult = await dependent
        .locator(".semantic-result-display")
        .last()
        .getAttribute("data-result")
        .then((v) => /62\.84/.test(String(v || "")))
        .catch(() => false);
      const hasRefChip = (await dependent.locator(".semantic-reference-chip").count()) === 1;

      if (hasVisibleDuplicate || !hasResult || !hasRefChip) {
        failureSnapshot = { iteration: i + 1, snapshot, hasResult, hasRefChip };
        break;
      }
    }

    expect(failureSnapshot, JSON.stringify(failureSnapshot, null, 2)).toBeNull();
  });

  test("value insert mode does not duplicate literal after click insert + *2=>", async ({ page }) => {
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
          chipInsertMode: "value",
          groupThousands: true,
          resultLaneEnabled: false,
        })
      );
    });
    await page.reload();
    await page.waitForSelector('[data-testid="smart-pad-editor"]');
    await page.evaluate(() => {
      const editor = (window as any).tiptapEditor;
      if (!editor) return;
      editor.commands.setContent("<p></p><p></p>");
      window.dispatchEvent(new Event("forceEvaluation"));
    });
    await waitForUIRenderComplete(page);

    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.locator(".ProseMirror p").first().click({ position: { x: 8, y: 8 } });
    await page.keyboard.type("PI*10");
    await page.keyboard.press("Enter");
    await page.keyboard.type(" ");
    await waitForUIRenderComplete(page);

    const sourceLive = page.locator(".ProseMirror p").first().locator(".semantic-live-result-display");
    const dependent = page.locator(".ProseMirror p").nth(1);
    await dependent.click({ position: { x: 10, y: 8 } });
    await sourceLive.click();
    await page.keyboard.type("*2=>");
    await waitForUIRenderComplete(page);

    const normalized = (((await dependent.textContent()) || "").replace(/\s+/g, ""));
    expect(normalized).not.toContain("31.4231.42");
    await expect(dependent.locator(".semantic-reference-chip")).toHaveCount(0);
    await expect(dependent.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /62\.84/
    );
  });

  test("stale reference metadata does not let selected-chip label get duplicated into expression text", async ({
    page,
  }) => {
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
          chipInsertMode: "reference",
          groupThousands: true,
          resultLaneEnabled: false,
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

    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("PI*10");
    await waitForUIRenderComplete(page);

    const line = page.locator(".ProseMirror p").first();
    const sourceLive = line.locator(".semantic-live-result-display");
    await line.click({ position: { x: 8, y: 8 } });
    await sourceLive.click();
    await waitForUIRenderComplete(page);

    const dependent = page.locator(".ProseMirror p").nth(1);
    const chip = dependent.locator(".semantic-reference-chip").first();
    await expect(chip).toHaveCount(1);

    await page.evaluate(() => {
      const editorInstance = (window as any).tiptapEditor;
      if (!editorInstance) return;
      const paragraph = editorInstance.state.doc.child(1);
      let refPos = -1;
      let refNode: any = null;
      let offset = 1;
      paragraph.forEach((node: any) => {
        if (refPos >= 0) return;
        if (node.type?.name === "referenceToken") {
          refPos = offset;
          refNode = node;
        }
        offset += node.nodeSize;
      });
      if (!refNode || refPos < 0) return;
      const absolutePos = 1 + editorInstance.state.doc.child(0).nodeSize + (refPos - 1);
      const tr = editorInstance.state.tr.setNodeMarkup(absolutePos, undefined, {
        ...refNode.attrs,
        sourceLineId: "__missing_source__",
        sourceValue: "31.41592653589793",
        label: "31.42",
      });
      editorInstance.view.dispatch(tr);
      editorInstance.commands.focus();
    });

    await chip.click();
    await page.keyboard.type("31.42 *2=>");
    await waitForUIRenderComplete(page);

    const normalized = (((await dependent.textContent()) || "").replace(/\s+/g, ""));
    expect(normalized).not.toContain("31.4231.42");
  });
});
