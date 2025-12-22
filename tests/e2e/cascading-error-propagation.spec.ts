/**
 * Cascading Error Propagation Tests
 *
 * Tests error propagation through dependency chains including:
 * - Immediate error propagation when dependencies change
 * - Cascading errors in complex dependency graphs
 * - Error state management and recovery
 * - Real-time error updates in the UI
 */

import { test, expect } from "@playwright/test";

/**
 * CRITICAL BUG TEST: Cascading Error Propagation
 *
 * Tests the specific bug where dependent expressions don't immediately show errors
 * when their dependencies become undefined through user typing.
 *
 * Bug Scenario:
 * 1. User types: first=1, second = first*2 =>, third = second*2 =>
 * 2. All work correctly: first=1, second => 2, third => 4
 * 3. User changes "first" to "pfirst" with a single keystroke
 * 4. BUG: Only second shows error immediately, third still shows old result
 * 5. Expected: Both second AND third should show errors immediately
 */
test.describe("Cascading Error Propagation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="smart-pad-editor"]');

    // Clear any existing content
    const editor = page.locator(".ProseMirror");
    await editor.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
  });

  test("CRITICAL BUG: Cascading errors should propagate immediately", async ({ page }) => {
    console.log("🐛 Testing cascading error propagation bug");

    const editor = page.locator(".ProseMirror");

    // Step 1: Create the working dependency chain
    console.log("Step 1: Creating working dependency chain");

    await editor.type("first=1", { delay: 50 });
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);

    await editor.type("second = first*2 =>", { delay: 50 });
    await page.waitForTimeout(200); // Wait for evaluation
    await page.keyboard.press("Enter");

    await editor.type("third = second*2 =>", { delay: 50 });
    await page.waitForTimeout(200); // Wait for evaluation

    // Verify the working state
    let editorContent = await editor.textContent();
    console.log("Working state:", editorContent);

    expect(editorContent).toContain("first=1");
    expect(editorContent).toMatch(/second = first\*2\s*=>\s*2/);
    expect(editorContent).toMatch(/third = second\*2\s*=>\s*4/);

    // Step 2: Simulate the user typing error - change "first" to "pfirst"
    console.log("Step 2: Introducing the typo");

    // More reliable cursor positioning: click at the beginning of first line
    const firstLine = editor.locator("p").first();
    await firstLine.click({ position: { x: 0, y: 10 } }); // Click at start of first paragraph
    await page.keyboard.type("p", { delay: 50 }); // Add "p" at the beginning

    // Wait for processing - this is where the bug occurs
    await page.waitForTimeout(300);

    // Step 3: Check immediate state (this is where the bug shows)
    editorContent = await editor.textContent();
    console.log("State immediately after typo:", editorContent);

    // The content should now show cascading errors
    expect(editorContent).toContain("pfirst=1"); // The new variable

    // CRITICAL TEST: Both second AND third should show errors immediately
    const hasSecondError =
      editorContent.includes("⚠️") && !!editorContent.match(/second.*first.*not defined/);
    const hasThirdError =
      editorContent.includes("⚠️") && !!editorContent.match(/third.*second.*not defined/);

    console.log("Error analysis:", {
      hasSecondError: !!hasSecondError,
      hasThirdError: !!hasThirdError,
      content: editorContent,
    });

    // This is the bug: second gets error but third might not
    expect(hasSecondError).toBe(true);
    expect(hasThirdError).toBe(true); // This might fail due to the bug

    // Additional verification: no old results should remain
    expect(editorContent).not.toMatch(/second.*=>\s*2(?!\d)/); // No "=> 2"
    expect(editorContent).not.toMatch(/third.*=>\s*4(?!\d)/); // No "=> 4"

    // Take screenshot for debugging
    await page.screenshot({ path: "test-results/cascading-error-bug.png" });
  });

  test("Control: Multiple edits should eventually show all errors", async ({ page }) => {
    console.log("🐛 Control test: Multiple edits");

    const editor = page.locator(".ProseMirror");

    // Create the same working chain
    await editor.type("first=1", { delay: 50 });
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);

    await editor.type("second = first*2 =>", { delay: 50 });
    await page.waitForTimeout(200);
    await page.keyboard.press("Enter");

    await editor.type("third = second*2 =>", { delay: 50 });
    await page.waitForTimeout(200);

    // Change "first" to "pfirst"
    const firstLine = editor.locator("p").first();
    await firstLine.click({ position: { x: 0, y: 10 } });
    await page.keyboard.type("p", { delay: 50 });
    await page.waitForTimeout(300);

    // Make another edit to trigger a "second pass"
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await editor.type("dummy = 1", { delay: 50 });
    await page.waitForTimeout(300);

    // Now check if all errors are visible (they should be)
    const editorContent = await editor.textContent();
    console.log("Content after additional edit:", editorContent);

    const hasSecondError =
      editorContent.includes("⚠️") && !!editorContent.match(/second.*first.*not defined/);
    const hasThirdError =
      editorContent.includes("⚠️") && !!editorContent.match(/third.*second.*not defined/);

    expect(hasSecondError).toBe(true);
    expect(hasThirdError).toBe(true); // Should work after multiple edits
  });

  test("Edge case: Long dependency chain", async ({ page }) => {
    console.log("🐛 Testing long dependency chain");

    const editor = page.locator(".ProseMirror");

    // Create a longer chain: a -> b -> c -> d
    await editor.type("a=10", { delay: 50 });
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);

    await editor.type("b = a + 5 =>", { delay: 50 });
    await page.waitForTimeout(200);
    await page.keyboard.press("Enter");

    await editor.type("c = b * 2 =>", { delay: 50 });
    await page.waitForTimeout(200);
    await page.keyboard.press("Enter");

    await editor.type("d = c + 1 =>", { delay: 50 });
    await page.waitForTimeout(200);

    // Verify working state
    let editorContent = await editor.textContent();
    expect(editorContent).toMatch(/b.*=>\s*15/);
    expect(editorContent).toMatch(/c.*=>\s*30/);
    expect(editorContent).toMatch(/d.*=>\s*31/);

    // Break the chain at the root
    const firstLine = editor.locator("p").first();
    await firstLine.click({ position: { x: 0, y: 10 } });
    await page.keyboard.type("x", { delay: 50 }); // Change "a" to "xa"
    await page.waitForTimeout(300);

    // All dependent variables should show errors immediately
    editorContent = await editor.textContent();
    console.log("Long chain after break:", editorContent);

    const hasBError = editorContent.match(/b.*⚠️.*a.*not defined/);
    const hasCError = editorContent.match(/c.*⚠️.*b.*not defined/);
    const hasDError = editorContent.match(/d.*⚠️.*c.*not defined/);

    expect(hasBError).toBeTruthy();
    expect(hasCError).toBeTruthy(); // This might fail due to the bug
    expect(hasDError).toBeTruthy(); // This might fail due to the bug
  });

  test("User workflow: Typing and correcting typos", async ({ page }) => {
    console.log("🐛 Testing realistic user workflow");

    const editor = page.locator(".ProseMirror");

    // User types normally
    await editor.type("price=100", { delay: 50 });
    await page.keyboard.press("Enter");
    await editor.type("tax = price * 0.08 =>", { delay: 50 });
    await page.waitForTimeout(200);
    await page.keyboard.press("Enter");
    await editor.type("total = price + tax =>", { delay: 50 });
    await page.waitForTimeout(200);

    // Verify working state
    let editorContent = await editor.textContent();
    expect(editorContent).toMatch(/tax.*=>\s*8/);
    expect(editorContent).toMatch(/total.*=>\s*108/);

    // User makes a typo - changes "price" to "pric" by accidentally deleting "e"
    const firstLine = editor.locator("p").first();
    await firstLine.click({ position: { x: 0, y: 10 } });
    await page.keyboard.type("x", { delay: 50 }); // Change "price" to "xprice" to break it
    await page.waitForTimeout(300);

    // Both dependent expressions should show errors immediately
    editorContent = await editor.textContent();
    console.log("After typo:", editorContent);

    const hasTaxError = editorContent.match(/tax.*⚠️.*price.*not defined/);
    const hasTotalError = editorContent.match(/total.*⚠️.*price.*not defined/);

    expect(hasTaxError).toBeTruthy();
    expect(hasTotalError).toBeTruthy(); // This might fail due to the bug

    // User corrects the typo by removing the "x"
    await firstLine.click({ position: { x: 0, y: 10 } });
    await page.keyboard.press("Delete"); // Remove "x"
    await page.waitForTimeout(300);

    // Everything should work again
    editorContent = await editor.textContent();
    console.log("After correction:", editorContent);

    expect(editorContent).toMatch(/tax.*=>\s*8/);
    expect(editorContent).toMatch(/total.*=>\s*108/);
    expect(editorContent).not.toContain("⚠️");
  });

  test("Mixed expressions: Some dependent, some independent", async ({ page }) => {
    console.log("🐛 Testing mixed independent/dependent expressions");

    const editor = page.locator(".ProseMirror");

    // Create mixed scenario
    await editor.type("x=5", { delay: 50 });
    await page.keyboard.press("Enter");
    await editor.type("y=10", { delay: 50 }); // Independent
    await page.keyboard.press("Enter");
    await editor.type("z = x * 2 =>", { delay: 50 }); // Depends on x
    await page.waitForTimeout(200);
    await page.keyboard.press("Enter");
    await editor.type("w = y + 3 =>", { delay: 50 }); // Depends on y
    await page.waitForTimeout(200);
    await page.keyboard.press("Enter");
    await editor.type("final = z + w =>", { delay: 50 }); // Depends on z and w
    await page.waitForTimeout(200);

    // Verify working state
    let editorContent = await editor.textContent();
    expect(editorContent).toMatch(/z.*=>\s*10/);
    expect(editorContent).toMatch(/w.*=>\s*13/);
    expect(editorContent).toMatch(/final.*=>\s*23/);

    // Break x (should affect z and final, but not w)
    const firstLine = editor.locator("p").first();
    await firstLine.click({ position: { x: 0, y: 10 } });
    await page.keyboard.type("a", { delay: 50 }); // Change "x" to "ax"
    await page.waitForTimeout(300);

    editorContent = await editor.textContent();
    console.log("After breaking x:", editorContent);

    // z should error (depends on x)
    const hasZError = editorContent.match(/z.*⚠️.*x.*not defined/);
    expect(hasZError).toBeTruthy();

    // w should still work (depends on y, which is unchanged)
    expect(editorContent).toMatch(/w.*=>\s*13/);

    // final should error (depends on z, which now has an error)
    const hasFinalError = editorContent.match(/final.*⚠️.*z.*not defined/);
    expect(hasFinalError).toBeTruthy(); // This might fail due to the bug
  });
});

test.describe("Debug Cascading Error Propagation", () => {
  test("Detailed debug of expression evaluation", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="smart-pad-editor"]');

    const editor = page.locator(".ProseMirror");

    // Create dependency chain
    await editor.click();
    await editor.type("a=10");
    await editor.press("Enter");
    await editor.type("b = a + 5 =>");
    await editor.press("Enter");
    await editor.type("c = b * 2 =>");

    // Wait for initial evaluation
    await page.waitForTimeout(200);

    // Inject debug code
    const debugInfo = await page.evaluate(() => {
      const reactiveStore = (window as any).reactiveStore;
      const editor = (window as any).tiptapEditor;

      const beforeContent = editor.getText();
      const storeState = reactiveStore.getAllVariables();

      return {
        beforeContent,
        storeState: Object.fromEntries(
          storeState.map((v) => [
            v.name,
            {
              value: v.value,
              rawValue: v.rawValue,
              hasError: typeof v.value === "string" && v.value.includes("Error:"),
            },
          ])
        ),
      };
    });

    console.log("BEFORE CHANGE:", debugInfo);

    // Navigate to first line and change "a" to "xa"
    const firstLine = editor.locator("text=a=10");
    await firstLine.click({ position: { x: 0, y: 10 } });
    await editor.press("x");

    // Wait for reactive updates
    await page.waitForTimeout(500);

    // Get detailed debug info after change
    const afterDebugInfo = await page.evaluate(() => {
      const reactiveStore = (window as any).reactiveStore;
      const editor = (window as any).tiptapEditor;
      const content = editor.getText();
      const lines = content.split("\n");

      // Get store state
      const storeState = reactiveStore.getAllVariables();

      // Manually evaluate what should happen
      const variableContext = new Map();
      storeState.forEach((variable, name) => {
        if (typeof variable.value === "number") {
          variableContext.set(name, variable);
        }
      });

      // Debug expression evaluation
      const debugEval = (expr) => {
        try {
          // Check if we can find all variables
          const vars = [];
          if (expr.includes("a")) vars.push({ name: "a", found: variableContext.has("a") });
          if (expr.includes("b")) vars.push({ name: "b", found: variableContext.has("b") });
          if (expr.includes("c")) vars.push({ name: "c", found: variableContext.has("c") });
          return { expr, vars, error: null };
        } catch (e) {
          return { expr, vars: [], error: e.message };
        }
      };

      return {
        content,
        lines,
        storeState: Object.fromEntries(
          storeState.map((v) => [
            v.name,
            {
              value: v.value,
              rawValue: v.rawValue,
              hasError: typeof v.value === "string" && v.value.includes("Error:"),
            },
          ])
        ),
        variableContextKeys: Array.from(variableContext.keys()),
        expressionDebug: {
          line1: debugEval("b = a + 5"),
          line2: debugEval("c = b * 2"),
        },
      };
    });

    console.log("AFTER CHANGE:", afterDebugInfo);

    // Verify the fix works - find the actual lines with errors
    const secondLine = afterDebugInfo.lines.find((line) => line.includes("b = a + 5"));
    const thirdLine = afterDebugInfo.lines.find((line) => line.includes("c = b * 2"));

    expect(secondLine).toContain("'a' not defined");
    expect(thirdLine).toContain("'b' not defined");
  });
});
