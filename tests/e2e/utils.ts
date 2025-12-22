import type { Page } from "@playwright/test";

export async function waitForUIRenderComplete(page: Page, timeoutMs: number = 3000) {
  await page.evaluate(
    (timeout) =>
      new Promise<void>((resolve, reject) => {
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
          window.removeEventListener("uiRenderComplete", handler as any);
        };
        window.addEventListener("uiRenderComplete", handler as any, { once: true });
        // Proactively trigger a fresh evaluation after the listener is attached
        try {
          window.dispatchEvent(new Event("forceEvaluation"));
        } catch {}
      }),
    timeoutMs
  );
}

export async function waitForEditorReady(page: Page, timeoutMs: number = 10000) {
  await page.waitForSelector('[data-testid="smart-pad-editor"]', {
    state: "attached",
    timeout: timeoutMs,
  });
  await page.waitForSelector('[data-testid="smart-pad-editor"] .ProseMirror', {
    state: "attached",
    timeout: timeoutMs,
  });
}

export function attachDebugLogging(page: Page) {
  page.on("console", (msg) => console.log(`[browser:${msg.type()}]`, msg.text()));
  page.on("pageerror", (err) => console.log("[browser:pageerror]", err.message));
  page.on("requestfailed", (req) =>
    console.log("[browser:requestfailed]", req.url(), req.failure()?.errorText)
  );
}
