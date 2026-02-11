import { expect, test } from "@playwright/test";
import { waitForUIRenderComplete } from "./utils";

test.describe("Live Result", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="smart-pad-editor"]');
  });

  test("is enabled by default and shows live math results without =>", async ({ page }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("3*4");

    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-live-result-display")).toHaveCount(1);
    await expect(page.locator(".semantic-live-result-display").first()).toHaveAttribute(
      "data-result",
      "12"
    );
  });

  test("shows live results for implicit expression lines parsed without =>", async ({ page }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();

    await page.keyboard.type("4lb to kg");
    await page.keyboard.press("Enter");
    await page.keyboard.type("sqrt(16)+2");
    await page.keyboard.press("Enter");
    await page.keyboard.type("PI*2");
    await page.keyboard.press("Enter");
    await page.keyboard.type("known = 5");
    await page.keyboard.press("Enter");
    await page.keyboard.type("known*3");

    await waitForUIRenderComplete(page);
    const liveResults = page.locator(".semantic-live-result-display");
    await expect(liveResults).toHaveCount(4);
    await expect(liveResults.nth(0)).toHaveAttribute("data-result", /1\.81\s*kg/i);
    await expect(liveResults.nth(1)).toHaveAttribute("data-result", "6");
    await expect(liveResults.nth(2)).toHaveAttribute("data-result", /6\.28/);
    await expect(liveResults.nth(3)).toHaveAttribute("data-result", "15");
  });

  test("live result visuals match triggered results and flash on update", async ({ page }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("3*4");
    await page.keyboard.press("Enter");
    await page.keyboard.type("3*4=>");
    await waitForUIRenderComplete(page);
    await page.waitForTimeout(950);

    const styles = await page.evaluate(() => {
      const live = document.querySelector(
        ".ProseMirror p:first-child .semantic-live-result-display"
      ) as HTMLElement | null;
      const triggered = document.querySelector(
        ".ProseMirror p:nth-child(2) .semantic-result-display"
      ) as HTMLElement | null;
      if (!live || !triggered) return null;
      const liveStyle = window.getComputedStyle(live);
      const triggeredStyle = window.getComputedStyle(triggered);
      return {
        liveColor: liveStyle.color,
        triggeredColor: triggeredStyle.color,
        liveBackground: liveStyle.backgroundColor,
        triggeredBackground: triggeredStyle.backgroundColor,
      };
    });

    expect(styles).not.toBeNull();
    expect((styles as any).liveColor).toBe((styles as any).triggeredColor);
    expect((styles as any).liveBackground).toBe((styles as any).triggeredBackground);

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

    const liveChip = page.locator(".ProseMirror p").first().locator(".semantic-live-result-display");
    await expect(liveChip).toHaveAttribute("data-result", "15");
    await expect(liveChip).toHaveClass(/semantic-result-flash/);
  });

  test("renders the template playground with complete live-result coverage", async ({
    page,
  }) => {
    const templateButton = page.getByRole("button", { name: "Live Result" });
    await expect(templateButton).toBeVisible();
    await templateButton.click();

    await waitForUIRenderComplete(page);
    await page.waitForTimeout(250);

    const values = await page.$$eval(".semantic-live-result-display", (nodes) =>
      nodes.map((node) => (node as HTMLElement).getAttribute("data-result") || "")
    );

    expect(values).toEqual(["3", "12", "1.81 kg", "162 L", "6", "6.28", "15"]);
  });

  test("applies visible left spacing for live-result chip", async ({ page }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("3*4");
    await waitForUIRenderComplete(page);

    const marginLeftPx = await page.$eval(".semantic-live-result-display", (el) =>
      Number.parseFloat(window.getComputedStyle(el).marginLeft || "0")
    );
    expect(marginLeftPx).toBeGreaterThan(0);
  });

  test("keeps live-result rows visually aligned without changing row height", async ({
    page,
  }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("3*4");
    await page.keyboard.press("Enter");
    await page.keyboard.type("just notes here");
    await page.keyboard.press("Enter");
    await page.keyboard.type("5*6");
    await waitForUIRenderComplete(page);

    const geometry = await page.evaluate(() => {
      const lines = Array.from(document.querySelectorAll(".ProseMirror p"));
      const first = lines[0] as HTMLElement | undefined;
      const second = lines[1] as HTMLElement | undefined;
      if (!first || !second) return null;
      const firstChip = first.querySelector(".semantic-live-result-display") as HTMLElement | null;
      if (!firstChip) return null;

      const firstRect = first.getBoundingClientRect();
      const secondRect = second.getBoundingClientRect();
      const chipRect = firstChip.getBoundingClientRect();
      const firstCenter = firstRect.top + firstRect.height / 2;
      const chipCenter = chipRect.top + chipRect.height / 2;

      return {
        firstHeight: firstRect.height,
        secondHeight: secondRect.height,
        centerDelta: Math.abs(firstCenter - chipCenter),
      };
    });

    expect(geometry).not.toBeNull();
    expect(Math.abs((geometry as any).firstHeight - (geometry as any).secondHeight)).toBeLessThanOrEqual(2);
    expect((geometry as any).centerDelta).toBeLessThanOrEqual(2.5);
  });

  test("suppresses live errors for incomplete and unresolved expressions", async ({ page }) => {
    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("a+");

    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-live-result-display")).toHaveCount(0);
    await expect(page.locator(".semantic-error-result")).toHaveCount(0);

    await page.keyboard.type("1");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-live-result-display")).toHaveCount(0);
    await expect(page.locator(".semantic-error-result")).toHaveCount(0);
  });

  test("can be turned off in settings", async ({ page }) => {
    await page.getByLabel("Open settings").click();
    const liveToggle = page.getByLabel("Live Result");
    await page.locator('label[for="settings-modal-live-result-enabled"]').click();
    await expect(liveToggle).not.toBeChecked();
    await page.keyboard.press("Escape");

    const editor = page.locator('[data-testid="smart-pad-editor"]');
    await editor.click();
    await page.keyboard.type("3*4");
    await waitForUIRenderComplete(page);

    await expect(page.locator(".semantic-live-result-display")).toHaveCount(0);

    await page.keyboard.type(" =>");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display")).toHaveCount(1);
    await expect(page.locator(".semantic-result-display").first()).toHaveAttribute(
      "data-result",
      "12"
    );
  });
});
