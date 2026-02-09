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
