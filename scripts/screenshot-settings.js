const fs = require("fs");
const path = require("path");
const { webkit } = require("playwright");

const distDir = path.resolve(__dirname, "..", "dist");
const assetsDir = path.join(distDir, "assets");
const baseUrl = "http://localtest/";

const getMimeType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html":
      return "text/html";
    case ".js":
      return "application/javascript";
    case ".css":
      return "text/css";
    case ".json":
      return "application/json";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    case ".ico":
      return "image/x-icon";
    case ".woff":
      return "font/woff";
    case ".woff2":
      return "font/woff2";
    default:
      return "application/octet-stream";
  }
};

const loadIndexHtml = () => {
  const indexPath = path.join(distDir, "index.html");
  const raw = fs.readFileSync(indexPath, "utf8");
  return raw
    .replaceAll('href="./assets/', `href="${baseUrl}assets/`)
    .replaceAll('src="./assets/', `src="${baseUrl}assets/`)
    .replaceAll('href="/assets/', `href="${baseUrl}assets/`)
    .replaceAll('src="/assets/', `src="${baseUrl}assets/`);
};

const resolveAssetPath = (url) => {
  const assetPrefix = `${baseUrl}assets/`;
  if (!url.startsWith(assetPrefix)) return null;
  const rel = url.slice(assetPrefix.length);
  return path.join(assetsDir, rel);
};

async function run() {
  const html = loadIndexHtml();
  const browser = await webkit.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.setDefaultTimeout(3000);

  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (url === baseUrl || url === `${baseUrl}index.html`) {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: html,
      });
      return;
    }

    const assetPath = resolveAssetPath(url);
    if (assetPath && fs.existsSync(assetPath)) {
      await route.fulfill({
        status: 200,
        contentType: getMimeType(assetPath),
        body: fs.readFileSync(assetPath),
      });
      return;
    }

    await route.fulfill({ status: 404, body: "" });
  });

  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 5000 }).catch(() => null);
  await page.waitForTimeout(600);
  await page.click('[aria-label="Open Settings"]').catch(() => null);
  await page.evaluate(() => {
    const button = document.querySelector('[aria-label="Open Settings"]');
    if (button) {
      (button instanceof HTMLElement ? button : null)?.click?.();
    }
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const heading = Array.from(document.querySelectorAll("h3"))
      .find((node) => node.textContent?.trim() === "Currency");
    if (heading) {
      heading.scrollIntoView({ block: "start" });
    }
  });
  await page.waitForTimeout(600);
  const outDir = path.resolve(__dirname, "screenshots");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outPath = path.join(outDir, "settings-modal.png");
  await page.screenshot({ path: outPath, fullPage: true });
  await browser.close();
  console.log(outPath);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
