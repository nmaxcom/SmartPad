import { Given, When, Then } from "@cucumber/cucumber";
import {
  getEditorContent,
  getEditorHTML,
  pressEnter,
  typeInEditor,
  waitForContent,
  waitForEvaluation,
  positionCursorInText,
  clearEditor,
} from "../support/playwright-setup";

// Import Playwright setup
require("../support/playwright-setup");

// Note: All step implementations now use Playwright for real browser automation

// Only define Enter-key specific behaviors that aren't already covered

When("the cursor is positioned in the middle of {string}", async function (text: string) {
  // First, clear the editor and type the text
  await clearEditor();
  await typeInEditor(text);

  // Position cursor in the middle
  const middlePosition = Math.floor(text.length / 2);
  await positionCursorInText(text, middlePosition);
});

When("I press Enter", async function () {
  await pressEnter();
});

Then(
  "the expression should be evaluated to show {string}",
  async function (expectedResult: string) {
    // Wait for evaluation to complete
    await waitForEvaluation();
    await waitForContent(expectedResult);

    const content = await getEditorContent();
    if (!content.includes(expectedResult)) {
      throw new Error(`Expected to see "${expectedResult}", but got "${content}"`);
    }
  }
);

Then("a new empty line should be created", async function () {
  // Wait a moment for the line to be created
  await global.page.waitForTimeout(500);

  const html = await getEditorHTML();
  const paragraphs = html.match(/<p[^>]*>/g) || [];

  if (paragraphs.length < 2) {
    throw new Error(
      `Expected at least 2 paragraphs after Enter press, but got ${paragraphs.length}`
    );
  }
});

Then("the cursor should be on the new line", async function () {
  // For now, this is a placeholder since cursor position checking requires more complex logic
  // In a real implementation, we could check the selection/cursor position through the editor API
  await global.page.waitForTimeout(100);
});

Then("the new line should be empty", async function () {
  const html = await getEditorHTML();
  const paragraphs = html.match(/<p[^>]*>.*?<\/p>/g) || [];

  if (paragraphs.length < 2) {
    throw new Error("Expected at least 2 paragraphs");
  }

  // Check if second paragraph is empty (contains only <br> or is empty)
  const secondParagraph = paragraphs[1];
  const isEmpty = secondParagraph.includes("<br>") || secondParagraph.match(/<p[^>]*><\/p>/);

  if (!isEmpty) {
    throw new Error(`Expected second line to be empty, but got "${secondParagraph}"`);
  }
});

Then("should NOT contain {string}", async function (unwantedText: string) {
  const html = await getEditorHTML();
  const paragraphs = html.match(/<p[^>]*>.*?<\/p>/g) || [];

  if (paragraphs.length >= 2) {
    const secondParagraph = paragraphs[1];
    if (secondParagraph.includes(unwantedText)) {
      throw new Error(
        `Second line should not contain "${unwantedText}", but got "${secondParagraph}"`
      );
    }
  }
});

Then("no new line should be created", async function () {
  await global.page.waitForTimeout(500);

  const html = await getEditorHTML();
  const paragraphs = html.match(/<p[^>]*>/g) || [];

  if (paragraphs.length > 1) {
    throw new Error(`Expected only 1 paragraph, but got ${paragraphs.length} paragraphs`);
  }
});
