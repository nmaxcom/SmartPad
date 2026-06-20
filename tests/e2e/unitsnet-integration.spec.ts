/**
 * UnitsNet.js Integration End-to-End Tests
 *
 * Tests the complete unitsnet-js integration in the browser environment,
 * including UI interactions and real-time evaluation.
 */

import { test, expect } from "@playwright/test";
import { clearEditor, setEditorText, waitForUIRenderComplete, waitForEditorReady } from "./utils";

test.describe("UnitsNet.js Integration", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForEditorReady(page);
    await clearEditor(page);
  });

  test("should handle basic unit expressions with unitsnet-js", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.click();

    // Test basic length units
    await editor.fill("10 m =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /10 m/
    );

    // Test mass units
    await editor.fill("5 kg =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /5 kg/
    );

    // Test time units
    await editor.fill("60 s =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /^(60 s|1 min)$/
    );
  });

  test("should handle unit arithmetic with unitsnet-js", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.click();

    // Test addition with compatible units
    await editor.fill("10 m + 5 m =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /15 m/
    );

    // Test multiplication with units
    await editor.fill("10 m * 5 m =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /50 m\^2/
    );

    // Test division with units
    await editor.fill("100 m / 10 s =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /10\s*m\/?s/
    );
  });

  test("should parse compact rate-duration arithmetic without spacing", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.click();

    await editor.fill("9L/min*18min =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /162\s*L/
    );

    await editor.fill("10m/s*2s =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /20\s*m\b/
    );
  });

  test("should handle unit conversions with unitsnet-js", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.click();

    // Test metric conversions
    await editor.fill("1 km + 500 m =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /1\.5 km/
    );

    // Test imperial to metric conversions
    await editor.fill("1 ft + 0.3048 m =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /0\.61\s*m/
    );

    // Test temperature conversion
    await editor.fill("25 C to K =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /298\.15 K/
    );
  });

  test("should handle mathematical constants with unitsnet-js", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.click();

    // Test PI constant
    await editor.fill("PI =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display")).toHaveAttribute(
      "data-result",
      /3\.14159/
    );

    // Test PI with units
    await editor.fill("PI * 5 m^2 =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /15\.71\s*m\^2/
    );

    // Test E constant
    await editor.fill("E =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display", { hasText: "2.718" })).toBeVisible();
  });

  test("should handle mathematical functions with unitsnet-js", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.click();

    // Test sqrt with units
    await editor.fill("sqrt(16 m^2) =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /4 m/
    );

    // Test power operations
    await editor.fill("5 m^2 =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /5 m\^2/
    );

    // Test trigonometric functions (dimensionless)
    await editor.fill("sin(PI/2) =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /^1(\.0+)?$/
    );
  });

  test("should handle variable assignments with unitsnet-js", async ({ page }) => {
    await setEditorText(page, "<p>length = 10 m</p><p>width = 5 m</p><p>area = length * width =></p>");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display")).toHaveAttribute(
      "data-result",
      /50 m\^2/
    );

    // Reference variables
    await setEditorText(
      page,
      "<p>length = 10 m</p><p>width = 5 m</p><p>area = length * width =></p><p>area =></p>"
    );
    await waitForUIRenderComplete(page);
    await expect(
      page.locator('.semantic-result-display[data-chip-kind="trigger"]', { hasText: "50 m^2" }).last()
    ).toBeVisible();
  });

  test("should handle complex physics calculations with unitsnet-js", async ({ page }) => {
    await setEditorText(
      page,
      "<p>mass = 2 kg</p><p>acceleration = 9.8 m/s^2</p><p>force = mass * acceleration =></p>"
    );
    await waitForUIRenderComplete(page);
    await expect(page.locator('.semantic-result-display[data-chip-kind="trigger"]')).toHaveAttribute(
      "data-result",
      /19\.6\s*N/
    );

    await setEditorText(
      page,
      [
        "<p>mass = 2 kg</p>",
        "<p>acceleration = 9.8 m/s^2</p>",
        "<p>force = mass * acceleration =></p>",
        "<p>distance = 10 m</p>",
        "<p>work = force * distance =></p>",
      ].join("")
    );
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display", { hasText: "196 J" })).toBeVisible();

    await setEditorText(
      page,
      [
        "<p>mass = 2 kg</p>",
        "<p>acceleration = 9.8 m/s^2</p>",
        "<p>force = mass * acceleration =></p>",
        "<p>distance = 10 m</p>",
        "<p>work = force * distance =></p>",
        "<p>time = 5 s</p>",
        "<p>power = work / time =></p>",
      ].join("")
    );
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display", { hasText: "39.2 W" })).toBeVisible();
  });

  test("should handle temperature and energy calculations with unitsnet-js", async ({ page }) => {
    await setEditorText(
      page,
      "<p>initial_temp = 25 C</p><p>temp_change = 10 K</p><p>final_temp = initial_temp + temp_change =></p>"
    );
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display")).toHaveAttribute(
      "data-result",
      /308\.15 K/
    );

    await setEditorText(
      page,
      [
        "<p>initial_temp = 25 C</p>",
        "<p>temp_change = 10 K</p>",
        "<p>final_temp = initial_temp + temp_change =></p>",
        "<p>mass_water = 100 g</p>",
        "<p>heat_capacity = 4.18 J/(g*K)</p>",
        "<p>energy = heat_capacity * mass_water * temp_change =></p>",
      ].join("")
    );
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /4,?180\s*J/
    );
  });

  test("should handle electrical calculations with unitsnet-js", async ({ page }) => {
    await setEditorText(
      page,
      "<p>voltage = 12 V</p><p>current = 2 A</p><p>resistance = voltage / current =></p>"
    );
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display")).toHaveAttribute("data-result", /6 ohm/);

    await setEditorText(
      page,
      "<p>voltage = 12 V</p><p>current = 2 A</p><p>resistance = voltage / current =></p><p>power = voltage * current =></p>"
    );
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /24\s*W/
    );

    await setEditorText(
      page,
      [
        "<p>voltage = 12 V</p>",
        "<p>current = 2 A</p>",
        "<p>resistance = voltage / current =></p>",
        "<p>power = voltage * current =></p>",
        "<p>time = 1 h</p>",
        "<p>energy = power * time =></p>",
      ].join("")
    );
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /86,400\s*J/
    );
  });

  test("should handle error cases gracefully with unitsnet-js", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.click();

    // Test incompatible units
    await editor.fill("10 m + 5 kg =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-error-result")).toHaveAttribute("data-result", /⚠️/);

    // Test undefined variables
    await editor.fill("undefined_var =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-error-result")).toBeVisible();

    // Test invalid expressions
    await editor.fill("10 m + =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-error-result")).toBeVisible();
  });

  test("should handle smart unit conversion with unitsnet-js", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.click();

    // Test automatic prefix selection
    await editor.fill("0.001 m =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /1 mm/
    );

    await editor.fill("1000 m =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /1\s*km/
    );

    await editor.fill("0.5 m =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /0\.5\s*m/
    );
  });

  test("should handle mixed unit systems with unitsnet-js", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.click();

    // Test mixed metric and imperial
    await editor.fill("1 m + 3 ft =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display")).toHaveAttribute(
      "data-result",
      /1\.91 m/
    );

    await editor.fill("1 kg + 2 lbs =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display", { hasText: "1.91 kg" })).toBeVisible();

    // Test mixed temperature scales
    await editor.fill("25 C + 50 F =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /581\.3\s*K/
    );
  });

  test("should handle engineering templates with unitsnet-js", async ({ page }) => {
    await setEditorText(
      page,
      "<p>// Stress Analysis</p><p>force = 1000 N</p><p>area = 0.01 m^2</p><p>stress = force / area =></p>"
    );
    await waitForUIRenderComplete(page);
    await expect(page.locator('.semantic-result-display[data-chip-kind="trigger"]')).toHaveAttribute(
      "data-result",
      /100,000 Pa/
    );

    await setEditorText(
      page,
      [
        "<p>// Stress Analysis</p>",
        "<p>force = 1000 N</p>",
        "<p>area = 0.01 m^2</p>",
        "<p>stress = force / area =></p>",
        "<p>torque = 50 N*m</p>",
        "<p>radius = 0.1 m</p>",
        "<p>tangential_force = torque / radius =></p>",
      ].join("")
    );
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display", { hasText: "500 N" })).toBeVisible();
  });
});
