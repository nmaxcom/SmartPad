import { expect, Page, test } from "@playwright/test";
import { waitForEditorReady } from "./utils";

const openSheetDrawer = async (page: Page) => {
  await page.getByRole("button", { name: /Current sheet/i }).click();
  const drawer = page.locator("#sheet-navigation-panel");
  await expect(drawer).toHaveClass(/is-mobile-open/);
  return drawer;
};

test.describe("mobile sheet navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await waitForEditorReady(page);
  });

  test("sheet actions work inside the mobile drawer without closing it", async ({ page }) => {
    const drawer = await openSheetDrawer(page);

    await drawer.getByLabel("Create new sheet").click();
    await expect(drawer.locator(".sheet-item.active .sheet-title-text")).toContainText("Untitled");
    await expect(drawer).toHaveClass(/is-mobile-open/);

    await drawer.getByRole("button", { name: "Rename Untitled" }).click();
    await drawer.locator(".sheet-title-input").fill("Mobile Actions");
    await drawer.locator(".sheet-title-input").press("Enter");
    await expect(drawer.locator(".sheet-item.active .sheet-title-text")).toContainText(
      "Mobile Actions"
    );
    await expect(drawer).toHaveClass(/is-mobile-open/);

    const downloadPromise = page.waitForEvent("download");
    await drawer.getByRole("button", { name: "Download Mobile Actions" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("Mobile_Actions.md");
    await expect(drawer).toHaveClass(/is-mobile-open/);

    await drawer.getByRole("button", { name: "Move Mobile Actions to trash" }).click();
    await expect(drawer).toHaveClass(/is-mobile-open/);
    await expect(drawer.getByText("Mobile Actions")).toHaveCount(0);

    await drawer.getByRole("button", { name: "Trash", exact: true }).click();
    await expect(drawer.getByText("Mobile Actions")).toBeVisible();
    await drawer.getByRole("button", { name: "Restore Mobile Actions" }).click();
    await expect(drawer).toHaveClass(/is-mobile-open/);

    await drawer.getByRole("button", { name: "Back" }).click();
    await expect(drawer.getByText("Mobile Actions")).toBeVisible();
  });

  test("selecting a sheet closes the drawer while backdrop and close controls dismiss safely", async ({
    page,
  }) => {
    let drawer = await openSheetDrawer(page);
    await drawer.getByLabel("Create new sheet").click();
    await expect(drawer.locator(".sheet-item.active .sheet-title-text")).toContainText("Untitled");

    await drawer.getByText("Quick Tour").click();
    await expect(drawer).not.toHaveClass(/is-mobile-open/);
    await expect(page.getByRole("button", { name: /Current sheet\s+Quick Tour/i })).toBeVisible();
    await expect(page.locator('[data-testid="smart-pad-editor"]')).toBeVisible();

    drawer = await openSheetDrawer(page);
    await page.getByRole("button", { name: "Close sheet navigation" }).first().click();
    await expect(drawer).not.toHaveClass(/is-mobile-open/);

    drawer = await openSheetDrawer(page);
    await page.locator(".mobile-sheet-backdrop").click({ position: { x: 380, y: 100 } });
    await expect(drawer).not.toHaveClass(/is-mobile-open/);
    await expect(page.locator('[data-testid="smart-pad-editor"]')).toBeVisible();
  });
});
