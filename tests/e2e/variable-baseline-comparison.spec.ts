import { expect, test } from "@playwright/test";
import { waitForEditorReady, waitForUIRenderComplete } from "./utils";

test.describe("Variable baseline comparison", () => {
  test("captures the current model, follows scrubbing, updates, and clears", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForEditorReady(page);
    await waitForUIRenderComplete(page);

    const panel = page.getByTestId("variable-panel");
    await expect(
      panel.getByRole("button", { name: "Set baseline" }),
    ).toBeVisible();
    await expect(panel).toContainText("Capture, scrub, compare.");

    await panel.getByRole("button", { name: "Set baseline" }).click();
    const baselineBar = panel.getByTestId("variable-baseline-bar");
    await expect(baselineBar).toContainText("0 changed");

    const ticketRow = panel
      .locator(".variable-item")
      .filter({ hasText: "ticket price" })
      .first();
    const profitRow = panel
      .locator(".variable-item")
      .filter({ hasText: "profit" })
      .first();
    await expect(ticketRow).toContainText("input");
    await expect(profitRow).toContainText("derived");
    await expect(ticketRow).toContainText("Base 32 EUR");

    const ticketLiteral = page
      .locator(".semantic-scrubbableNumber", { hasText: "32" })
      .first();
    const box = await ticketLiteral.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 20, startY, { steps: 4 });
    await page.mouse.up();
    await waitForUIRenderComplete(page);

    await expect(baselineBar).not.toContainText("0 changed");
    await expect(ticketRow.locator(".variable-baseline-delta")).toHaveText(
      /^\+\d/,
    );
    await expect(profitRow).toHaveClass(/is-baseline-changed/);

    await panel.getByRole("button", { name: "Update baseline" }).click();
    await expect(baselineBar).toContainText("0 changed");

    await page.reload();
    await waitForEditorReady(page);
    await waitForUIRenderComplete(page);
    await expect(page.getByTestId("variable-baseline-bar")).toBeVisible();

    await page.getByRole("button", { name: "Clear baseline" }).click();
    await expect(page.getByTestId("variable-baseline-bar")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Set baseline" }),
    ).toBeVisible();
  });
});
