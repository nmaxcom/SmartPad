import { chromium, Browser, Page, BrowserContext } from "playwright";
import { Given, Before, After, BeforeAll, AfterAll, setDefaultTimeout } from "@cucumber/cucumber";
import { spawn, ChildProcess } from "child_process";

declare global {
  var browser: Browser;
  var context: BrowserContext;
  var page: Page;
  var devServer: ChildProcess | null;
}

// Increase default step timeout to reduce flakiness under CI
setDefaultTimeout(10000);

// Server management functions
async function waitForServer(url: string, timeout: number = 120000): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`✅ Dev server ready at ${url}`);
        return;
      }
    } catch (error) {
      // Server not ready yet, continue waiting
    }

    // Wait 1 second before next check
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Dev server did not start within ${timeout}ms`);
}

async function startDevServer(): Promise<ChildProcess | null> {
  console.log("🚀 Starting development server...");

  // Check if server is already running
  try {
    const response = await fetch("http://localhost:3000");
    if (response.ok) {
      console.log("📡 Dev server already running, reusing existing server");
      return null; // No process to manage, server already running
    }
  } catch (error) {
    // Server not running, we need to start it
  }

  // Start the dev server
  const serverProcess = spawn("npm", ["run", "dev"], {
    stdio: ["pipe", "pipe", "pipe"],
    shell: true,
  });

  // Handle server output
  serverProcess.stdout?.on("data", (data) => {
    const output = data.toString();
    if (output.includes("Local:") || output.includes("localhost:3000")) {
      console.log("📡 Dev server output:", output.trim());
    }
  });

  serverProcess.stderr?.on("data", (data) => {
    console.error("❌ Dev server error:", data.toString());
  });

  // Wait for server to be ready
  await waitForServer("http://localhost:3000");

  return serverProcess;
}

function stopDevServer(serverProcess: ChildProcess | null): void {
  if (serverProcess && !serverProcess.killed) {
    console.log("🛑 Stopping development server...");
    serverProcess.kill("SIGTERM");

    // Force kill if it doesn't stop gracefully
    setTimeout(() => {
      if (serverProcess && !serverProcess.killed) {
        serverProcess.kill("SIGKILL");
      }
    }, 5000);
  }
}

// Global setup: Start dev server and browser
BeforeAll(async function () {
  console.log("🚀 Starting BeforeAll setup...");

  // Start development server first
  console.log("🌐 Starting development server...");
  global.devServer = await startDevServer();
  console.log("✅ Development server ready");

  // Launch browser once for all scenarios (always headless for BDD tests)
  console.log("🌐 Launching Playwright browser...");
  global.browser = await chromium.launch({
    headless: true, // Always headless for BDD tests to avoid flashing windows
    slowMo: 0, // No slowdown for BDD tests
  });
  console.log("✅ Browser launched successfully");
  console.log("🎉 BeforeAll setup complete");
});

AfterAll(async function () {
  // Close browser after all scenarios
  if (global.browser) {
    await global.browser.close();
  }

  // Stop development server if we started it
  stopDevServer(global.devServer);
});

// Per-scenario setup
Before(async function () {
  console.log("🔧 Starting Before hook...");

  // Create new context and page for each scenario
  console.log("📱 Creating browser context...");
  global.context = await global.browser.newContext({
    viewport: { width: 1280, height: 720 },
    // Enable local storage and session storage
    storageState: undefined,
  });

  console.log("📄 Creating new page...");
  global.page = await global.context.newPage();

  // Navigate to the application
  console.log("🌐 Navigating to http://localhost:3000...");
  await global.page.goto("http://localhost:3000");
  console.log("✅ Navigation complete");

  // Wait for the application to be ready
  console.log("⏳ Waiting for smart-pad-editor element...");
  await global.page.waitForSelector('[data-testid="smart-pad-editor"]', { timeout: 10000 });
  console.log("✅ Smart pad editor found, Before hook complete");
});

After(async function () {
  // Clean up after each scenario
  if (global.context) {
    await global.context.close();
  }
});

// Helper function to get the editor element
export async function getEditor(): Promise<any> {
  return await global.page.locator('[data-testid="smart-pad-editor"]');
}

// Helper function to get the variable panel
export async function getVariablePanel(): Promise<any> {
  return await global.page.locator('[data-testid="variable-panel"]');
}

// Helper function to type text with real keyboard events
export async function typeInEditor(text: string): Promise<void> {
  // Click specifically on the TipTap editor content area
  await global.page.locator(".ProseMirror").click();
  // Type quickly to avoid step timeouts
  await global.page.locator(".ProseMirror").type(text, { delay: 0 });
}

// Helper function to press Enter with real keyboard event
export async function pressEnter(): Promise<void> {
  await global.page.keyboard.press("Enter");
}

// Helper function to get editor content
export async function getEditorContent(): Promise<string> {
  const lines = await getEditorDisplayLines();
  return lines.join("\n").trim();
}

// Helper function to get editor HTML content
export async function getEditorHTML(): Promise<string> {
  const editor = await getEditor();
  return await editor.innerHTML();
}

// Helper function to get editor lines including widget-rendered results
export async function getEditorDisplayLines(): Promise<string[]> {
  return await global.page.evaluate(() => {
    const paragraphs = Array.from(document.querySelectorAll(".ProseMirror p"));
    return paragraphs.map((p) => {
      const rawText = (p.textContent || "").replace(/\s+/g, " ").trim();
      const widget = p.querySelector(
        ".semantic-result-display, .semantic-assignment-display, .semantic-error-result"
      ) as HTMLElement | null;
      if (!widget) return rawText;

      const result = widget.getAttribute("data-result") || "";
      if (!result) return rawText;

      let baseText = rawText;
      if (widget.classList.contains("semantic-error-result") && result.includes("⚠️")) {
        baseText = baseText.replace(/\s*⚠️\s*$/, "").trim();
      }

      return `${baseText} ${result}`.replace(/\s+/g, " ").trim();
    });
  });
}

// Helper function to get variable panel content
export async function getVariablePanelContent(): Promise<string> {
  const panel = await getVariablePanel();
  return (await panel.textContent()) || "";
}

// Helper function to wait for expression evaluation (DEPRECATED - use waitForLatestEvaluation instead)
export async function waitForEvaluation(timeout: number = 8000): Promise<void> {
  console.warn("waitForEvaluation is deprecated - use waitForLatestEvaluation instead");
  await waitForLatestEvaluation(0, timeout);
}

// Helper function to wait for latest evaluation using sequence counter
export async function waitForLatestEvaluation(
  previousSeq: number,
  timeout: number = 8000
): Promise<void> {
  try {
    await global.page.waitForFunction(
      (seq) => {
        const currentSeq = (window as any).__evaluationSeq || 0;
        return currentSeq > seq;
      },
      previousSeq,
      { timeout, polling: 100 }
    );
  } catch (error) {
    // If the wait fails, provide detailed debugging information
    const currentSeq = await global.page.evaluate(() => (window as any).__evaluationSeq || 0);
    throw new Error(
      `Evaluation sequence did not advance beyond ${previousSeq} within ${timeout}ms. ` +
        `Current sequence: ${currentSeq}`
    );
  }
}

// Helper function to wait for UI render completion
export async function waitForUIRenderComplete(timeout: number = 8000): Promise<void> {
  try {
    await global.page.waitForFunction(
      () => {
        return new Promise((resolve) => {
          const timeoutId = setTimeout(() => resolve(false), 100);

          const handler = () => {
            clearTimeout(timeoutId);
            window.removeEventListener("uiRenderComplete", handler);
            resolve(true);
          };

          window.addEventListener("uiRenderComplete", handler, { once: true });
        });
      },
      { timeout, polling: 100 }
    );
  } catch (error) {
    throw new Error(`UI render completion not detected within ${timeout}ms`);
  }
}

// Unified helper to wait for SmartPad to be completely idle
// This waits for evaluation completion, UI rendering, and variable panel updates
export async function waitForSmartPadIdle(
  opts: { timeout?: number; previousSeq?: number } = {}
): Promise<void> {
  const timeout = opts.timeout || 8000;
  const previousSeq = opts.previousSeq || 0;

  try {
    // Wait for evaluation sequence to advance (if not yet advanced, still allow typing-only scenarios)
    try {
      await waitForLatestEvaluation(previousSeq, timeout);
    } catch (e) {
      // If no evaluation happened (no '=>'), proceed to UI readiness check instead of failing
    }

    // Wait for UI render completion (if an evaluation happened)
    const evalSeq = await global.page.evaluate(() => (window as any).__evaluationSeq || 0);
    const uiSeq = await global.page.evaluate(() => (window as any).__uiRenderSeq || 0);
    if (evalSeq > uiSeq) {
      await waitForUIRenderComplete(timeout);
    }

    // Wait for widget decorations only if an evaluation trigger is present
    const requiresWidget = await global.page.evaluate(() => {
      const editor = document.querySelector(".ProseMirror");
      const text = editor?.textContent || "";
      return text.includes("=>");
    });

    if (requiresWidget) {
      await global.page.waitForSelector(
        ".semantic-result-display, .semantic-assignment-display, .semantic-error-result",
        {
          state: "attached",
          timeout,
        }
      );
    }

    // Wait for variable panel rows only when an assignment occurred
    const { panelExists, needsPanelRow } = await global.page.evaluate(() => {
      const panel = !!document.querySelector('[data-testid="variable-panel"]');
      const editor = document.querySelector(".ProseMirror");
      const text = editor?.textContent || "";
      const hasAssignment = text.includes(" = ");
      return { panelExists: panel, needsPanelRow: hasAssignment };
    });

    if (panelExists && needsPanelRow) {
      await global.page.waitForSelector('[data-testid="variable-panel"] .variable-info', {
        timeout,
      });
    }
  } catch (error) {
    // Provide detailed debugging information
    const debugInfo = await global.page.evaluate(() => {
      const editor = document.querySelector(".ProseMirror");
      const widgets = document.querySelectorAll(
        ".semantic-result-display, .semantic-assignment-display, .semantic-error-result"
      );
      const panel = document.querySelector('[data-testid="variable-panel"]');

      return {
        editorContent: editor?.textContent || "",
        widgetCount: widgets.length,
        panelExists: !!panel,
        currentSeq: (window as any).__evaluationSeq || 0,
      };
    });

    throw new Error(
      `SmartPad did not reach idle state within ${timeout}ms. ` +
        `Debug info: ${JSON.stringify(debugInfo)}. ` +
        `Original error: ${error}`
    );
  }
}

// Helper function to wait for specific content to appear (including widget decorations)
export async function waitForContent(content: string, timeout: number = 3000): Promise<void> {
  try {
    await global.page.waitForFunction(
      (expectedContent) => {
        const paragraphs = Array.from(document.querySelectorAll(".ProseMirror p"));
        const lines = paragraphs.map((p) => {
          const rawText = (p.textContent || "").replace(/\s+/g, " ").trim();
          const widget = p.querySelector(
            ".semantic-result-display, .semantic-assignment-display, .semantic-error-result"
          );
          if (!widget) return rawText;

          const result = widget.getAttribute("data-result") || "";
          if (!result) return rawText;

          let baseText = rawText;
          if (widget.classList.contains("semantic-error-result") && result.includes("⚠️")) {
            baseText = baseText.replace(/\s*⚠️\s*$/, "").trim();
          }

          return `${baseText} ${result}`.replace(/\s+/g, " ").trim();
        });

        const editorText = lines.join("\n").trim();
        const bodyText = document.body.textContent || "";
        const allContent = `${editorText} ${bodyText}`;

        return allContent.includes(expectedContent);
      },
      content,
      { timeout, polling: 100 } // Poll more frequently for faster detection
    );
  } catch (error) {
    // If the wait fails, provide detailed debugging information
    const actualContent = await global.page.evaluate(() => {
      const paragraphs = Array.from(document.querySelectorAll(".ProseMirror p"));
      const displayLines = paragraphs.map((p) => {
        const rawText = (p.textContent || "").replace(/\s+/g, " ").trim();
        const widget = p.querySelector(
          ".semantic-result-display, .semantic-assignment-display, .semantic-error-result"
        );
        if (!widget) return rawText;

        const result = widget.getAttribute("data-result") || "";
        if (!result) return rawText;

        let baseText = rawText;
        if (widget.classList.contains("semantic-error-result") && result.includes("⚠️")) {
          baseText = baseText.replace(/\s*⚠️\s*$/, "").trim();
        }

        return `${baseText} ${result}`.replace(/\s+/g, " ").trim();
      });

      const bodyText = document.body.textContent || "";
      const widgets = document.querySelectorAll(
        ".semantic-result-display, .semantic-assignment-display, .semantic-error-result"
      );
      const widgetData = Array.from(widgets)
        .map((w) => w.getAttribute("data-result") || w.getAttribute("aria-label") || "")
        .join(" ");

      return {
        editorContent: displayLines.join("\n"),
        bodyContent: bodyText.substring(0, 500),
        widgetContent: widgetData,
        fullLength: bodyText.length,
      };
    });

    throw new Error(
      `Content "${content}" not found within ${timeout}ms. ` +
        `Editor content: "${actualContent.editorContent}", ` +
        `Widget content: "${actualContent.widgetContent}", ` +
        `Body content (first 500 chars): "${actualContent.bodyContent}"`
    );
  }
}

// Helper function to wait for widget decorations to appear
export async function waitForWidgetDecoration(
  expectedText: string,
  timeout: number = 3000
): Promise<void> {
  try {
    await global.page.waitForFunction(
      (text) => {
        const widgets = document.querySelectorAll(
          ".semantic-result-display, .semantic-assignment-display, .semantic-error-result"
        );
        return Array.from(widgets).some((widget) => widget.textContent?.includes(text));
      },
      expectedText,
      { timeout, polling: 100 }
    );
  } catch (error) {
    // If the wait fails, provide detailed debugging information
    const actualWidgets = await global.page.evaluate(() => {
      const widgets = document.querySelectorAll(
        ".semantic-result-display, .semantic-assignment-display, .semantic-error-result"
      );
      return Array.from(widgets).map((w) => ({
        text: w.textContent,
        className: w.className,
        tagName: w.tagName,
      }));
    });

    throw new Error(
      `Widget decoration with text "${expectedText}" not found within ${timeout}ms. ` +
        `Found widgets: ${JSON.stringify(actualWidgets)}`
    );
  }
}

// Helper function to wait for variable panel updates
export async function waitForVariablePanelUpdate(
  expectedVariable: string,
  timeout: number = 3000
): Promise<void> {
  try {
    await global.page.waitForFunction(
      (variableName) => {
        const panel = document.querySelector(".variable-panel");
        if (!panel) return false;

        const variableElements = panel.querySelectorAll(".variable-info");
        return Array.from(variableElements).some((el) => {
          const nameElement = el.querySelector(".variable-name");
          return nameElement?.textContent?.includes(variableName);
        });
      },
      expectedVariable,
      { timeout, polling: 100 }
    );
  } catch (error) {
    // If the wait fails, provide detailed debugging information
    const panelContent = await global.page.evaluate(() => {
      const panel = document.querySelector(".variable-panel");
      if (!panel) return "No variable panel found";

      const variableElements = panel.querySelectorAll(".variable-info");
      return Array.from(variableElements).map((el) => {
        const nameElement = el.querySelector(".variable-name");
        const valueElement = el.querySelector(".variable-value");
        return {
          name: nameElement?.textContent,
          value: valueElement?.textContent,
        };
      });
    });

    throw new Error(
      `Variable "${expectedVariable}" not found in panel within ${timeout}ms. ` +
        `Panel content: ${JSON.stringify(panelContent)}`
    );
  }
}

// Helper function to get detailed cursor information for debugging
export async function getCursorDebugInfo(): Promise<any> {
  return await global.page.evaluate(() => {
    const editor = (window as any).tiptapEditor;
    const editorElement = document.querySelector(".ProseMirror");

    if (!editor || !editorElement) {
      return {
        error: "Editor not available",
        editorContent: editorElement?.textContent || "No editor element",
        hasEditor: !!editor,
        hasElement: !!editorElement,
      };
    }

    const { state } = editor;
    const { selection } = state;
    const { from, to } = selection;
    const content = editor.getText();

    return {
      cursorPosition: from,
      selectionEnd: to,
      contentLength: content.length,
      content: content,
      isAtEnd: from >= content.length,
      lineAtCursor:
        content.split("\n")[Math.floor((from / content.length) * content.split("\n").length)],
      totalLines: content.split("\n").length,
    };
  });
}

// Helper function to clear editor content
export async function clearEditor(): Promise<void> {
  // Click specifically on the TipTap editor content area
  await global.page.locator(".ProseMirror").click();
  await global.page.keyboard.press("Control+a");
  await global.page.keyboard.press("Delete");
}

// Helper function to position cursor within text
export async function positionCursorInText(text: string, position: number): Promise<void> {
  const editor = await getEditor();
  await editor.click();

  // For now, we'll use a simple approach - select all text and then position
  await global.page.keyboard.press("Control+a");
  await global.page.keyboard.press("ArrowLeft");

  // Move cursor to the desired position
  for (let i = 0; i < position; i++) {
    await global.page.keyboard.press("ArrowRight");
  }
}

// Helper function to take screenshot for debugging
export async function takeScreenshot(name: string): Promise<void> {
  await global.page.screenshot({
    path: `test-results/screenshots/${name}.png`,
    fullPage: true,
  });
}
