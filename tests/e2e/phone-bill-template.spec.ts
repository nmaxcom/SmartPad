/**
 * Phone Bill template smoke test
 *
 * Loads the template and reports any evaluation errors.
 */

import { test, expect } from "@playwright/test";
import { waitForEditorReady, waitForUIRenderComplete } from "./utils";

test.describe("Phone Bill Template", () => {
  test("loads without evaluation errors", async ({ page }) => {
    await page.goto("http://localhost:3000");
    await waitForEditorReady(page);

    await page.locator(".template-button", { hasText: "Phone Bill" }).click();
    await waitForUIRenderComplete(page);

    const errorResults = page.locator(".semantic-error-result");
    const errorCount = await errorResults.count();
    if (errorCount > 0) {
      const messages = await errorResults.evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-result") || "")
      );
      throw new Error(`Phone Bill template produced errors: ${messages.join(" | ")}`);
    }

    await expect(
      page
        .locator(".ProseMirror p", {
          hasText: "data overage fee = data overage rate * data overage gb",
        })
        .locator(".semantic-result-display")
    ).toHaveAttribute("data-result", "$18.75");

    await expect(
      page
        .locator(".ProseMirror p", {
          hasText: "subtotal = base plan + line access + data overage fee",
        })
        .locator(".semantic-result-display")
    ).toHaveAttribute("data-result", "$73.75");

    const results = await page
      .locator(".semantic-result-display")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-result") || "")
      );
    expect(results.length).toBeGreaterThan(0);
    console.log("Phone Bill results:", results);
  });
});
