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

export async function clearEditor(page: Page) {
  await page.evaluate(() => {
    const editor = (window as any).tiptapEditor;
    if (!editor) {
      throw new Error("tiptapEditor is not available");
    }
    editor.commands.clearContent(true);
    editor.commands.focus("start");
    window.dispatchEvent(new Event("forceEvaluation"));
  });
  await waitForUIRenderComplete(page);
}

export async function setEditorText(page: Page, content: string) {
  await page.evaluate((nextContent: string) => {
    const editor = (window as any).tiptapEditor;
    if (!editor) {
      throw new Error("tiptapEditor is not available");
    }
    editor.commands.setContent(nextContent);
    editor.commands.focus("end");
    window.dispatchEvent(new Event("forceEvaluation"));
  }, content);
  await waitForUIRenderComplete(page);
}

export function attachDebugLogging(page: Page) {
  page.on("console", (msg) => console.log(`[browser:${msg.type()}]`, msg.text()));
  page.on("pageerror", (err) => console.log("[browser:pageerror]", err.message));
  page.on("requestfailed", (req) =>
    console.log("[browser:requestfailed]", req.url(), req.failure()?.errorText)
  );
}
