import { expect, test } from "@playwright/test";
import { waitForUIRenderComplete } from "./utils";

const dispatchResultDrop = async (
  page: any,
  options: { targetLineIndex?: number; dropAtBottom?: boolean }
) => {
  await page.evaluate(({ targetLineIndex, dropAtBottom }) => {
    const chip = document.querySelector(".ProseMirror p .semantic-result-display") as HTMLElement | null;
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
    } else {
      const paragraphs = Array.from(document.querySelectorAll(".ProseMirror p")) as HTMLElement[];
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
});
