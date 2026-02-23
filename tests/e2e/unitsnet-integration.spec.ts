/**
 * UnitsNet.js Integration End-to-End Tests
 *
 * Tests the complete unitsnet-js integration in the browser environment,
 * including UI interactions and real-time evaluation.
 */

import { test, expect } from "@playwright/test";
import { waitForUIRenderComplete, waitForEditorReady } from "./utils";

test.describe("UnitsNet.js Integration", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForEditorReady(page);
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
      /0\.60\d+\s*m/
    );

    // Test temperature conversions
    await editor.fill("25 C + 273.15 K =>");
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
      /15\.70\d+\s*m\^2/
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
    await editor.fill("5 m ^ 2 =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /25 m\^2/
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
    const editor = page.locator(".ProseMirror");
    await editor.click();

    // Assign variables with units
    await editor.fill("length = 10 m");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    await editor.fill("width = 5 m");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);

    // Use variables in calculations
    await editor.fill("area = length * width =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display")).toHaveAttribute(
      "data-result",
      /50 m\^2/
    );

    // Reference variables
    await editor.fill("area =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display", { hasText: "50 m^2" })).toBeVisible();
  });

  test("should handle complex physics calculations with unitsnet-js", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.click();

    // Set up physics problem
    await editor.fill("mass = 2 kg");
    await page.keyboard.press("Enter");

    await editor.fill("acceleration = 9.8 m/s^2");
    await page.keyboard.press("Enter");

    // Calculate force
    await editor.fill("force = mass * acceleration =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display")).toHaveAttribute(
      "data-result",
      /19\.6\s*N/
    );

    // Calculate work
    await editor.fill("distance = 10 m");
    await page.keyboard.press("Enter");

    await editor.fill("work = force * distance =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display", { hasText: "196 J" })).toBeVisible();

    // Calculate power
    await editor.fill("time = 5 s");
    await page.keyboard.press("Enter");

    await editor.fill("power = work / time =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display", { hasText: "39.2 W" })).toBeVisible();
  });

  test("should handle temperature and energy calculations with unitsnet-js", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.click();

    // Set up temperature problem
    await editor.fill("initial_temp = 25 C");
    await page.keyboard.press("Enter");

    await editor.fill("temp_change = 10 K");
    await page.keyboard.press("Enter");

    // Calculate final temperature
    await editor.fill("final_temp = initial_temp + temp_change =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display")).toHaveAttribute("data-result", /35 C/);

    // Calculate energy
    await editor.fill("mass_water = 100 g");
    await page.keyboard.press("Enter");

    await editor.fill("heat_capacity = 4.18 J/(g*K)");
    await page.keyboard.press("Enter");

    await editor.fill("energy = heat_capacity * mass_water * temp_change =>");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /4180\s*J/
    );
  });

  test("should handle electrical calculations with unitsnet-js", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.click();

    // Set up electrical problem
    await editor.fill("voltage = 12 V");
    await page.keyboard.press("Enter");

    await editor.fill("current = 2 A");
    await page.keyboard.press("Enter");

    // Calculate resistance (Ohm's Law)
    await editor.fill("resistance = voltage / current =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display")).toHaveAttribute("data-result", /6 ohm/);

    // Calculate power
    await editor.fill("power = voltage * current =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /24\s*W/
    );

    // Calculate energy
    await editor.fill("time = 1 h");
    await page.keyboard.press("Enter");

    await editor.fill("energy = power * time =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /24\s*Wh/
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
    await expect(page.locator(".semantic-result-display")).toHaveAttribute("data-result", /1 mm/);

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
      /1\.914 m/
    );

    await editor.fill("1 kg + 2 lbs =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display", { hasText: "1.907 kg" })).toBeVisible();

    // Test mixed temperature scales
    await editor.fill("25 C + 50 F =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display").last()).toHaveAttribute(
      "data-result",
      /55\s*C/
    );
  });

  test("should handle engineering templates with unitsnet-js", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.click();

    // Mechanical engineering template
    await editor.fill("// Stress Analysis");
    await page.keyboard.press("Enter");

    await editor.fill("force = 1000 N");
    await page.keyboard.press("Enter");

    await editor.fill("area = 0.01 m^2");
    await page.keyboard.press("Enter");

    await editor.fill("stress = force / area =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display")).toHaveAttribute(
      "data-result",
      /100 kPa/
    );

    // Torque calculation
    await editor.fill("torque = 50 N*m");
    await page.keyboard.press("Enter");

    await editor.fill("radius = 0.1 m");
    await page.keyboard.press("Enter");

    await editor.fill("tangential_force = torque / radius =>");
    await page.keyboard.press("Enter");
    await waitForUIRenderComplete(page);
    await expect(page.locator(".semantic-result-display", { hasText: "500 N" })).toBeVisible();
  });
});
