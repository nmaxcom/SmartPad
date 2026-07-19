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
    stripSourceLineId?: boolean;
    dropAfterText?: string;
    phase?: "dragover" | "drop" | "both";
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
      stripSourceLineId,
      dropAfterText,
      phase,
    }) => {
    const coordsAfterVisibleText = (line: HTMLElement, text: string): { x: number; y: number } | null => {
      const targetText = String(text || "");
      if (!targetText) return null;
      let seen = "";
      const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = (node.parentElement || null) as HTMLElement | null;
          if (parent?.closest(".semantic-result-container, .semantic-result-actions")) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      let current = walker.nextNode() as Text | null;
      while (current) {
        const value = current.nodeValue || "";
        const nextSeen = seen + value;
        if (targetText.length <= nextSeen.length && nextSeen.includes(targetText)) {
          const endInCombined = nextSeen.indexOf(targetText) + targetText.length;
          const offsetInNode = Math.max(0, Math.min(value.length, endInCombined - seen.length));
          const range = document.createRange();
          if (offsetInNode > 0) {
            range.setStart(current, offsetInNode - 1);
            range.setEnd(current, offsetInNode);
          } else {
            range.setStart(current, offsetInNode);
            range.setEnd(current, offsetInNode);
          }
          const rect = range.getBoundingClientRect();
          range.detach();
          if (rect.width || rect.height) {
            return {
              x: rect.right + 1,
              y: rect.top + Math.max(2, rect.height * 0.5),
            };
          }
          const lineRect = line.getBoundingClientRect();
          return {
            x: lineRect.left + 8,
            y: lineRect.top + Math.max(8, lineRect.height * 0.5),
          };
        }
        seen = nextSeen;
        current = walker.nextNode() as Text | null;
      }
      return null;
    };

    const paragraphs = Array.from(document.querySelectorAll(".ProseMirror p")) as HTMLElement[];
    const sourceLine = paragraphs[sourceLineIndex || 0] || paragraphs[0];
    if (stripSourceLineId && sourceLine) {
      sourceLine.removeAttribute("data-line-id");
    }
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
      clientY = rect.bottom + 2;
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
      const targetLine =
        (dropAfterText
          ? paragraphs.find((paragraph) =>
              String(paragraph.textContent || "").includes(dropAfterText)
            )
          : null) ||
        paragraphs[targetLineIndex || 1] ||
        paragraphs[paragraphs.length - 1];
      if (!targetLine) return;
      const rect = targetLine.getBoundingClientRect();
      dropTarget = targetLine;
      const inlineCoords = dropAfterText ? coordsAfterVisibleText(targetLine, dropAfterText) : null;
      clientX = inlineCoords ? inlineCoords.x : Math.max(rect.left + 24, rect.right - 10);
      clientY = inlineCoords ? inlineCoords.y : rect.top + Math.max(8, rect.height * 0.5);
    }

    const resolvedPhase = phase || "both";
    (window as any).__SP_RESULT_CHIP_DRAG_ACTIVE = true;
    chip.dispatchEvent(
      new DragEvent("dragstart", {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
      })
    );
    if (resolvedPhase === "dragover" || resolvedPhase === "both") {
      dropTarget.dispatchEvent(
        new DragEvent("dragover", {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt,
          clientX,
          clientY,
        })
      );
    }
    if (resolvedPhase === "drop" || resolvedPhase === "both") {
      dropTarget.dispatchEvent(
        new DragEvent("drop", {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt,
          clientX,
          clientY,
        })
      );
    }
    if (resolvedPhase !== "dragover") {
      chip.dispatchEvent(
        new DragEvent("dragend", {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt,
        })
      );
      (window as any).__SP_RESULT_CHIP_DRAG_ACTIVE = false;
    }
    },
    options
  );
};

const dispatchReferenceMove = async (
  page: any,
  options: {
    referenceLineIndex: number;
    targetLineIndex: number;
    dropAfterText: string;
  }
) => {
  await page.evaluate(({ referenceLineIndex, targetLineIndex, dropAfterText }) => {
    const coordsAfterVisibleText = (line: HTMLElement, text: string): { x: number; y: number } | null => {
      const targetText = String(text || "");
      if (!targetText) return null;
      let seen = "";
      const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = (node.parentElement || null) as HTMLElement | null;
          if (parent?.closest(".semantic-result-container, .semantic-result-actions")) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      let current = walker.nextNode() as Text | null;
      while (current) {
        const value = current.nodeValue || "";
        const nextSeen = seen + value;
        if (targetText.length <= nextSeen.length && nextSeen.includes(targetText)) {
          const endInCombined = nextSeen.indexOf(targetText) + targetText.length;
          const offsetInNode = Math.max(0, Math.min(value.length, endInCombined - seen.length));
          const range = document.createRange();
          if (offsetInNode > 0) {
            range.setStart(current, offsetInNode - 1);
            range.setEnd(current, offsetInNode);
          } else {
            range.setStart(current, offsetInNode);
            range.setEnd(current, offsetInNode);
          }
          const rect = range.getBoundingClientRect();
          range.detach();
          if (rect.width || rect.height) {
            return {
              x: rect.right + 1,
              y: rect.top + Math.max(2, rect.height * 0.5),
            };
          }
        }
        seen = nextSeen;
        current = walker.nextNode() as Text | null;
      }
      return null;
    };

    const paragraphs = Array.from(document.querySelectorAll(".ProseMirror p")) as HTMLElement[];
    const referenceLine = paragraphs[referenceLineIndex];
    const targetLine =
      paragraphs.find((paragraph) =>
        String(paragraph.textContent || "").includes(dropAfterText)
      ) || paragraphs[targetLineIndex];
    const reference = referenceLine?.querySelector(".semantic-reference-chip") as HTMLElement | null;
    const editor = document.querySelector('[data-testid="smart-pad-editor"] .ProseMirror') as HTMLElement | null;
    if (!reference || !targetLine || !editor) return;

    const targetRect = targetLine.getBoundingClientRect();
    const coords = coordsAfterVisibleText(targetLine, dropAfterText) || {
      x: targetRect.left + Math.max(24, targetRect.width * 0.5),
      y: targetRect.top + Math.max(8, targetRect.height * 0.5),
    };
    const refRect = reference.getBoundingClientRect();
    const dt = new DataTransfer();
    (window as any).__SP_RESULT_CHIP_DRAG_ACTIVE = true;
    reference.dispatchEvent(
      new DragEvent("dragstart", {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
        clientX: refRect.left + refRect.width * 0.5,
        clientY: refRect.top + refRect.height * 0.5,
      })
    );
    targetLine.dispatchEvent(
      new DragEvent("dragover", {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
        clientX: coords.x,
        clientY: coords.y,
      })
    );
    targetLine.dispatchEvent(
      new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
        clientX: coords.x,
        clientY: coords.y,
      })
    );
    reference.dispatchEvent(
      new DragEvent("dragend", {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
        clientX: coords.x,
        clientY: coords.y,
      })
    );
    (window as any).__SP_RESULT_CHIP_DRAG_ACTIVE = false;
  }, options);
};

const dispatchNativeResultDragDrop = async (
  page: any,
  options: {
    sourceLineIndex?: number;
    targetLineIndex?: number;
    includeInterimDragLeave?: boolean;
    poisonDataResultWithLabel?: boolean;
    dragFromValue?: boolean;
  } = {}
) => {
  await page.evaluate(
    ({
      sourceLineIndex,
      targetLineIndex,
      includeInterimDragLeave,
      poisonDataResultWithLabel,
      dragFromValue,
    }) => {
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

      const dragSource =
        dragFromValue
          ? ((sourceChip.querySelector(".semantic-result-value, .semantic-live-result-value") as HTMLElement | null) ||
              sourceChip)
          : sourceChip;
      const sourceRect = dragSource.getBoundingClientRect();
      const targetRect = targetLine.getBoundingClientRect();
      const dt = new DataTransfer();

      dragSource.dispatchEvent(
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

  test("result chips expose copy/menu actions without a separate drag handle", async ({ page }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("100 + 20 =>");
    await waitForUIRenderComplete(page);

    const sourceChip = page.locator(".ProseMirror p").first().locator(".semantic-result-display");
    await sourceChip.hover();
    await page.waitForTimeout(220);

    await expect(sourceChip).toHaveAttribute("draggable", "true");
    await expect(sourceChip.locator(".semantic-result-value")).toHaveAttribute("draggable", "true");
    await expect(sourceChip.locator(".semantic-result-drag")).toHaveCount(0);
    await expect(sourceChip.locator(".semantic-result-copy")).toBeVisible();
    await expect(sourceChip.locator(".semantic-result-menu")).toBeVisible();
  });

  test("result chip menu does not expose insert actions", async ({ page }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("100 + 20 =>");
    await page.keyboard.press("Enter");
    await page.keyboard.type("tax = ");
    await waitForUIRenderComplete(page);

    const sourceChip = page.locator(".ProseMirror p").first().locator(".semantic-result-display");
    const targetLine = page.locator(".ProseMirror p").nth(1);
    await targetLine.click({ position: { x: 80, y: 8 } });
    await sourceChip.hover();
    await sourceChip.locator(".semantic-result-menu").click();

    const menu = page.locator(".semantic-result-action-menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Copy value" })).toBeEnabled();
    await expect(
      menu.getByRole("menuitem", {
        name: "Show how this result is calculated",
      }),
    ).toBeDisabled();
    await expect(menu.getByRole("menuitem", { name: "Plot from result" })).toBeDisabled();
    await expect(menu.getByRole("menuitem", { name: "Insert reference" })).toHaveCount(0);
    await expect(menu.getByRole("menuitem", { name: "Insert value" })).toHaveCount(0);
    await expect(targetLine.locator(".semantic-reference-chip")).toHaveCount(0);
  });

  test("result chip menu creates a plot view for plottable expressions", async ({ page }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("x = 2");
    await page.keyboard.press("Enter");
    await page.keyboard.type("x^2 =>");
    await waitForUIRenderComplete(page);

    const sourceChip = page.locator(".ProseMirror p").nth(1).locator(".semantic-result-display");
    await sourceChip.hover();
    await sourceChip.locator(".semantic-result-menu").click();

    const menu = page.locator(".semantic-result-action-menu");
    await expect(menu.getByRole("menuitem", { name: "Plot from result" })).toBeEnabled();
    await menu.getByRole("menuitem", { name: "Plot from result" }).click();
    await waitForUIRenderComplete(page);

    const plotLine = page.locator(".ProseMirror p").nth(2);
    await expect(plotLine).toContainText("@view plot x=x size=md");
    await expect(page.locator(".plot-view").first()).toBeVisible();
    await expect(page.locator(".plot-view-disconnected")).toHaveCount(0);
  });

  test("result chip plot action binds named results and lets users choose the x variable", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("distance = 120 km");
    await page.keyboard.press("Enter");
    await page.keyboard.type("time = 2 h");
    await page.keyboard.press("Enter");
    await page.keyboard.type("speed = distance / time =>");
    await waitForUIRenderComplete(page);

    const sourceChip = page.locator(".ProseMirror p").nth(2).locator(".semantic-result-display");
    await sourceChip.hover();
    await sourceChip.locator(".semantic-result-menu").click();

    const menu = page.locator(".semantic-result-action-menu");
    await expect(menu.getByRole("menuitem", { name: "Plot vs distance" })).toBeEnabled();
    await expect(menu.getByRole("menuitem", { name: "Plot vs time" })).toBeEnabled();
    await menu.getByRole("menuitem", { name: "Plot vs time" }).click();
    await waitForUIRenderComplete(page);

    const plotLine = page.locator(".ProseMirror p").nth(3);
    await expect(plotLine).toContainText("@view plot x=time y=speed size=md");
    await expect(plotLine).not.toContainText("distance / time");
    await expect(page.locator(".plot-view").first()).toBeVisible();
    await expect(page.locator(".plot-view-disconnected")).toHaveCount(0);

    await page.evaluate(() => {
      const editor = (window as any).tiptapEditor;
      editor?.commands?.setContent(
        "<p>distance = 120 km</p><p>time = 2 h</p><p>speed = distance / (time * 2) =&gt;</p><p>@view plot x=time y=speed size=md</p>"
      );
      window.dispatchEvent(new Event("forceEvaluation"));
    });
    await waitForUIRenderComplete(page);

    await expect(page.locator(".ProseMirror p").nth(3)).toContainText(
      "@view plot x=time y=speed size=md"
    );
    await expect(page.locator(".plot-view").first()).toBeVisible();
    await expect(page.locator(".plot-view-disconnected")).toHaveCount(0);
  });

  test("result chip plot action connects function-backed unit results", async ({ page }) => {
    await page.evaluate(() => {
      const editor = (window as any).tiptapEditor;
      editor?.commands?.setContent(
        [
          "<p>area(r) = PI * r^2</p>",
          "<p>radius = 4 m</p>",
          "<p>circle area = area(radius)</p>",
        ].join("")
      );
      window.dispatchEvent(new Event("forceEvaluation"));
    });
    await waitForUIRenderComplete(page);

    const sourceChip = page
      .locator(".ProseMirror p")
      .nth(2)
      .locator(".semantic-result-display, .semantic-live-result-display");
    await sourceChip.hover();
    const menuButton = sourceChip.locator(".semantic-result-menu");
    await expect(menuButton).toBeVisible();
    await menuButton.click({ force: true });

    const menu = page.locator(".semantic-result-action-menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Plot from result" })).toBeEnabled();
    await menu.getByRole("menuitem", { name: "Plot from result" }).click();
    await waitForUIRenderComplete(page);

    const plotLine = page.locator(".ProseMirror p").nth(3);
    await expect(plotLine).toContainText("@view plot x=radius y=circle area size=md");
    await expect(page.locator(".plot-view").first()).toBeVisible();
    await expect(page.locator(".plot-view-disconnected")).toHaveCount(0);
    await expect(page.locator(".plot-view-line").first()).toBeVisible();
  });

  test("result chip menu creates a plot directly from a one-argument function call", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const editor = (window as any).tiptapEditor;
      editor?.commands?.setContent(
        [
          "<p>f(x) = 56*x + 7</p>",
          "<p>f(10) =&gt;</p>",
        ].join("")
      );
      window.dispatchEvent(new Event("forceEvaluation"));
    });
    await waitForUIRenderComplete(page);

    const sourceChip = page
      .locator(".ProseMirror p")
      .nth(1)
      .locator(".semantic-result-display, .semantic-live-result-display");
    await sourceChip.hover();
    await sourceChip
      .locator(".semantic-result-menu")
      .evaluate((button: HTMLElement) => button.click());

    const menu = page.locator(".semantic-result-action-menu");
    const plotFunction = menu.getByRole("menuitem", { name: "Plot function f(x)" });
    await expect(plotFunction).toBeEnabled();
    await plotFunction.click();
    await waitForUIRenderComplete(page);

    const plotLine = page.locator(".ProseMirror p").nth(2);
    await expect(plotLine).toContainText("@view plot y=f size=md");
    await expect(page.locator(".plot-view").first()).toBeVisible();
    await expect(page.locator(".plot-view-disconnected")).toHaveCount(0);
    await expect(page.locator(".plot-view-line").first()).toBeVisible();
  });

  test("result chip menu suggests and creates a histogram for numeric lists", async ({ page }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("wait times = 3, 4, 4, 5, 8, 12 =>");
    await waitForUIRenderComplete(page);

    const sourceChip = page.locator(".ProseMirror p").first().locator(".semantic-result-display");
    await sourceChip.hover();
    await sourceChip
      .locator(".semantic-result-menu")
      .evaluate((button: HTMLElement) => button.click());

    const menu = page.locator(".semantic-result-action-menu");
    const histogramAction = menu.getByRole("menuitem", { name: "Plot as histogram" });
    await expect(histogramAction).toBeEnabled();
    await expect(histogramAction).toHaveClass(/semantic-result-plot-suggestion/);
    await histogramAction.click();
    await waitForUIRenderComplete(page);

    const plotLine = page.locator(".ProseMirror p").nth(1);
    await expect(plotLine).toContainText("@view hist y=wait times size=md");
    await expect(page.locator(".plot-view").first()).toBeVisible();
    await expect(page.locator(".plot-view-disconnected")).toHaveCount(0);
    await expect(page.locator(".plot-view-bar").first()).toBeVisible();
  });

  test("result chip menu suggests and creates scatter for equal-length numeric lists", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("study hours = 2, 3, 4, 5 =>");
    await page.keyboard.press("Enter");
    await page.keyboard.type("test score = 58, 61, 68, 73 =>");
    await waitForUIRenderComplete(page);

    const sourceChip = page.locator(".ProseMirror p").nth(1).locator(".semantic-result-display");
    await sourceChip.hover();
    await sourceChip
      .locator(".semantic-result-menu")
      .evaluate((button: HTMLElement) => button.click());

    const menu = page.locator(".semantic-result-action-menu");
    const scatterAction = menu.getByRole("menuitem", {
      name: "Plot as scatter vs study hours",
    });
    await expect(scatterAction).toBeEnabled();
    await expect(scatterAction).toHaveClass(/semantic-result-plot-suggestion/);
    await scatterAction.click();
    await waitForUIRenderComplete(page);

    const plotLine = page.locator(".ProseMirror p").nth(2);
    await expect(plotLine).toContainText("@view scatter x=study hours y=test score size=md");
    await expect(page.locator(".plot-view").first()).toBeVisible();
    await expect(page.locator(".plot-view-disconnected")).toHaveCount(0);
    await expect(page.locator(".plot-view-scatter-dot")).toHaveCount(4);
  });

  test("result chip menu does not suggest scatter for mismatched list lengths", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("study hours = 2, 3, 4 =>");
    await page.keyboard.press("Enter");
    await page.keyboard.type("test score = 58, 61, 68, 73 =>");
    await waitForUIRenderComplete(page);

    const sourceChip = page.locator(".ProseMirror p").nth(1).locator(".semantic-result-display");
    await sourceChip.hover();
    await sourceChip
      .locator(".semantic-result-menu")
      .evaluate((button: HTMLElement) => button.click());

    const menu = page.locator(".semantic-result-action-menu");
    await expect(menu.getByRole("menuitem", { name: "Plot as histogram" })).toBeEnabled();
    await expect(
      menu.getByRole("menuitem", { name: "Plot as scatter vs study hours" })
    ).toHaveCount(0);
  });

  test("result chip menu inserts an editable goal-seek line", async ({ page }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("keep rate = 78%");
    await page.keyboard.press("Enter");
    await page.keyboard.type("gross = EUR 3000");
    await page.keyboard.press("Enter");
    await page.keyboard.type("take home = gross * keep rate =>");
    await waitForUIRenderComplete(page);

    const sourceChip = page.locator(".ProseMirror p").nth(2).locator(".semantic-result-display");
    await sourceChip.hover();
    await sourceChip
      .locator(".semantic-result-menu")
      .evaluate((button: HTMLElement) => button.click());

    const menu = page.locator(".semantic-result-action-menu");
    await expect(
      menu.getByRole("menuitem", { name: "Find gross for a target…" }),
    ).toBeEnabled();
    await menu
      .getByRole("menuitem", { name: "Find gross for a target…" })
      .click();
    await waitForUIRenderComplete(page);

    const goalLine = page.locator(".ProseMirror p").nth(3);
    await expect(goalLine).toContainText("make take home =");
    await expect(goalLine).toContainText("by gross =>");
    await expect(goalLine.locator(".semantic-result-display")).toHaveCount(1);
    await expect(page.locator(".semantic-error-result")).toHaveCount(0);
  });

  test("goal-seek menu inserts parser-safe targets when thousands grouping is enabled", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const key = "smartpad-settings";
      const existing = JSON.parse(localStorage.getItem(key) || "{}");
      localStorage.setItem(key, JSON.stringify({ ...existing, groupThousands: true }));
    });
    await page.reload();
    await page.waitForSelector('[data-testid="smart-pad-editor"]');

    await page.evaluate(() => {
      const editor = (window as any).tiptapEditor;
      editor?.commands?.setContent(
        "<p>keep rate = 84%</p><p>gross = 3000000 EUR</p><p>take home = gross * keep rate =&gt;</p>"
      );
      window.dispatchEvent(new Event("forceEvaluation"));
    });
    await waitForUIRenderComplete(page);

    const sourceChip = page
      .locator(".ProseMirror p")
      .nth(2)
      .locator(".semantic-result-display, .semantic-live-result-display");
    await sourceChip.hover();
    await sourceChip
      .locator(".semantic-result-menu")
      .evaluate((button: HTMLElement) => button.click());

    const menu = page.locator(".semantic-result-action-menu");
    await expect(
      menu.getByRole("menuitem", { name: "Find gross for a target…" }),
    ).toBeEnabled();
    await menu
      .getByRole("menuitem", { name: "Find gross for a target…" })
      .click();
    await waitForUIRenderComplete(page);

    const goalLine = page.locator(".ProseMirror p").nth(3);
    await expect(goalLine).toContainText("make take home =");
    await expect(goalLine).toContainText("2520000 EUR");
    await expect(goalLine).not.toContainText("2,520,000");
    await expect(page.locator(".semantic-error-result")).toHaveCount(0);
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

  test("visible result values are draggable for trigger and live chips", async ({ page }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("100 + 20 =>");
    await page.keyboard.press("Enter");
    await page.keyboard.type("trigger target = ");
    await page.keyboard.press("Enter");
    await page.keyboard.type("base = 40");
    await page.keyboard.press("Enter");
    await page.keyboard.type("base * 3");
    await page.keyboard.press("Enter");
    await page.keyboard.type("live target = ");
    await waitForUIRenderComplete(page);

    await dispatchNativeResultDragDrop(page, {
      sourceLineIndex: 0,
      targetLineIndex: 1,
      dragFromValue: true,
    });
    await dispatchNativeResultDragDrop(page, {
      sourceLineIndex: 3,
      targetLineIndex: 4,
      dragFromValue: true,
    });
    await waitForUIRenderComplete(page);

    await expect(page.locator(".ProseMirror p").nth(1).locator(".semantic-reference-chip")).toHaveText(
      "120"
    );
    await expect(page.locator(".ProseMirror p").nth(4).locator(".semantic-reference-chip")).toHaveText(
      "120"
    );
  });

  test("whole trigger result chip supports native pointer drag", async ({ page }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("100 + 20 =>");
    await page.keyboard.press("Enter");
    await page.keyboard.type("target = ");
    await waitForUIRenderComplete(page);

    const sourceChip = page.locator(".ProseMirror p").first().locator(".semantic-result-display");
    const targetLine = page.locator(".ProseMirror p").nth(1);
    await expect(sourceChip).toHaveAttribute("draggable", "true");
    await expect(sourceChip.locator(".semantic-result-drag")).toHaveCount(0);

    await sourceChip.dragTo(targetLine, {
      sourcePosition: { x: 8, y: 8 },
      targetPosition: { x: 90, y: 8 },
    });
    await waitForUIRenderComplete(page);

    await expect(targetLine.locator(".semantic-reference-chip")).toHaveCount(1);
    await expect(targetLine.locator(".semantic-reference-chip").first()).toHaveText("120");
  });

  test("dragging a result hides hover actions while the drag is active", async ({ page }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("100 + 20 =>");
    await page.keyboard.press("Enter");
    await page.keyboard.type("target = ");
    await waitForUIRenderComplete(page);

    const sourceChip = page.locator(".ProseMirror p").first().locator(".semantic-result-display");
    await sourceChip.hover();
    await expect(sourceChip.locator(".semantic-result-actions")).toBeVisible();

    await dispatchResultDrop(page, {
      targetLineIndex: 1,
      phase: "dragover",
    });

    await expect(page.locator(".ProseMirror")).toHaveClass(/sp-result-chip-dragging/);
    const actionsOpacity = await sourceChip
      .locator(".semantic-result-actions")
      .evaluate((element) => getComputedStyle(element).opacity);
    expect(actionsOpacity).toBe("0");

    await dispatchResultDrop(page, {
      targetLineIndex: 1,
      phase: "drop",
    });
    await waitForUIRenderComplete(page);
    await expect(page.locator(".ProseMirror")).not.toHaveClass(/sp-result-chip-dragging/);
  });

  test("dragging a result chip inserts at the exact inline caret position", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("100 + 20 =>");
    await page.keyboard.press("Enter");
    await page.keyboard.type("calc = 3 * + 20");
    await waitForUIRenderComplete(page);

    await dispatchResultDrop(page, {
      targetLineIndex: 1,
      dropAfterText: "calc = 3 * ",
      phase: "dragover",
    });

    await expect(page.locator(".sp-chip-drop-inline-caret")).toHaveCount(1);

    await dispatchResultDrop(page, {
      targetLineIndex: 1,
      dropAfterText: "calc = 3 * ",
      phase: "drop",
    });
    await waitForUIRenderComplete(page);

    const targetLine = page.locator(".ProseMirror p").nth(1);
    await expect(targetLine.locator(".semantic-reference-chip")).toHaveCount(1);
    const structure = await targetLine.evaluate((line: HTMLElement) =>
      Array.from(line.childNodes)
        .map((node) => {
          if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
          if (node instanceof HTMLElement && node.matches(".semantic-reference-chip")) {
            return `[ref:${node.textContent || ""}]`;
          }
          if (
            node instanceof HTMLElement &&
            node.matches(".semantic-wrapper, .semantic-result-container")
          ) {
            return "";
          }
          return node.textContent || "";
        })
        .join("")
    );
    expect(structure.replace(/\s+/g, "")).toContain("calc=3*[ref:120]+20");
  });

  test("inserted reference chips can be moved again inside the same line", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("100 + 20 =>");
    await page.keyboard.press("Enter");
    await page.keyboard.type("calc = 3 * + 20");
    await waitForUIRenderComplete(page);

    await dispatchResultDrop(page, {
      targetLineIndex: 1,
      dropAfterText: "calc = 3 * ",
    });
    await waitForUIRenderComplete(page);

    await dispatchReferenceMove(page, {
      referenceLineIndex: 1,
      targetLineIndex: 1,
      dropAfterText: "calc = ",
    });
    await waitForUIRenderComplete(page);

    const targetLine = page.locator(".ProseMirror p").nth(1);
    await expect(targetLine.locator(".semantic-reference-chip")).toHaveCount(1);
    const structure = await targetLine.evaluate((line: HTMLElement) =>
      Array.from(line.childNodes)
        .map((node) => {
          if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
          if (node instanceof HTMLElement && node.matches(".semantic-reference-chip")) {
            return `[ref:${node.textContent || ""}]`;
          }
          if (
            node instanceof HTMLElement &&
            node.matches(".semantic-wrapper, .semantic-result-container")
          ) {
            return "";
          }
          return node.textContent || "";
        })
        .join("")
    );
    expect(structure.replace(/\s+/g, "")).toContain("calc=[ref:120]3*+20");
    expect(structure).not.toContain("__sp_ref_");
  });

  test("typing at the caret before a dropped reference chip inserts before the chip", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("100 + 20 =>");
    await page.keyboard.press("Enter");
    await page.keyboard.type("total = ");
    await waitForUIRenderComplete(page);

    await dispatchResultDrop(page, { targetLineIndex: 1 });
    await waitForUIRenderComplete(page);

    await page.evaluate(() => {
      const editor = (window as any).tiptapEditor;
      const state = editor?.state;
      if (!state) return;
      let referencePos: number | null = null;
      state.doc.descendants((node: any, pos: number) => {
        if (node.type?.name === "referenceToken") {
          referencePos = pos;
          return false;
        }
        return true;
      });
      if (typeof referencePos === "number") {
        editor.commands.setTextSelection(referencePos);
      }
    });
    await page.keyboard.type("+");
    await waitForUIRenderComplete(page);

    const targetLine = page.locator(".ProseMirror p").nth(1);
    await expect(targetLine.locator(".semantic-reference-chip")).toHaveCount(1);
    const structure = await targetLine.evaluate((line: HTMLElement) =>
      Array.from(line.childNodes)
        .map((node) => {
          if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
          if (node instanceof HTMLElement && node.matches(".semantic-reference-chip")) {
            return `[ref:${node.textContent || ""}]`;
          }
          if (
            node instanceof HTMLElement &&
            node.matches(".semantic-wrapper, .semantic-result-container")
          ) {
            return "";
          }
          return node.textContent || "";
        })
        .join("")
    );
    expect(structure.replace(/\s+/g, "")).toContain("total=+[ref:120]");
    await expect(targetLine.locator(".semantic-reference-broken")).toHaveCount(0);
    await expect(targetLine.locator(".semantic-reference-line-warning")).toHaveCount(0);
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

  test("dragged references inside functions never expose placeholder ids", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("$20 * 10 =>");
    await page.keyboard.press("Enter");
    await page.keyboard.type("sqrt(");
    await waitForUIRenderComplete(page);

    const dependent = page.locator(".ProseMirror p").nth(1);
    await dispatchResultDrop(page, { sourceLineIndex: 0, targetLineIndex: 1 });
    await page.keyboard.type(")");
    await waitForUIRenderComplete(page);

    await expect(dependent.locator(".semantic-reference-chip")).toHaveCount(1);
    await expect(dependent).not.toContainText("__sp_ref_");
    await expect(dependent.locator(".semantic-error-result, .semantic-live-result-display").last()).not.toContainText(
      "__sp_ref_"
    );
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

  test("triggered result drag/drop still inserts when source paragraph line-id is missing", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("100 + 20 =>");
    await page.keyboard.press("Enter");
    await page.keyboard.type("tax = ");
    await waitForUIRenderComplete(page);

    const targetLine = page.locator(".ProseMirror p").nth(1);
    await dispatchResultDrop(page, {
      sourceLineIndex: 0,
      targetLineIndex: 1,
      stripSourceLineId: true,
    });
    await page.keyboard.type("/2 =>");
    await waitForUIRenderComplete(page);

    await expect(targetLine.locator(".semantic-reference-chip")).toHaveCount(1);
    await expect(targetLine.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      "60"
    );
  });
});
