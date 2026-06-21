import { expect, test, type Page } from "@playwright/test";
import JSZip from "jszip";
import { setEditorText, waitForEditorReady, waitForUIRenderComplete } from "./utils";

const clearStorage = async (page: Page) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    window.localStorage.clear();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase("smartpad-db");
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => resolve();
    });
  });
};

const dropFile = async (
  page: Page,
  fileName: string,
  content: string | number[],
  mimeType: string
) => {
  await page.evaluate(
    async ({ fileName, content, mimeType }) => {
      const body = Array.isArray(content) ? new Uint8Array(content) : content;
      const file = new File([body], fileName, { type: mimeType });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      window.dispatchEvent(new DragEvent("dragover", { bubbles: true, dataTransfer }));
      window.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer }));
    },
    { fileName, content, mimeType }
  );
};

const sheetItem = (page: Page, title: string) =>
  page.locator(".sheet-item").filter({ hasText: title });

const desktopSidebar = (page: Page) => page.locator("#sheet-navigation-panel");

const typeEditorContent = async (page: Page, content: string) => {
  const editor = page.locator(".ProseMirror");
  await editor.click();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(content);
  await waitForUIRenderComplete(page);
  await page.waitForTimeout(300);
};

test.describe("Sheets persistence, import, and export", () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
    await page.goto("/");
    await waitForEditorReady(page);
  });

  test("auto-persists edited sheet content across reloads", async ({ page }) => {
    await typeEditorContent(page, "# Persistence Check\npersisted value = 123 =>");
    await expect(sheetItem(page, "Persistence Check")).toBeVisible();

    await page.reload();
    await waitForEditorReady(page);
    await waitForUIRenderComplete(page);

    await expect(sheetItem(page, "Persistence Check")).toBeVisible();
    await expect(page.locator(".ProseMirror")).toContainText("persisted value = 123 =>");
    await expect(page.locator(".semantic-result-display").first()).toHaveAttribute(
      "data-result",
      "123"
    );
  });

  test("creates, renames, trashes, and restores sheets from the desktop sidebar", async ({ page }) => {
    const sidebar = desktopSidebar(page);
    await sidebar.getByLabel("Create new sheet").click();
    await expect(page.locator(".sheet-item.active .sheet-title-text")).toContainText("Untitled");

    await page.getByRole("button", { name: "Rename Untitled" }).click();
    await page.locator(".sheet-title-input").fill("Launch Scratchpad");
    await page.locator(".sheet-title-input").press("Enter");
    await expect(sheetItem(page, "Launch Scratchpad")).toBeVisible();

    await page.getByRole("button", { name: "Move Launch Scratchpad to trash" }).click();
    await expect(sheetItem(page, "Launch Scratchpad")).toHaveCount(0);

    await page.getByRole("button", { name: "Trash", exact: true }).click();
    await expect(sheetItem(page, "Launch Scratchpad")).toBeVisible();
    await page.getByRole("button", { name: "Restore Launch Scratchpad" }).click();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(sheetItem(page, "Launch Scratchpad")).toBeVisible();
  });

  test("downloads the active sheet as markdown with current editor content", async ({ page }) => {
    await setEditorText(page, "# Export One\nsingle export = 456 =>");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download Export One" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("Export_One.md");
    const content = await download.createReadStream().then(
      (stream) =>
        new Promise<string>((resolve, reject) => {
          const chunks: Buffer[] = [];
          stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
          stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
          stream.on("error", reject);
        })
    );
    expect(content).toContain("# Export One");
    expect(content).toContain("single export = 456 =>");
  });

  test("download all exports active non-trashed sheets as a zip", async ({ page }) => {
    await typeEditorContent(page, "# First Export\nfirst value = 1 =>");
    await expect(sheetItem(page, "First Export")).toBeVisible();
    await page.waitForTimeout(1000);
    await desktopSidebar(page).getByLabel("Create new sheet").click();
    await typeEditorContent(page, "# Second Export\nsecond value = 2 =>");
    await expect(sheetItem(page, "Second Export")).toBeVisible();
    await page.waitForTimeout(1000);

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download All" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("smartpad-sheets.zip");
    const zipPath = await download.path();
    expect(zipPath).toBeTruthy();
    const zip = await JSZip.loadAsync(await import("node:fs/promises").then((fs) => fs.readFile(zipPath!)));
    const fileNames = Object.keys(zip.files);
    expect(fileNames).toEqual(expect.arrayContaining(["First_Export.md", "Second_Export.md"]));

    const first = await zip.file("First_Export.md")?.async("string");
    const second = await zip.file("Second_Export.md")?.async("string");
    expect(first).toContain("first value = 1 =>");
    expect(second).toContain("second value = 2 =>");
  });

  test("imports markdown and zip files without replacing existing sheets", async ({ page }) => {
    await setEditorText(page, "# Existing Sheet\nkeep me = 1 =>");
    await expect(sheetItem(page, "Existing Sheet")).toBeVisible();

    await dropFile(page, "Imported Sheet.md", "# Imported Sheet\nimported = 42 =>", "text/markdown");
    await expect(sheetItem(page, "Imported Sheet")).toBeVisible();
    await expect(sheetItem(page, "Existing Sheet")).toBeVisible();

    const zip = new JSZip();
    zip.file("Zip One.md", "# Zip One\nzip one = 10 =>");
    zip.file("folder/Zip Two.md", "# Zip Two\nzip two = 20 =>");
    const zipBytes = await zip.generateAsync({ type: "uint8array" });

    await dropFile(
      page,
      "Imported Pack.zip",
      Array.from(zipBytes),
      "application/zip"
    );

    await expect(sheetItem(page, "Zip One")).toBeVisible();
    await expect(sheetItem(page, "Zip Two")).toBeVisible();
    await expect(sheetItem(page, "Existing Sheet")).toBeVisible();
  });
});
