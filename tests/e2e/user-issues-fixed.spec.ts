/**
 * User Issues Fixed Tests
 *
 * Tests fixes for reported user issues including:
 * - Bug fixes validation
 * - User workflow verification
 * - Issue resolution confirmation
 * - User experience improvements
 */

import { test, expect } from "@playwright/test";
import { waitForEditorReady, waitForUIRenderComplete } from "./utils";

test.describe("User Issues Fixed", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForEditorReady(page);
  });

  test("assignment values stay in the text (no assignment widget)", async ({ page }) => {
    const pm = page.locator(".ProseMirror");
    await pm.click();
    await pm.type("boiling_point = 100 °C");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    await expect(page.locator(".semantic-assignment-display")).toHaveCount(0);

    const variablesPanel = await page.locator('[data-testid="variable-panel"]').textContent();
    expect(variablesPanel || "").toContain("boiling_point");
    expect(variablesPanel || "").toContain("°C");
  });

  test("currency arithmetic preserves currency and scrubbing keeps the symbol", async ({ page }) => {
    const pm = page.locator(".ProseMirror");
    await pm.click();
    await pm.type("money = $20");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    await pm.type("money / 2 =>");
    await waitForUIRenderComplete(page);

    const result = await page
      .locator(".semantic-result-display")
      .last()
      .getAttribute("data-result");
    expect(result || "").toContain("$10");

    const number = page.locator(".semantic-scrubbableNumber", { hasText: "20" }).first();
    const box = await number.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2);
    await page.mouse.up();

    const lineText = await page.locator(".ProseMirror p").first().textContent();
    expect(lineText || "").toMatch(/money\s*=\s*\$\d/);
  });

  test("percentage variables and phrase variables resolve correctly", async ({ page }) => {
    const pm = page.locator(".ProseMirror");
    await pm.click();
    await pm.type("pct = 20%");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    await pm.type("pct off $80 =>");
    await waitForUIRenderComplete(page);

    const pctResult = await page
      .locator(".semantic-result-display")
      .last()
      .getAttribute("data-result");
    expect(pctResult || "").toContain("$64");

    await page.keyboard.press("Enter");
    await pm.type("number of friends = 6");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    await pm.type("number of friends =>");
    await waitForUIRenderComplete(page);

    const friendsResult = await page
      .locator(".semantic-result-display")
      .last()
      .getAttribute("data-result");
    expect(friendsResult || "").toBe("6");
  });

  test("phrase variables containing 'of' work in expressions", async ({ page }) => {
    const pm = page.locator(".ProseMirror");
    await pm.click();
    await pm.type("pizza total cost = 18.99");
    await page.keyboard.press("Enter");
    await pm.type("number of friends = 6");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    await pm.type("pizza total cost / number of friends =>");
    await waitForUIRenderComplete(page);

    const result = await page
      .locator(".semantic-result-display")
      .last()
      .getAttribute("data-result");
    expect(result || "").toMatch(/3\.16/);
  });

  test("percentage of a unit value keeps units", async ({ page }) => {
    const pm = page.locator(".ProseMirror");
    await pm.click();
    await pm.type("10% of 155 N =>");
    await waitForUIRenderComplete(page);

    const result = await page
      .locator(".semantic-result-display")
      .last()
      .getAttribute("data-result");
    expect(result || "").toMatch(/15\.5\s*N/);
  });

  test("math functions and parentheses evaluate correctly", async ({ page }) => {
    const pm = page.locator(".ProseMirror");
    await pm.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");

    await pm.type("abs(-4.2) =>");
    await waitForUIRenderComplete(page);

    const absResult = await page
      .locator(".semantic-result-display")
      .last()
      .getAttribute("data-result");
    expect(absResult || "").toBe("4.2");

    await page.keyboard.press("Enter");
    await pm.type("(3.5 + 2.1) * 4 =>");
    await waitForUIRenderComplete(page);

    const parenResult = await page
      .locator(".semantic-result-display")
      .last()
      .getAttribute("data-result");
    expect(parenResult || "").toBe("22.4");
  });

  test("results are selectable text and copyable", async ({ page }) => {
    const pm = page.locator(".ProseMirror");
    await pm.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");

    await pm.type("2 + 3 =>");
    await waitForUIRenderComplete(page);

    await expect(page.locator(".semantic-result-display").last()).toContainText("5");

    await page.evaluate(() => {
      const paragraph = document.querySelector(".ProseMirror p");
      if (!paragraph) return;
      const range = document.createRange();
      range.selectNodeContents(paragraph);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    });

    const selectionText = await page.evaluate(() => window.getSelection()?.toString() || "");
    expect(selectionText).toContain("5");
  });

  test("unit conversions show the correct result for the line", async ({ page }) => {
    const pm = page.locator(".ProseMirror");
    await pm.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");

    await pm.type("distance = 150 m");
    await page.keyboard.press("Enter");
    await pm.type("time = 28 s");
    await page.keyboard.press("Enter");
    await pm.type("velocity = distance / time =>");
    await page.keyboard.press("Enter");
    await pm.type("velocity to km/h =>");
    await waitForUIRenderComplete(page);

    const line = page.locator(".ProseMirror p", { hasText: "velocity to km/h" }).first();
    const result = await line.locator(".semantic-result-display").getAttribute("data-result");
    expect(result || "").toContain("km/h");
    expect(result || "").not.toContain("time =");
  });

  test("incomplete unit errors clear once the unit is completed", async ({ page }) => {
    await page.evaluate(() => {
      (window as any).tiptapEditor?.commands?.setContent("<p>len = missingVar</p>");
      window.dispatchEvent(new Event("forceEvaluation"));
    });
    await waitForUIRenderComplete(page);

    await expect(page.locator(".semantic-error-result")).toHaveCount(1);

    await page.evaluate(() => {
      (window as any).tiptapEditor?.commands?.setContent("<p>len = 23 km</p>");
      window.dispatchEvent(new Event("forceEvaluation"));
    });
    await waitForUIRenderComplete(page);

    await expect(page.locator(".semantic-error-result")).toHaveCount(0);
  });
});
