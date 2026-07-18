import { expect, test } from "@playwright/test";
import { waitForEditorReady, waitForUIRenderComplete } from "./utils";

test.describe("Inline scenario comparison", () => {
  test("saves named snapshots and compares them beside a chosen result", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      if (!window.sessionStorage.getItem("scenario-test-cleaned")) {
        window.localStorage.removeItem("smartpad-variable-baselines-v1");
        window.localStorage.removeItem("smartpad-scenario-comparisons-v1");
        window.sessionStorage.setItem("scenario-test-cleaned", "true");
      }
    });
    await page.goto("/");
    await waitForEditorReady(page);
    await waitForUIRenderComplete(page);

    const editor = page.locator(".ProseMirror");
    const variablePanel = page.getByTestId("variable-panel");
    await expect(
      variablePanel.getByRole("button", { name: /scenario|compare/i }),
    ).toHaveCount(0);

    const profitLine = editor
      .locator("p")
      .filter({ hasText: "profit = attendees" })
      .first();
    const profitChip = profitLine.locator(".semantic-result-display").first();
    await profitChip.hover();
    await profitChip.locator(".semantic-result-menu").click();
    await page
      .locator(".semantic-result-action-menu")
      .getByRole("menuitem", { name: "Set baseline" })
      .click();

    const ticketLine = editor
      .locator("p")
      .filter({ hasText: "ticket price =" })
      .first();
    const ticketLiteral = ticketLine
      .locator(".semantic-scrubbableNumber", { hasText: "32" })
      .first();
    await ticketLiteral.scrollIntoViewIfNeeded();
    const box = await ticketLiteral.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 24, startY, { steps: 4 });
    await page.mouse.up();
    await waitForUIRenderComplete(page);

    await profitChip.scrollIntoViewIfNeeded();
    await profitChip.hover();
    await profitChip.locator(".semantic-result-menu").click();
    await page
      .locator(".semantic-result-action-menu")
      .getByRole("menuitem", { name: "Save current scenario…" })
      .click();

    const namingDialog = page.getByRole("dialog", {
      name: "Save scenario for profit",
    });
    await expect(namingDialog).toBeVisible();
    await namingDialog
      .getByRole("textbox", { name: "Scenario name" })
      .fill("Higher ticket");
    await namingDialog.getByRole("button", { name: "Save" }).click();

    let comparison = editor.locator(
      '.semantic-scenario-comparison[data-pinned-variable="profit"]',
    );
    await expect(comparison).toBeVisible();
    await expect(comparison).toContainText("Scenarios · profit");
    await expect(comparison).toContainText("Base");
    await expect(comparison).toContainText("Higher ticket");
    await expect(comparison).toContainText("Live");
    await expect(
      comparison.locator(".semantic-scenario-value.is-saved"),
    ).toContainText(/^Higher ticket.*\+\d/s);
    const savedValue = await comparison
      .locator(
        ".semantic-scenario-value.is-saved .semantic-scenario-value-number",
      )
      .textContent();
    expect(savedValue).toBeTruthy();

    const liveTicketLiteral = ticketLine
      .locator(".semantic-scrubbableNumber")
      .first();
    await liveTicketLiteral.scrollIntoViewIfNeeded();
    const liveBox = await liveTicketLiteral.boundingBox();
    expect(liveBox).not.toBeNull();
    if (!liveBox) return;
    const liveStartX = liveBox.x + liveBox.width / 2;
    const liveStartY = liveBox.y + liveBox.height / 2;
    await page.mouse.move(liveStartX, liveStartY);
    await page.mouse.down();
    await page.mouse.move(liveStartX + 12, liveStartY, { steps: 3 });
    await page.mouse.up();
    await waitForUIRenderComplete(page);

    comparison = editor.locator(
      '.semantic-scenario-comparison[data-pinned-variable="profit"]',
    );
    await expect(
      comparison.locator(
        ".semantic-scenario-value.is-saved .semantic-scenario-value-number",
      ),
    ).toHaveText(savedValue || "");
    await expect(
      comparison.locator(
        ".semantic-scenario-value.is-live .semantic-scenario-value-number",
      ),
    ).not.toHaveText(savedValue || "");

    const marginLine = editor
      .locator("p")
      .filter({ hasText: "margin = profit" })
      .first();
    const marginChip = marginLine.locator(".semantic-result-display").first();
    await marginChip.scrollIntoViewIfNeeded();
    await marginChip.hover();
    await marginChip.locator(".semantic-result-menu").click();
    await page
      .locator(".semantic-result-action-menu")
      .getByRole("menuitem", { name: "Compare this result" })
      .click();

    comparison = editor.locator(
      '.semantic-scenario-comparison[data-pinned-variable="margin"]',
    );
    await expect(comparison).toBeVisible();
    await expect(comparison).toContainText("Scenarios · margin");
    await expect(
      profitLine.locator(".semantic-scenario-comparison"),
    ).toHaveCount(0);

    await page.reload();
    await waitForEditorReady(page);
    await waitForUIRenderComplete(page);
    comparison = page.locator(
      '.ProseMirror .semantic-scenario-comparison[data-pinned-variable="margin"]',
    );
    await expect(comparison).toContainText("Higher ticket");

    const reloadedMarginLine = page
      .locator(".ProseMirror p")
      .filter({ hasText: "margin = profit" })
      .first();
    const reloadedMarginChip = reloadedMarginLine
      .locator(".semantic-result-display")
      .first();
    await reloadedMarginChip.hover();
    await reloadedMarginChip.locator(".semantic-result-menu").click();
    await page
      .locator(".semantic-result-action-menu")
      .getByRole("menuitem", { name: "Clear scenarios" })
      .click();
    await expect(
      page.locator(".ProseMirror .semantic-scenario-comparison"),
    ).toHaveCount(0);
  });
});
