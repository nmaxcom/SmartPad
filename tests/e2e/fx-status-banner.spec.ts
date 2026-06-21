import { expect, test, type Page } from "@playwright/test";
import { waitForEditorReady } from "./utils";

const fxProviderHostnames = [
  "api.frankfurter.app",
  "www.ecb.europa.eu",
  "cdn.jsdelivr.net",
  "latest.currency-api.pages.dev",
];

const blockFxProviders = async (page: Page) => {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (fxProviderHostnames.some((hostname) => url.hostname === hostname)) {
      await route.abort();
      return;
    }
    await route.continue();
  });
};

const keepFawazLiveOnly = async (page: Page) => {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "cdn.jsdelivr.net" || url.hostname === "latest.currency-api.pages.dev") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          date: "2026-06-20",
          usd: { eur: 0.92, gbp: 0.79 },
        }),
      });
      return;
    }
    if (url.hostname === "api.frankfurter.app" || url.hostname === "www.ecb.europa.eu") {
      await route.abort();
      return;
    }
    await route.continue();
  });
};

test.describe("FX status banner", () => {
  test("shows a dismissible warning when all live FX providers fail and no cache exists", async ({
    page,
  }) => {
    await blockFxProviders(page);
    await page.goto("/");
    await waitForEditorReady(page);

    const banner = page.locator(".fx-status-banner--unavailable");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("Live FX unavailable");
    await banner.getByRole("button", { name: "Dismiss FX status warning" }).click();
    await expect(banner).not.toBeVisible();
  });

  test("does not warn when providers fail but a fresh cached snapshot exists", async ({ page }) => {
    await blockFxProviders(page);
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "smartpad-fx-cache-fawazahmed0",
        JSON.stringify({
          base: "USD",
          provider: "fawazahmed0",
          fetchedAt: Date.now(),
          sourceDate: "2026-06-20",
          rates: { eur: 0.92, gbp: 0.79 },
        })
      );
    });
    await page.goto("/");
    await waitForEditorReady(page);

    await expect(page.locator(".fx-status-banner")).not.toBeVisible();
  });

  test("warns when providers fail and only stale cached rates exist", async ({ page }) => {
    await blockFxProviders(page);
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "smartpad-fx-cache-fawazahmed0",
        JSON.stringify({
          base: "USD",
          provider: "fawazahmed0",
          fetchedAt: Date.now() - 25 * 60 * 60 * 1000,
          sourceDate: "2026-06-19",
          rates: { eur: 0.92, gbp: 0.79 },
        })
      );
    });
    await page.goto("/");
    await waitForEditorReady(page);

    const banner = page.locator(".fx-status-banner--unavailable");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("Live FX unavailable");
  });

  test("does not warn when fallback FX is live even if primary cache is old", async ({ page }) => {
    await keepFawazLiveOnly(page);
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "smartpad-fx-cache",
        JSON.stringify({
          base: "EUR",
          provider: "frankfurter",
          fetchedAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
          sourceDate: "2026-03-14",
          rates: { USD: 1.09, GBP: 0.84 },
        })
      );
    });
    await page.goto("/");
    await waitForEditorReady(page);

    await expect(page.locator(".fx-status-banner")).not.toBeVisible();
  });
});
