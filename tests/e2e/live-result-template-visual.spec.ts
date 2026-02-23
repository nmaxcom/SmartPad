import { test, expect } from "@playwright/test";
import { waitForUIRenderComplete } from "./utils";

test("live result template visual check", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector('[data-testid="smart-pad-editor"]');

  const templateButton = page.getByRole("button", { name: "Live Result" });
  await expect(templateButton).toBeVisible();
  await templateButton.click();

  await waitForUIRenderComplete(page);
  await page.waitForTimeout(300);

  const liveValues = await page.$$eval(".semantic-live-result-display", (nodes) =>
    nodes.map((node) => (node as HTMLElement).getAttribute("data-result") || "")
  );
  console.log("live-result-template-values:", JSON.stringify(liveValues));
  console.log("live-result-template-count:", liveValues.length);
  expect(liveValues).toEqual(["3", "12", "14", "45", "1.81 kg", "162 L", "6", "6.28", "15"]);

  await page.screenshot({
    path: "test-results/live-result-template-visual.png",
    fullPage: true,
  });
});
