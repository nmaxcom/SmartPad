import { expect, test } from "@playwright/test";
import { waitForUIRenderComplete } from "./utils";

const dispatchResultDrop = async (
  page: any,
  options: {
    sourceLineIndex?: number;
    targetLineIndex?: number;
    dropAtBottom?: boolean;
    dropNearLastLineBottom?: boolean;
    dropWellBelowLastLine?: boolean;
    dropAfterLineIndex?: number;
    stripTargetLineId?: boolean;
  } = {}
) => {
  await page.evaluate(
    ({
      sourceLineIndex,
      targetLineIndex,
      dropAtBottom,
      dropNearLastLineBottom,
      dropWellBelowLastLine,
      dropAfterLineIndex,
      stripTargetLineId,
    }) => {
    const paragraphs = Array.from(document.querySelectorAll(".ProseMirror p")) as HTMLElement[];
    const sourceLine = paragraphs[sourceLineIndex || 0] || paragraphs[0];
    const chip = (sourceLine?.querySelector(
      ".semantic-live-result-display, .semantic-result-display"
    ) ||
      document.querySelector(
        ".ProseMirror .semantic-live-result-display, .ProseMirror .semantic-result-display"
      )) as HTMLElement | null;
    const editor = document.querySelector('[data-testid="smart-pad-editor"] .ProseMirror') as HTMLElement | null;
    if (!chip || !editor) return;

    const payload = {
      sourceLineId: String(chip.getAttribute("data-source-line-id") || "").trim(),
      sourceLine: Number(chip.getAttribute("data-source-line") || 0),
      sourceLabel: String(chip.getAttribute("data-source-label") || "").trim() || "value",
      sourceValue: String(chip.getAttribute("data-result") || "").trim(),
      placeholderKey: String(chip.getAttribute("data-placeholder-key") || "").trim() || undefined,
    };
    const dt = new DataTransfer();
    dt.setData("application/x-smartpad-result-reference", JSON.stringify(payload));

    let dropTarget: HTMLElement = editor;
    let clientX = 20;
    let clientY = 20;

    if (dropAtBottom) {
      const rect = editor.getBoundingClientRect();
      clientX = rect.left + Math.max(20, rect.width * 0.2);
      clientY = rect.bottom - 8;
    } else if (typeof dropAfterLineIndex === "number") {
      const afterLine = paragraphs[dropAfterLineIndex] || paragraphs[paragraphs.length - 1];
      if (!afterLine) return;
      if (stripTargetLineId) {
        afterLine.removeAttribute("data-line-id");
      }
      const rect = afterLine.getBoundingClientRect();
      dropTarget = afterLine;
      clientX = Math.max(rect.left + 24, rect.right - 10);
      clientY = rect.bottom + 8;
    } else if (dropNearLastLineBottom) {
      const lastLine = paragraphs[paragraphs.length - 1];
      if (!lastLine) return;
      const rect = lastLine.getBoundingClientRect();
      dropTarget = lastLine;
      clientX = Math.max(rect.left + 24, rect.right - 10);
      clientY = rect.bottom - 3;
    } else if (dropWellBelowLastLine) {
      const lastLine = paragraphs[paragraphs.length - 1];
      if (!lastLine) return;
      const editorRect = editor.getBoundingClientRect();
      const rect = lastLine.getBoundingClientRect();
      dropTarget = editor;
      clientX = Math.max(rect.left + 24, rect.right - 10);
      clientY = Math.min(editorRect.bottom - 6, rect.bottom + 34);
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
    },
    options
  );
};

const dispatchNativeResultDragDrop = async (
  page: any,
  options: {
    sourceLineIndex?: number;
    targetLineIndex?: number;
    includeInterimDragLeave?: boolean;
    poisonDataResultWithLabel?: boolean;
  } = {}
) => {
  await page.evaluate(
    ({ sourceLineIndex, targetLineIndex, includeInterimDragLeave, poisonDataResultWithLabel }) => {
      const editor = document.querySelector(
        '[data-testid="smart-pad-editor"] .ProseMirror'
      ) as HTMLElement | null;
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

      if (poisonDataResultWithLabel) {
        const sourceLabel = String(sourceChip.getAttribute("data-source-label") || "").trim();
        if (sourceLabel) {
          sourceChip.setAttribute("data-result", sourceLabel);
        }
      }

      const targetLine = paragraphs[targetLineIndex || 1] || paragraphs[paragraphs.length - 1];
      if (!targetLine) return;

      const sourceRect = sourceChip.getBoundingClientRect();
      const targetRect = targetLine.getBoundingClientRect();
      const dt = new DataTransfer();

      sourceChip.dispatchEvent(
        new DragEvent("dragstart", {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt,
          clientX: sourceRect.left + sourceRect.width * 0.5,
          clientY: sourceRect.top + sourceRect.height * 0.5,
        })
      );

      if (includeInterimDragLeave) {
        editor.dispatchEvent(
          new DragEvent("dragleave", {
            bubbles: true,
            cancelable: true,
            dataTransfer: dt,
            clientX: sourceRect.left - 8,
            clientY: sourceRect.top - 8,
          })
        );
      }

      const clientX = Math.max(targetRect.left + 24, targetRect.right - 10);
      const clientY = targetRect.top + Math.max(8, targetRect.height * 0.5);
      targetLine.dispatchEvent(
        new DragEvent("dragover", {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt,
          clientX,
          clientY,
        })
      );
      targetLine.dispatchEvent(
        new DragEvent("drop", {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt,
          clientX,
          clientY,
        })
      );
      sourceChip.dispatchEvent(
        new DragEvent("dragend", {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt,
          clientX,
          clientY,
        })
      );
    },
    options
  );
};

test.describe("Result references (drag-only)", () => {
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
  });

  test("clicking a result chip does not insert a reference", async ({ page }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("100 + 20 =>");
    await page.keyboard.press("Enter");
    await page.keyboard.type("target = ");
    await waitForUIRenderComplete(page);

    const targetLine = page.locator(".ProseMirror p").nth(1);
    await targetLine.click({ position: { x: 90, y: 8 } });
    const sourceChip = page.locator(".ProseMirror p").first().locator(".semantic-result-display");
    await sourceChip.click();
    await waitForUIRenderComplete(page);

    await expect(targetLine.locator(".semantic-reference-chip")).toHaveCount(0);
  });

  test("dragging a result chip onto a line inserts a reference chip", async ({ page }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("100 + 20 =>");
    await page.keyboard.press("Enter");
    await page.keyboard.type("tax = ");
    await waitForUIRenderComplete(page);

    const targetLine = page.locator(".ProseMirror p").nth(1);
    await dispatchResultDrop(page, { targetLineIndex: 1 });
    await page.keyboard.type("/2 =>");
    await waitForUIRenderComplete(page);

    await expect(targetLine.locator(".semantic-reference-chip")).toHaveCount(1);
    await expect(targetLine.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      "60"
    );
  });

  test("result-chip drag does not trigger sheet import drop overlay", async ({ page }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("100 + 20 =>");
    await waitForUIRenderComplete(page);

    await page.evaluate(() => {
      const chip = document.querySelector(".ProseMirror p .semantic-result-display") as HTMLElement | null;
      if (!chip) return;
      const dt = new DataTransfer();
      dt.setData(
        "application/x-smartpad-result-reference",
        JSON.stringify({
          sourceLineId: String(chip.getAttribute("data-source-line-id") || "").trim(),
          sourceLine: Number(chip.getAttribute("data-source-line") || 1),
          sourceLabel: String(chip.getAttribute("data-source-label") || "").trim() || "value",
          sourceValue: String(chip.getAttribute("data-result") || "").trim(),
        })
      );
      window.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dt }));
    });

    await expect(page.locator(".drop-overlay")).toHaveCount(0);
  });

  test("inserted reference chip uses source result text, not source expression label", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("a = 200");
    await page.keyboard.press("Enter");
    await page.keyboard.type("b = 12");
    await page.keyboard.press("Enter");
    await page.keyboard.type("a * b");
    await page.keyboard.press("Enter");
    await page.keyboard.type("target = ");
    await waitForUIRenderComplete(page);

    await dispatchResultDrop(page, { sourceLineIndex: 2, targetLineIndex: 3 });
    await waitForUIRenderComplete(page);

    const sourceResult = page.locator(".ProseMirror p").nth(2).locator(".semantic-live-result-display");
    const insertedChip = page.locator(".ProseMirror p").nth(3).locator(".semantic-reference-chip").first();
    await expect(insertedChip).toHaveCount(1);
    await expect(insertedChip).toHaveText(await sourceResult.first().innerText());
    await expect(insertedChip).not.toContainText("a * b");
  });

  test("native drag keeps payload through dragleave and still drops a reference", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("100 + 20 =>");
    await page.keyboard.press("Enter");
    await page.keyboard.type("tax = ");
    await waitForUIRenderComplete(page);

    const targetLine = page.locator(".ProseMirror p").nth(1);
    await dispatchNativeResultDragDrop(page, { targetLineIndex: 1, includeInterimDragLeave: true });
    await page.keyboard.type("/2 =>");
    await waitForUIRenderComplete(page);

    await expect(targetLine.locator(".semantic-reference-chip")).toHaveCount(1);
    await expect(targetLine.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      "60"
    );
  });

  test("native drag uses rendered chip value when data-result attribute is stale", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("monthly total = $1510");
    await page.keyboard.press("Enter");
    await page.keyboard.type("yearly total = monthly total * 12");
    await page.keyboard.press("Enter");
    await page.keyboard.type("target = ");
    await waitForUIRenderComplete(page);

    const sourceChip = page.locator(".ProseMirror p").nth(1).locator(".semantic-live-result-display");
    const visibleValue = (await sourceChip.first().innerText()).trim();
    await dispatchNativeResultDragDrop(page, {
      sourceLineIndex: 1,
      targetLineIndex: 2,
      poisonDataResultWithLabel: true,
    });
    await waitForUIRenderComplete(page);

    const insertedChip = page.locator(".ProseMirror p").nth(2).locator(".semantic-reference-chip").first();
    await expect(insertedChip).toHaveCount(1);
    await expect(insertedChip).toHaveText(visibleValue);
    await expect(insertedChip).not.toContainText("monthly total * 12");
  });

  test("dropping a result chip at the editor bottom creates a new line with reference", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("100 + 20 =>");
    await waitForUIRenderComplete(page);

    await dispatchResultDrop(page, { dropAtBottom: true });
    await page.keyboard.type("+5 =>");
    await waitForUIRenderComplete(page);

    const newLastLine = page.locator(".ProseMirror p").last();
    await expect(newLastLine.locator(".semantic-reference-chip")).toHaveCount(1);
    await expect(newLastLine.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      "125"
    );
  });

  test("dropping near the bottom edge of the last line creates a newline reference", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("100 + 20 =>");
    await waitForUIRenderComplete(page);

    await dispatchResultDrop(page, { dropNearLastLineBottom: true });
    await page.keyboard.type("+5 =>");
    await waitForUIRenderComplete(page);

    const newLastLine = page.locator(".ProseMirror p").last();
    await expect(newLastLine.locator(".semantic-reference-chip")).toHaveCount(1);
    await expect(newLastLine.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      "125"
    );
  });

  test("dropping well below the last line still creates a newline reference", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("100 + 20 =>");
    await waitForUIRenderComplete(page);

    await dispatchResultDrop(page, { dropWellBelowLastLine: true });
    await page.keyboard.type("+5 =>");
    await waitForUIRenderComplete(page);

    const newLastLine = page.locator(".ProseMirror p").last();
    await expect(newLastLine.locator(".semantic-reference-chip")).toHaveCount(1);
    await expect(newLastLine.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      "125"
    );
  });

  test("boundary drop between middle lines inserts at that boundary, not at document end", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("100 + 20 =>");
    await page.keyboard.press("Enter");
    await page.keyboard.type("middle = 1");
    await page.keyboard.press("Enter");
    await page.keyboard.type("tail = ");
    await waitForUIRenderComplete(page);

    const beforeCount = await page.locator(".ProseMirror p").count();
    await dispatchResultDrop(page, { sourceLineIndex: 0, dropAfterLineIndex: 1 });
    await waitForUIRenderComplete(page);

    await expect(page.locator(".ProseMirror p")).toHaveCount(beforeCount + 1);
    await expect(page.locator(".ProseMirror p").nth(2).locator(".semantic-reference-chip")).toHaveCount(
      1
    );
    await expect(page.locator(".ProseMirror p").last().locator(".semantic-reference-chip")).toHaveCount(
      0
    );
  });

  test("boundary drop still works when target paragraph is missing data-line-id", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("100 + 20 =>");
    await page.keyboard.press("Enter");
    await page.keyboard.type("middle = 1");
    await page.keyboard.press("Enter");
    await page.keyboard.type("tail = ");
    await waitForUIRenderComplete(page);

    const beforeCount = await page.locator(".ProseMirror p").count();
    await dispatchResultDrop(page, {
      sourceLineIndex: 0,
      dropAfterLineIndex: 1,
      stripTargetLineId: true,
    });
    await waitForUIRenderComplete(page);

    await expect(page.locator(".ProseMirror p")).toHaveCount(beforeCount + 1);
    await expect(page.locator(".ProseMirror p").nth(2).locator(".semantic-reference-chip")).toHaveCount(
      1
    );
    await expect(page.locator(".ProseMirror p").last().locator(".semantic-reference-chip")).toHaveCount(
      0
    );
  });
});
