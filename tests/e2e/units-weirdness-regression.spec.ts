import { test, expect } from "@playwright/test";

test.describe("Units: replicate user-reported weirdness and guard against regressions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="smart-pad-editor"]');
    const editor = page.locator(".ProseMirror");
    await editor.click();
    // clear
    await page.keyboard.press("Meta+a");
    await page.keyboard.press("Delete");
    // capture evaluation events for debugging
    await page.evaluate(() => {
      (window as any).__lastRenderNodes = [];
      window.addEventListener("evaluationDone", (e: any) => {
        (window as any).__lastRenderNodes = e?.detail?.renderNodes || [];
      });
    });
  });

  test("Scenario from screenshot: area/width and distance/time", async ({ page }) => {
    const editor = page.locator(".ProseMirror");

    // length = 10 m
    await editor.type("length = 10 m");
    await page.keyboard.press("Enter");

    // width = 14 m
    await editor.type("width = 14 m");
    await page.keyboard.press("Enter");

    // area = length * width =>
    await editor.type("area = length * width =>");
    await page.waitForSelector(".semantic-result-display", { timeout: 2000 });
    // Expect a result widget showing 140 m^2 on the same line
    const para3 = page.locator(".ProseMirror p").last();
    let paraText = (await para3.textContent()) || "";
    const debugRNs = (await page.evaluate(() => (window as any).__lastRenderNodes)) as any[];
    console.log(
      "DEBUG RNs after area line:",
      debugRNs?.map((r) => ({
        type: r.type,
        line: r.line,
        originalRaw: r.originalRaw,
        from: r.from,
        to: r.to,
        displayText: r.displayText,
      }))
    );
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /140 m\^2/
    );

    await page.keyboard.press("Enter");

    // area =>
    await editor.type("area =>");
    await page.waitForSelector(".semantic-result-display", { timeout: 2000 });
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /140 m\^2/
    );

    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");

    // distance = 25 m
    await editor.type("distance=25 m");
    await page.keyboard.press("Enter");

    // time = 51 s
    await editor.type("time=51 s");
    await page.keyboard.press("Enter");

    // speed = distance / time =>
    await editor.type("speed=distance/time=>");
    await page.waitForSelector(".semantic-result-display", { timeout: 2000 });
    // Should be approximately 0.49 m/s (units allowed to vary formatting)
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /0\.4\d+\s*m\/?s/
    );

    await page.keyboard.press("Enter");

    // speed =>
    await editor.type("speed=>");
    await page.waitForSelector(".semantic-result-display", { timeout: 2000 });
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /0\.4\d+\s*m\/?s/
    );

    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");

    // First, malformed spacing to ensure we show an error and not reuse a previous widget
    await editor.type("3 m*5 m=>");
    await page.waitForSelector(".semantic-error-result", { timeout: 2000 });
    const errText = await page.locator(".semantic-error-result").last().getAttribute("data-result");
    expect.soft(errText || "").toMatch(/Unexpected token/i);

    await page.keyboard.press("Enter");

    // Now with proper spacing it should compute area
    await editor.type("3 m * 5 m =>");
    await page.waitForSelector(".semantic-result-display", { timeout: 2000 });
    // Expect 15 m^2 and not to echo a previous variable assignment
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /15 m\^2/
    );
  });

  test("pressure converted to psi keeps work invariant when reused", async ({ page }) => {
    const editor = page.locator(".ProseMirror");

    await editor.type("pressure psi = 101 kPa to psi");
    await page.keyboard.press("Enter");
    await editor.type("pressure si = 101 kPa");
    await page.keyboard.press("Enter");
    await editor.type("volume = 2 L");
    await page.keyboard.press("Enter");
    await editor.type("work psi = pressure psi * volume =>");
    await page.keyboard.press("Enter");
    await editor.type("work si = pressure si * volume =>");

    const results = page.locator(".semantic-result-display");
    await expect(results.nth(0)).toHaveAttribute("data-result", /202(?:\.0+)?\s*J/);
    await expect(results.nth(1)).toHaveAttribute("data-result", /202(?:\.0+)?\s*J/);
  });
});
