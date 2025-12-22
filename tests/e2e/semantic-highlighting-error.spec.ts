/**
 * Semantic Highlighting Error Tests
 *
 * Tests semantic highlighting error handling including:
 * - Error state highlighting
 * - Error message display
 * - Error recovery highlighting
 * - Complex error scenarios
 */

import { test, expect } from "@playwright/test";

/**
 * Tests for semantic highlighting of error messages in variable assignments
 *
 * Issue: Variable assignment expressions with errors (e.g., "total = price * (1 + tax) => ⚠️ 'price' not defined")
 * are not getting semantic highlighting applied, while regular expressions with errors do get styled.
 */
test.describe("Semantic Highlighting Error Cases", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="smart-pad-editor"]');

    // Clear any existing content
    const editor = page.locator(".ProseMirror");
    await editor.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
  });

  test("Variable assignment expressions with errors should have semantic highlighting", async ({
    page,
  }) => {
    const editor = page.locator(".ProseMirror");

    // Create the scenario from the user's example
    await editor.type("tax=0.21", { delay: 50 });
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);

    await editor.type("priwce=91", { delay: 50 }); // Intentional typo "priwce" instead of "price"
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);

    await editor.type("123*(9-price) =>", { delay: 50 });
    await page.waitForTimeout(300);
    await page.keyboard.press("Enter");

    await editor.type("total = price * (1 + tax) =>", { delay: 50 });
    await page.waitForTimeout(300);
    await page.keyboard.press("Enter");

    await editor.type("sqrt(total) =>", { delay: 50 });
    await page.waitForTimeout(300);

    // Get the HTML content to inspect semantic highlighting
    const editorContent = await editor.innerHTML();
    console.log("Editor HTML content:", editorContent);

    // Parse the content to find our specific lines
    const paragraphs = await editor.locator("p").all();
    const paragraphTexts = await Promise.all(paragraphs.map((p) => p.textContent()));
    const paragraphHTMLs = await Promise.all(paragraphs.map((p) => p.innerHTML()));

    console.log("Paragraph texts:", paragraphTexts);
    console.log("Paragraph HTMLs:", paragraphHTMLs);

    // Find the problematic line: "total = price * (1 + tax) => ⚠️ 'price' not defined"
    const totalLineIndex = paragraphTexts.findIndex(
      (text) =>
        text && text.includes("total = price * (1 + tax)") && text.includes("'price' not defined")
    );

    // Find the working line: "sqrt(total) => ⚠️ 'total' not defined"
    const sqrtLineIndex = paragraphTexts.findIndex(
      (text) => text && text.includes("sqrt(total)") && text.includes("'total' not defined")
    );

    expect(totalLineIndex).toBeGreaterThanOrEqual(0); // Make sure we found the line
    expect(sqrtLineIndex).toBeGreaterThanOrEqual(0); // Make sure we found the line

    const totalLineHTML = paragraphHTMLs[totalLineIndex];
    const sqrtLineHTML = paragraphHTMLs[sqrtLineIndex];

    console.log("Total line HTML:", totalLineHTML);
    console.log("Sqrt line HTML:", sqrtLineHTML);

    // The sqrt line should have semantic classes (this should work)
    expect(sqrtLineHTML).toContain('class="semantic-function"'); // sqrt should be styled
    expect(sqrtLineHTML).toContain('class="semantic-operator"'); // ( and ) should be styled
    expect(sqrtLineHTML).toContain('class="semantic-trigger"'); // => should be styled
    expect(sqrtLineHTML).toContain('class="semantic-error"'); // error message should be styled

    // The total line should ALSO have semantic classes (this is the bug)
    expect(totalLineHTML).toContain('class="semantic-operator"'); // = should be styled
    expect(totalLineHTML).toContain('class="semantic-operator"'); // *, (, ), + should be styled
    expect(totalLineHTML).toContain('class="semantic-trigger"'); // => should be styled
    expect(totalLineHTML).toContain('class="semantic-error"'); // error message should be styled

    // Take screenshot for debugging
    await page.screenshot({ path: "test-results/semantic-highlighting-error.png" });
  });

  test("Control: Working variable assignments should have semantic highlighting", async ({
    page,
  }) => {
    const editor = page.locator(".ProseMirror");

    // Create a working scenario for comparison
    await editor.type("price=100", { delay: 50 });
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);

    await editor.type("tax=0.21", { delay: 50 });
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);

    await editor.type("total = price * (1 + tax) =>", { delay: 50 });
    await page.waitForTimeout(300);

    // Get the HTML content for debugging
    const paragraphs = await editor.locator("p").all();
    const paragraphHTMLs = await Promise.all(paragraphs.map((p) => p.innerHTML()));
    const paragraphTexts = await Promise.all(paragraphs.map((p) => p.textContent()));

    console.log("Working scenario - all paragraphs:");
    paragraphTexts.forEach((text, i) => {
      console.log(`${i}: ${text}`);
      console.log(`   HTML: ${paragraphHTMLs[i]}`);
    });

    // Find the total line (look for line containing "total")
    const totalLineIndex = paragraphTexts.findIndex((text) => text && text.includes("total"));

    expect(totalLineIndex).toBeGreaterThanOrEqual(0); // Make sure we found the line

    const totalLineHTML = paragraphHTMLs[totalLineIndex];
    console.log("Working total line HTML:", totalLineHTML);

    // This should have semantic highlighting
    expect(totalLineHTML).toContain('class="semantic-'); // Should have some semantic classes
  });

  test("Compare different types of expressions with errors", async ({ page }) => {
    const editor = page.locator(".ProseMirror");

    // Create various error scenarios
    await editor.type("undefined_var =>", { delay: 50 }); // Simple expression
    await page.waitForTimeout(300);
    await page.keyboard.press("Enter");

    await editor.type("result = undefined_var * 2 =>", { delay: 50 }); // Assignment expression
    await page.waitForTimeout(300);
    await page.keyboard.press("Enter");

    await editor.type("sqrt(undefined_var) =>", { delay: 50 }); // Function expression
    await page.waitForTimeout(300);

    // Get all paragraph HTMLs
    const paragraphs = await editor.locator("p").all();
    const paragraphHTMLs = await Promise.all(paragraphs.map((p) => p.innerHTML()));
    const paragraphTexts = await Promise.all(paragraphs.map((p) => p.textContent()));

    console.log("All expressions with errors:");
    paragraphTexts.forEach((text, i) => {
      console.log(`${i}: ${text}`);
      console.log(`   HTML: ${paragraphHTMLs[i]}`);
    });

    // All expressions with errors should have semantic highlighting
    paragraphHTMLs.forEach((html, i) => {
      if (html.includes("⚠️") && html.includes("not defined")) {
        console.log(`Checking line ${i}: ${paragraphTexts[i]}`);

        // All error lines should have the error styled
        expect(html).toContain('class="semantic-error"');

        // All lines with => should have trigger styled
        if (html.includes("=&gt;")) {
          expect(html).toContain('class="semantic-trigger"');
        }
      }
    });
  });
});
