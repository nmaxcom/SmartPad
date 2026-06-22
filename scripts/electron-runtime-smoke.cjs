const { _electron: electron } = require("playwright");
const electronPath = require("electron");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const mainPath = path.join(rootDir, "desktop/electron/main.cjs");

const waitForUIRenderComplete = async (page, timeoutMs = 3000) => {
  await page.evaluate(
    (timeout) =>
      new Promise((resolve, reject) => {
        let done = false;
        const timer = setTimeout(() => {
          if (!done) {
            done = true;
            reject(new Error("uiRenderComplete timeout"));
          }
        }, timeout);
        const handler = () => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          resolve();
          window.removeEventListener("uiRenderComplete", handler);
        };
        window.addEventListener("uiRenderComplete", handler, { once: true });
        window.dispatchEvent(new Event("forceEvaluation"));
      }),
    timeoutMs
  );
};

const waitForEditorReady = async (page) => {
  await page.waitForSelector('[data-testid="smart-pad-editor"] .ProseMirror', {
    timeout: 10000,
  });
};

const setEditorText = async (page, content) => {
  const nextContent =
    content.includes("\n") && !/<[a-z][\s\S]*>/i.test(content)
      ? {
          type: "doc",
          content: content.split("\n").map((line) => ({
            type: "paragraph",
            content: line ? [{ type: "text", text: line }] : [],
          })),
        }
      : content;

  await page.evaluate((contentToSet) => {
    const editor = window.tiptapEditor;
    if (!editor) {
      throw new Error("tiptapEditor is not available");
    }
    editor.commands.setContent(contentToSet);
    editor.commands.focus("end");
    window.dispatchEvent(new Event("forceEvaluation"));
  }, nextContent);
  await waitForUIRenderComplete(page);
};

const dropFile = async (page, fileName, content, mimeType) => {
  await page.evaluate(
    async ({ fileName, content, mimeType }) => {
      const file = new File([content], fileName, { type: mimeType });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      window.dispatchEvent(new DragEvent("dragover", { bubbles: true, dataTransfer }));
      window.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer }));
    },
    { fileName, content, mimeType }
  );
};

const renameActiveSheet = async (page, title) => {
  await page.locator('.sheet-item.active button[aria-label^="Rename"]').click();
  await page.locator(".sheet-title-input").fill(title);
  await page.locator(".sheet-title-input").press("Enter");
  await page.locator(".sheet-item").filter({ hasText: title }).waitFor({ timeout: 5000 });
};

const launchApp = async (userDataDir) => {
  const app = await electron.launch({
    executablePath: electronPath,
    args: [mainPath],
    env: {
      ...process.env,
      SMARTPAD_ELECTRON_USER_DATA_DIR: userDataDir,
      SMARTPAD_ELECTRON_DOWNLOAD_DIR: path.join(userDataDir, "downloads"),
    },
  });
  const page = await app.firstWindow();
  await waitForEditorReady(page);
  return { app, page };
};

const waitForMarkdownDownload = async (directory, timeoutMs = 10000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const entries = await fs.readdir(directory);
    const markdown = entries.find((entry) => entry.endsWith(".md"));
    if (markdown) {
      return path.join(directory, markdown);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for markdown download in ${directory}`);
};

const expectText = async (page, selector, expected) => {
  const text = await page.locator(selector).innerText({ timeout: 5000 });
  if (!text.includes(expected)) {
    throw new Error(`Expected ${selector} to contain ${JSON.stringify(expected)}, got ${JSON.stringify(text)}`);
  }
};

const main = async () => {
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "smartpad-electron-smoke-"));
  const downloadDir = path.join(userDataDir, "downloads");
  await fs.mkdir(downloadDir, { recursive: true });
  console.log(`SmartPad Electron runtime smoke profile: ${userDataDir}`);

  let app;
  try {
    let launched = await launchApp(userDataDir);
    app = launched.app;
    let page = launched.page;

    await setEditorText(page, "# Desktop Persistence\npersisted desktop = 321 =>");
    await expectText(page, ".ProseMirror", "persisted desktop = 321 =>");
    await page.locator('.semantic-result-display[data-result="321"]').waitFor({ timeout: 5000 });

    const docsHref = await page.getByLabel("Open documentation").getAttribute("href");
    if (docsHref !== "./docs/index.html") {
      throw new Error(`Expected desktop docs href ./docs/index.html, got ${docsHref}`);
    }

    await page.getByLabel("Open Settings", { exact: true }).click();
    await page.getByLabel("Decimal Places").fill("4");
    await page.getByLabel("Close settings").click();

    await setEditorText(page, "# Desktop Export\nexported desktop = 654 =>");
    await page.waitForTimeout(1200);
    await renameActiveSheet(page, "Desktop Export");
    await page.waitForTimeout(500);
    await page.locator('.sheet-item.active button[aria-label^="Download"]').click();
    const exportPath = await waitForMarkdownDownload(downloadDir);
    const exported = await fs.readFile(exportPath, "utf8");
    if (!exported.includes("exported desktop = 654 =>")) {
      throw new Error(`Desktop markdown export did not include current sheet content: ${JSON.stringify(exported.slice(0, 240))}`);
    }

    await dropFile(
      page,
      "Desktop Imported.md",
      "# Desktop Imported\nimported desktop = 987 =>",
      "text/markdown"
    );
    await page.locator(".sheet-item").filter({ hasText: "Desktop Imported" }).waitFor({ timeout: 5000 });

    await page.waitForTimeout(2500);
    const body = await page.locator("body").innerText();
    if (body.includes("Live FX unavailable")) {
      throw new Error("Desktop runtime showed the top-level FX unavailable warning.");
    }

    await page.locator(".sheet-item").filter({ hasText: "Desktop Export" }).click();
    await expectText(page, ".ProseMirror", "exported desktop = 654 =>");
    await page.waitForTimeout(1200);
    await app.close();
    app = undefined;

    launched = await launchApp(userDataDir);
    app = launched.app;
    page = launched.page;

    await page.locator(".sheet-item").filter({ hasText: "Desktop Export" }).waitFor({ timeout: 10000 });
    await expectText(page, ".ProseMirror", "exported desktop = 654 =>");

    await page.getByLabel("Open Settings", { exact: true }).click();
    const decimalValue = await page.getByLabel("Decimal Places").inputValue();
    if (decimalValue !== "4") {
      throw new Error(`Expected persisted decimal places 4, got ${decimalValue}`);
    }

    console.log("SmartPad Electron runtime smoke passed.");
  } finally {
    if (app) {
      await app.close().catch(() => {});
    }
  }
};

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
