import { expect, test, type Page } from "@playwright/test";
import { waitForEditorReady, waitForUIRenderComplete } from "./utils";

const setEditorContent = async (page: Page, html: string) => {
  await page.evaluate((content) => {
    const editor = (window as any).tiptapEditor;
    editor?.commands?.setContent(content);
    window.dispatchEvent(new Event("forceEvaluation"));
  }, html);
  await waitForUIRenderComplete(page);
};

const getAxisLabels = async (page: Page, plotIndex = 0) =>
  page.locator(".plot-view svg").nth(plotIndex).evaluate((svg: SVGSVGElement) =>
    Array.from(svg.querySelectorAll("text.plot-view-axis-text")).map((node) => node.textContent)
  );

const getXAxisLabels = async (page: Page, plotIndex = 0) => {
  const labels = await getAxisLabels(page, plotIndex);
  return labels.slice(0, Math.floor(labels.length / 2));
};

const getYAxisLabels = async (page: Page, plotIndex = 0) => {
  const labels = await getAxisLabels(page, plotIndex);
  return labels.slice(Math.floor(labels.length / 2));
};

const axisLabelToNumber = (label: string | null) =>
  Number(String(label || "").replace(/,/g, ""));

const wheelPlotCenter = async (page: Page, deltaY: number) => {
  const box = await page.locator(".plot-view svg").first().boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.wheel(0, deltaY);
};

const doubleClickPlotCenter = async (page: Page) => {
  const box = await page.locator(".plot-view svg").first().boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.dblclick(box!.x + box!.width / 2, box!.y + box!.height / 2);
};

test.describe("Plot view interactions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForEditorReady(page);
  });

  test("keeps wheel zoom on y-bound persistent plots until explicit reset", async ({ page }) => {
    await setEditorContent(
      page,
      "<p>slope = 2</p><p>x = 5</p><p>y = x * slope =&gt;</p><p>@view plot x=x y=y domain=0..10 size=md</p>"
    );

    await expect(page.locator(".plot-view").first()).toBeVisible();
    await expect(page.locator(".plot-view-disconnected")).toHaveCount(0);

    const initialLabels = await getAxisLabels(page);
    const initialXLabels = await getXAxisLabels(page);
    await wheelPlotCenter(page, -800);
    await page.waitForTimeout(300);

    const zoomedLabels = await getAxisLabels(page);
    expect(zoomedLabels).not.toEqual(initialLabels);

    await page.waitForTimeout(400);
    await expect.poll(() => getAxisLabels(page)).toEqual(zoomedLabels);

    await setEditorContent(
      page,
      "<p>slope = 3</p><p>x = 5</p><p>y = x * slope =&gt;</p><p>@view plot x=x y=y domain=0..10 size=md</p>"
    );
    await expect.poll(() => getAxisLabels(page)).toEqual(zoomedLabels);

    await doubleClickPlotCenter(page);
    await page.waitForTimeout(300);
    await expect.poll(() => getXAxisLabels(page)).toEqual(initialXLabels);
    expect(await getAxisLabels(page)).not.toEqual(zoomedLabels);
  });

  test("plots user-defined function calls through named series", async ({ page }) => {
    await setEditorContent(
      page,
      "<p>// Calculates area of a circle</p><p>area(r) = PI * r^2</p><p>x = 30</p><p>arei = area(x)</p><p>@view y=arei x=x domain=0..30</p>"
    );

    await expect(page.locator(".plot-view").first()).toBeVisible();
    await expect(page.locator(".plot-view-disconnected")).toHaveCount(0);
    await expect(page.locator(".plot-view")).not.toContainText("No plottable data");
    await expect(page.locator(".plot-view-line").first()).toBeVisible();
  });

  test("keeps polynomial plots scaled to the visible domain and clipped inside axes", async ({
    page,
  }) => {
    await setEditorContent(
      page,
      "<p>x = 30</p><p>y = x^2</p><p>@view plot x=x y=y size=sm</p>"
    );

    await expect(page.locator(".plot-view").first()).toBeVisible();
    await expect(page.locator(".plot-view-disconnected")).toHaveCount(0);
    await expect(page.locator(".plot-view-line").first()).toBeVisible();

    const yLabels = (await getYAxisLabels(page)).map(axisLabelToNumber);
    const finiteLabels = yLabels.filter(Number.isFinite);
    expect(Math.max(...finiteLabels)).toBeLessThan(6000);

    const clipPath = await page
      .locator(".plot-view-line")
      .first()
      .evaluate((line) =>
        line.parentElement?.getAttribute("clip-path") || ""
      );
    expect(clipPath).toMatch(/^url\(#plot-clip-\d+\)$/);
  });

  test("uses the same visible y scale for automatic and equivalent explicit domains", async ({
    page,
  }) => {
    await setEditorContent(
      page,
      [
        "<p>area(r) = PI * r^2</p>",
        "<p>x = 30</p>",
        "<p>arei = area(x)</p>",
        "<p>@view plot x=x y=arei size=sm</p>",
        "<p>@view plot x=x y=arei domain=-6..66 size=sm</p>",
      ].join("")
    );

    await expect(page.locator(".plot-view")).toHaveCount(2);
    await expect(page.locator(".plot-view-disconnected")).toHaveCount(0);

    const autoYLabels = (await getYAxisLabels(page, 0)).map(axisLabelToNumber);
    const explicitYLabels = (await getYAxisLabels(page, 1)).map(axisLabelToNumber);
    const autoMax = Math.max(...autoYLabels.filter(Number.isFinite));
    const explicitMax = Math.max(...explicitYLabels.filter(Number.isFinite));

    expect(autoMax).toBeLessThan(20000);
    expect(explicitMax).toBeLessThan(20000);
    expect(Math.abs(autoMax - explicitMax)).toBeLessThan(1000);
  });
});
