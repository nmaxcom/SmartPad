import { test, expect } from "@playwright/test";

const expectedSidebarOrder = [
  "Start Here",
  "Getting Started",
  "Syntax Playbook",
  "Everyday Calculations",
  "Privacy and Portability",
  "Troubleshooting",
  "Feature Contracts",
  "Live Results",
  "Result Chips and References",
  "Plotting and Dependency Views",
  "Currency and FX",
  "Duration and Time Values",
  "Lists",
  "Ranges",
  "Locale Date and Time",
  "File Management",
];

test.describe("Docs information architecture", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/docs/index.html");
    await page.waitForSelector(".theme-doc-sidebar-menu .menu__link");
  });

  test("uses a flat sidebar in a beginner-first order", async ({ page }) => {
    const menuLinks = page.locator(".theme-doc-sidebar-menu .menu__link");
    await expect(menuLinks.first()).toBeVisible();

    const labels = (await menuLinks.allTextContents())
      .map((text) => text.replace(/\s+/g, " ").trim())
      .filter(Boolean);

    expect(labels.slice(0, expectedSidebarOrder.length)).toEqual(expectedSidebarOrder);
    await expect(page.locator(".theme-doc-sidebar-menu .menu__caret")).toHaveCount(0);
  });

  test("renders rich example content on start and feature pages", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Start Here" })).toBeVisible();
    await expect(page.locator(".example-playground")).toHaveCount(1);

    await page.getByRole("link", { name: "Currency and FX" }).click();
    await expect(page.locator("h1", { hasText: "Currency and FX" })).toBeVisible();
    await expect(page.locator(".example-playground")).toHaveCount(5);
  });

  test("passes basic visual sanity checks for desktop and mobile", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.goto("/docs/index.html");

    const desktopShot = await page.screenshot({ fullPage: true });
    expect(desktopShot.byteLength).toBeGreaterThan(120000);

    const heroBackground = await page.locator(".doc-hero").first().evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.backgroundImage;
    });
    expect(heroBackground).not.toBe("none");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/docs/index.html");
    const mobileShot = await page.screenshot({ fullPage: true });
    expect(mobileShot.byteLength).toBeGreaterThan(70000);
  });
});
