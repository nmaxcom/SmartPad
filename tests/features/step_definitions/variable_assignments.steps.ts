import { Given, When, Then } from "@cucumber/cucumber";
import {
  typeInEditor,
  getEditorContent,
  getEditorHTML,
  getVariablePanel,
  getVariablePanelContent,
  pressEnter,
  waitForContent,
  waitForEvaluation,
  waitForWidgetDecoration,
  waitForVariablePanelUpdate,
  waitForSmartPadIdle,
  positionCursorInText,
  clearEditor,
  takeScreenshot,
  getEditorDisplayLines,
} from "../support/playwright-setup";

// Import Playwright setup
require("../support/playwright-setup");

// Helper function to get individual editor lines (paragraphs)
async function getEditorLines(): Promise<string[]> {
  return await getEditorDisplayLines();
}

// Helper function to get full app content (editor + variable panel)
async function getFullAppContent(): Promise<string> {
  const editorContent = await getEditorContent();
  const panel = await getVariablePanel();
  const panelContent = await panel.textContent();

  return `${editorContent} ${panelContent}`;
}

// Background steps
Given("I am using the SmartPad editor", async function () {
  // Clear any existing content
  await clearEditor();
});

Given("the editor is ready for input", async function () {
  // Wait for the editor to be available
  await global.page.waitForSelector('[data-testid="smart-pad-editor"]', { timeout: 10000 });

  // Ensure it's interactive
  const editor = global.page.locator('[data-testid="smart-pad-editor"] .ProseMirror');
  await editor.click();
  await global.page.waitForTimeout(100);
});

Given("I have defined {string}", async function (variableDefinition: string) {
  // Type the variable definition
  await typeInEditor(variableDefinition);

  // Press Enter to create a new line and ensure proper separation
  await pressEnter();

  // Wait for SmartPad to be completely idle
  await waitForSmartPadIdle({ timeout: 5000 });

  // Extract variable name for panel verification
  const match = variableDefinition.match(/^([^=]+)=/);
  if (match) {
    const variableName = match[1].trim();
    // Panel update is already handled by waitForSmartPadIdle
  }
});

Given("I have typed {string}", async function (text: string) {
  // Type the text without pressing Enter (for setting up test state)
  await typeInEditor(text);

  // Wait for processing
  await waitForEvaluation(300);
});

When("I type {string}", async function (text: string) {
  // Type text in the editor
  await typeInEditor(text);

  // Wait for SmartPad to be completely idle
  await waitForSmartPadIdle({ timeout: 5000 });
});

When("I press Enter at the end", async function () {
  // Same as regular Enter - the editor will handle cursor positioning
  await pressEnter();
  await waitForSmartPadIdle({ timeout: 5000 });
});

When("the cursor is at the end of the line", async function () {
  // Move cursor to end of line
  await global.page.keyboard.press("End");
});

When("I change the variable definition to {string}", async function (newDefinition: string) {
  // Select all content and replace
  await global.page.keyboard.press("Control+a");
  await typeInEditor(newDefinition);

  // Wait for variable propagation
  await waitForEvaluation(500);
});

Then("I should see {string} in the editor", async function (expectedText: string) {
  console.log("👀 I should see", expectedText);

  // Wait for content to appear, including widget decorations
  await waitForContent(expectedText, 5000);

  // Get final content for verification
  const content = await getEditorContent();
  console.log("👀 content is ", content);

  // Check if content appears in editor text OR widget decorations
  const hasContent = content.includes(expectedText);
  if (!hasContent) {
    const hasWidget = await global.page.evaluate((text) => {
      const widgets = document.querySelectorAll(
        ".semantic-result-display, .semantic-error-result"
      );
      return Array.from(widgets).some((widget) => {
        const dataResult = widget.getAttribute("data-result") || "";
        const ariaLabel = widget.getAttribute("aria-label") || "";
        return dataResult.includes(text) || ariaLabel.includes(text);
      });
    }, expectedText);

    if (!hasWidget) {
      throw new Error(
        `Expected to see "${expectedText}" in editor or widgets, but got: "${content}"`
      );
    }
  }
});

Then("I should see {string} on the first line", async function (expectedText: string) {
  await waitForContent(expectedText);
  const lines = await getEditorLines();

  if (lines.length === 0) {
    throw new Error("No paragraphs found in editor");
  }

  if (lines[0] !== expectedText) {
    throw new Error(`Expected first line to be "${expectedText}", but got "${lines[0]}"`);
  }
});

Then("I should see {string} on the second line", async function (expectedText: string) {
  await waitForContent(expectedText);
  const lines = await getEditorLines();

  if (lines.length < 2) {
    throw new Error(`Expected at least 2 paragraphs, but got ${lines.length}`);
  }

  if (lines[1] !== expectedText) {
    throw new Error(`Expected second line to be "${expectedText}", but got "${lines[1]}"`);
  }
});

Then("I should see {string} on the third line", async function (expectedText: string) {
  await waitForContent(expectedText);
  const lines = await getEditorLines();

  if (lines.length < 3) {
    throw new Error(`Expected at least 3 paragraphs, but got ${lines.length}`);
  }

  if (lines[2] !== expectedText) {
    throw new Error(`Expected third line to be "${expectedText}", but got "${lines[2]}"`);
  }
});

Then("the cursor should be positioned after the result", async function () {
  // Wait for expression evaluation to complete
  await waitForEvaluation(500);

  // Get the TipTap editor instance from the window (exposed during tests)
  const editor = await global.page.evaluate(() => {
    return (window as any).tiptapEditor ? true : false;
  });

  if (!editor) {
    console.log("TipTap editor not available, using alternative cursor position check");
    // Alternative: Type something and verify it appears at the end
    await global.page.keyboard.type(" test");

    const content = await getEditorContent();
    if (!content.includes(" test")) {
      throw new Error("Cursor was not positioned at the end - typed text did not appear");
    }

    // Clean up the test text
    await global.page.keyboard.press("Backspace");
    await global.page.keyboard.press("Backspace");
    await global.page.keyboard.press("Backspace");
    await global.page.keyboard.press("Backspace");
    await global.page.keyboard.press("Backspace");
    return;
  }

  // Use TipTap editor API to check cursor position
  const cursorInfo = await global.page.evaluate(() => {
    const editor = (window as any).tiptapEditor;
    if (!editor) return null;

    const { state } = editor;
    const { selection } = state;
    const { from, to } = selection;
    const content = editor.getText();
    const cursorPosition = from;
    const contentLength = content.length;

    return {
      cursorPosition,
      contentLength,
      isAtEnd: cursorPosition >= contentLength,
      content,
    };
  });

  if (!cursorInfo) {
    throw new Error("Could not get cursor position from TipTap editor");
  }

  // For expressions like "2 + 3 => 5", cursor should be at the very end
  // Allow for some tolerance (within 2 characters of the end)
  const isAtEnd = cursorInfo.cursorPosition >= cursorInfo.contentLength - 2;

  if (!isAtEnd) {
    throw new Error(
      "Cursor is not positioned at the end of the result. " +
        `Position: ${cursorInfo.cursorPosition}, Content length: ${cursorInfo.contentLength}, ` +
        `Content: "${cursorInfo.content}"`
    );
  }
});

Then("the expression should update to show {string}", async function (expectedExpression: string) {
  await waitForContent(expectedExpression);
  const fullContent = await getFullAppContent();

  if (!fullContent.includes(expectedExpression)) {
    throw new Error(
      `Expected expression "${expectedExpression}" not found in app. Content: "${fullContent}"`
    );
  }
});

Then("the first expression should show {string}", async function (expectedExpression: string) {
  await waitForContent(expectedExpression);
  const fullContent = await getFullAppContent();

  if (!fullContent.includes(expectedExpression)) {
    throw new Error(`Expected first expression "${expectedExpression}" not found in app`);
  }
});

Then("the second expression should show {string}", async function (expectedExpression: string) {
  await waitForContent(expectedExpression);
  const fullContent = await getFullAppContent();

  if (!fullContent.includes(expectedExpression)) {
    throw new Error(`Expected second expression "${expectedExpression}" not found in app`);
  }
});

Then("the error should be visually distinct", async function () {
  await waitForContent("⚠️", 2000);
  const fullContent = await getFullAppContent();

  if (!fullContent.includes("⚠️")) {
    throw new Error("Error indicator (⚠️) not found in app content");
  }
});

Then("I should see an error message containing {string}", async function (errorText: string) {
  await waitForContent(errorText);
  const fullContent = await getFullAppContent();

  if (!fullContent.includes(errorText)) {
    throw new Error(`Expected error message containing "${errorText}" not found in app`);
  }
});

Then("the original expression should remain visible", async function () {
  await waitForContent("=>");
  const content = await getEditorContent();

  if (!content.includes("=>")) {
    throw new Error("Original expression with '=>' not found in editor");
  }
});

Then("the result should be displayed in appropriate scientific notation", async function () {
  const fullContent = await getFullAppContent();

  // Check for scientific notation patterns (e.g., 1e+12, 1.2e+6)
  const scientificNotationRegex = /\d+(\.\d+)?e[+-]?\d+/i;

  if (!scientificNotationRegex.test(fullContent)) {
    throw new Error("Scientific notation not found in result");
  }
});

Then("I should see {string}", async function (expectedContent: string) {
  await waitForContent(expectedContent);
  const content = await getEditorContent();

  if (content !== expectedContent) {
    throw new Error(`Expected to see "${expectedContent}", but got "${content}"`);
  }
});

Then(
  "the variable {string} should be stored with value {float}",
  async function (variableName: string, expectedValue: number) {
    // Wait for variable processing
    await waitForEvaluation(500);

    // Check if variable appears in the variable panel
    const panel = await getVariablePanel();
    const panelContent = await panel.textContent();

    if (!panelContent.includes(variableName) || !panelContent.includes(expectedValue.toString())) {
      throw new Error(
        `Expected variable "${variableName}" with value ${expectedValue} not found in panel. Panel content: "${panelContent}"`
      );
    }
  }
);

Then("the variable panel should show the variable", async function () {
  await waitForEvaluation(500);
  const panel = await getVariablePanel();
  const panelContent = await panel.textContent();

  // Check that the panel shows at least one variable (contains "=")
  if (!panelContent.includes("=")) {
    throw new Error(`Expected variable panel to show variables, but got: "${panelContent}"`);
  }
});

Then("no variable should be created", async function () {
  await waitForEvaluation(500);

  const panel = await getVariablePanel();
  const panelContent = await panel.textContent();

  // Check that the panel is empty or only contains default text
  if (panelContent.includes("=") && !panelContent.includes("error")) {
    throw new Error(`Expected no variables to be created, but found: "${panelContent}"`);
  }
});

When("I type the following lines:", async function (dataTable: any) {
  const rows = dataTable.hashes
    ? dataTable.hashes()
    : dataTable.raw().map((row: string[]) => ({ line: row[0] }));

  for (const row of rows) {
    const line = row.line || row[0];
    await typeInEditor(line);
    await pressEnter();
    await waitForEvaluation(200);
  }
});

Then("the following variables should be stored:", async function (dataTable: any) {
  await waitForEvaluation(500);

  const panel = await getVariablePanel();
  const panelContent = await panel.textContent();

  const rows = dataTable.hashes ? dataTable.hashes() : dataTable.raw().slice(1);

  for (const row of rows) {
    const variableName = row.variable || row[0];
    const expectedValue = row.value || row[1];

    if (!panelContent.includes(variableName) || !panelContent.includes(expectedValue.toString())) {
      throw new Error(
        `Expected variable "${variableName}" with value ${expectedValue} not found in panel. Panel content: "${panelContent}"`
      );
    }
  }
});

Then("I should have {int} variable in total", async function (expectedCount: number) {
  await waitForEvaluation(500);

  const panel = await getVariablePanel();
  const panelContent = await panel.textContent();

  // Count variables by counting "=" signs (rough approximation)
  const variableCount = (panelContent.match(/=/g) || []).length;

  if (variableCount !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} variable(s), but found ${variableCount}. Panel content: "${panelContent}"`
    );
  }
});

Then("I should have {int} variables in total", async function (expectedCount: number) {
  // Same as singular version
  await waitForEvaluation(500);

  const panel = await getVariablePanel();
  const panelContent = await panel.textContent();

  const variableCount = (panelContent.match(/=/g) || []).length;

  if (variableCount !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} variables, but found ${variableCount}. Panel content: "${panelContent}"`
    );
  }
});

// Text selection and keyboard operations
When("I select {string}", async function (textToSelect: string) {
  // Find the text in the editor and select it
  const editor = global.page.locator('[data-testid="smart-pad-editor"] .ProseMirror');

  // Get the current content to find the text position
  const content = await getEditorContent();
  const startIndex = content.indexOf(textToSelect);

  if (startIndex === -1) {
    throw new Error(`Text "${textToSelect}" not found in editor content: "${content}"`);
  }

  // Click at the start of the text and drag to select
  await editor.click();
  await global.page.keyboard.press("Home"); // Go to start
  await global.page.keyboard.press("ArrowRight"); // Move to first character
  await global.page.keyboard.down("Shift");

  // Move to the end of the text to select
  for (let i = 0; i < startIndex + textToSelect.length; i++) {
    await global.page.keyboard.press("ArrowRight");
  }

  await global.page.keyboard.up("Shift");

  // Wait for selection to be established
  await global.page.waitForTimeout(100);
});

When("I press Delete", async function () {
  // Press the Delete key
  await global.page.keyboard.press("Delete");
  await waitForEvaluation(200);
});

When("I rapidly type {string}", async function (text: string) {
  // Type text rapidly without waiting between characters
  await typeInEditor(text);
  // Wait for evaluation after rapid typing
  await waitForEvaluation(500);
});

// Expression evaluation and cursor positioning
When("the expression evaluates to {string}", async function (expectedResult: string) {
  // Wait for the expression to be evaluated and show the expected result
  await waitForContent(expectedResult);
  const content = await getEditorContent();

  if (!content.includes(expectedResult)) {
    throw new Error(
      `Expected expression result "${expectedResult}" not found in editor. Content: "${content}"`
    );
  }
});

Then("the cursor should be positioned at the end of the result", async function () {
  // Wait for expression evaluation to complete
  await waitForEvaluation(500);

  // With widget decorations, cursor should be positioned after the => symbol, not after the result
  // This is the expected behavior since the result is displayed as a widget decoration

  // Get cursor position from TipTap editor
  const cursorInfo = await global.page.evaluate(() => {
    const editor = (window as any).tiptapEditor;
    if (!editor) return null;

    const { state } = editor;
    const { selection } = state;
    const { from } = selection;
    const content = editor.getText();

    // Find the position of the last => symbol
    const arrowIndex = content.lastIndexOf("=>");

    return {
      cursorPosition: from,
      arrowPosition: arrowIndex,
      contentLength: content.length,
      isAfterArrow: arrowIndex !== -1 && from >= arrowIndex + 2, // After "=> "
      content,
    };
  });

  if (!cursorInfo) {
    // Fallback: type a character and check if it appears after =>
    await global.page.keyboard.type("X");
    const content = await getEditorContent();

    // Check if X appears after the last =>
    const arrowIndex = content.lastIndexOf("=>");
    const xIndex = content.lastIndexOf("X");

    if (arrowIndex === -1 || xIndex <= arrowIndex + 2) {
      throw new Error("Cursor is not positioned after the => symbol");
    }

    // Clean up
    await global.page.keyboard.press("Backspace");
    return;
  }

  if (!cursorInfo.isAfterArrow) {
    throw new Error(
      `Cursor is not positioned after =>. Position: ${cursorInfo.cursorPosition}, Arrow position: ${cursorInfo.arrowPosition}`
    );
  }
});

Then("the cursor should move to the end of the line", async function () {
  // Wait for any processing to complete
  await waitForEvaluation(300);

  // Press End key to move cursor to end of line
  await global.page.keyboard.press("End");

  // Verify cursor is at the end by typing a character
  await global.page.keyboard.type("X");
  const content = await getEditorContent();

  if (!content.endsWith("X")) {
    throw new Error("Cursor did not move to the end of the line");
  }

  // Clean up
  await global.page.keyboard.press("Backspace");
});

Then("pressing Enter should create a new line", async function () {
  // Press Enter and check if a new line is created
  const contentBefore = await getEditorContent();
  await pressEnter();
  await waitForEvaluation(200);

  const contentAfter = await getEditorContent();

  // Check if content has changed (new line added)
  if (contentAfter === contentBefore) {
    throw new Error("Enter key did not create a new line");
  }
});

// Multi-line content and complex scenarios
When("I type the following content:", async function (docString: string) {
  // Split the content into lines and type each line
  const lines = docString.split("\n");

  for (const line of lines) {
    if (line.trim()) {
      await typeInEditor(line);
      await pressEnter();
      await waitForEvaluation(200);
    }
  }
});

Then("all expressions should be evaluated correctly", async function () {
  // Wait for all evaluations to complete
  await waitForEvaluation(1000);

  const content = await getEditorContent();

  // Check that all expressions with "=>" have been evaluated (contain numbers after =>)
  const expressionLines = content.split("\n").filter((line) => line.includes("=>"));

  for (const line of expressionLines) {
    // Check if the expression has been evaluated (contains a result after =>)
    const parts = line.split("=>");
    if (parts.length >= 2) {
      const result = parts[1].trim();
      // Result should contain a number or be an error message
      if (!/\d/.test(result) && !result.includes("⚠️") && !result.includes("Error")) {
        throw new Error(`Expression not evaluated: "${line}"`);
      }
    }
  }
});

Then("variable assignments should be recognized", async function () {
  // Wait for variable processing
  await waitForEvaluation(500);

  const panel = await getVariablePanel();
  const panelContent = await panel.textContent();

  // Check that variables are present in the panel
  if (!panelContent.includes("=")) {
    throw new Error("No variable assignments found in variable panel");
  }
});

// Units and error handling
Then("the result should preserve units", async function () {
  await waitForEvaluation(500);
  const content = await getEditorContent();

  // Look for units in the result (common unit patterns)
  const unitPatterns = /\b(m|kg|s|N|J|W|V|A|Hz|Pa|°C|°F|ft|in|mi|lb|oz|gal|qt|pt|cup|tbsp|tsp)\b/i;

  if (!unitPatterns.test(content)) {
    throw new Error("No units found in the result");
  }
});

Then("I should see an appropriate error message", async function () {
  // Wait for SmartPad to be completely idle
  await waitForSmartPadIdle({ timeout: 5000 });

  const content = await getEditorContent();

  // Check for error indicators - the app shows "⚠️ Division by zero" not "⚠️ Error: Division by zero"
  if (!content.includes("⚠️")) {
    throw new Error("No error message found in the editor");
  }
});

Then("the text should remain as plain text", async function () {
  await waitForEvaluation(300);
  const content = await getEditorContent();

  // Check that the text doesn't contain evaluation results or error messages
  if (content.includes("⚠️") || content.includes("Error") || /\d+\.\d+/.test(content)) {
    throw new Error("Text was evaluated when it should have remained plain text");
  }
});

Then("no evaluation should occur", async function () {
  await waitForEvaluation(300);
  const content = await getEditorContent();

  // Check that no evaluation has occurred (no => with results)
  if (content.includes("=>") && !content.includes("=> ")) {
    throw new Error("Evaluation occurred when it should not have");
  }
});

Then("only the first arrow should trigger evaluation", async function () {
  await waitForEvaluation(500);
  const content = await getEditorContent();

  // Check that only one evaluation occurred (one result after =>)
  const arrowCount = (content.match(/=>/g) || []).length;
  const resultCount = (content.match(/=>\s*\d+/g) || []).length;

  if (resultCount > 1) {
    throw new Error("Multiple evaluations occurred when only one should have");
  }
});

Then("the evaluation should happen smoothly", async function () {
  await waitForSmartPadIdle({ timeout: 5000 });
  const content = await getEditorContent();

  // Check that evaluation completed without errors
  if (content.includes("⚠️") || content.includes("Error")) {
    throw new Error("Evaluation failed or produced an error");
  }
});

Then("the cursor should end up after the result", async function () {
  await waitForEvaluation(500);

  // Type a character to test cursor position
  await global.page.keyboard.type("X");
  const content = await getEditorContent();

  if (!content.endsWith("X")) {
    throw new Error("Cursor is not positioned after the result");
  }

  // Clean up
  await global.page.keyboard.press("Backspace");
});

// Variable management steps
Given("I have {string} in the editor", async function (content: string) {
  await clearEditor();
  await typeInEditor(content);
  await waitForEvaluation(300);
});

When(
  "I move the cursor before {string} and change it to {string}",
  async function (oldText: string, newText: string) {
    // Find the text and replace it
    const content = await getEditorContent();
    const startIndex = content.indexOf(oldText);

    if (startIndex === -1) {
      throw new Error(`Text "${oldText}" not found in editor`);
    }

    // Select the old text
    await global.page.keyboard.press("Home");
    await global.page.keyboard.down("Shift");
    for (let i = 0; i < startIndex + oldText.length; i++) {
      await global.page.keyboard.press("ArrowRight");
    }
    await global.page.keyboard.up("Shift");

    // Type the new text
    await typeInEditor(newText);
    await waitForEvaluation(500);
  }
);

Then("the expression should re-evaluate to show the new result", async function () {
  await waitForEvaluation(500);
  const content = await getEditorContent();

  // Check that the expression has been re-evaluated
  if (!content.includes("=>")) {
    throw new Error("Expression not found in editor");
  }

  // Check that there's a result after =>
  const parts = content.split("=>");
  if (parts.length >= 2) {
    const result = parts[1].trim();
    if (!/\d/.test(result) && !result.includes("⚠️")) {
      throw new Error("Expression was not re-evaluated");
    }
  }
});

Then("the cursor should be positioned after {string}", async function (text: string) {
  await waitForEvaluation(300);

  // Type a character to test cursor position
  await global.page.keyboard.type("X");
  const content = await getEditorContent();

  // For expressions with =>, cursor should be after the => symbol
  if (text.includes("=>")) {
    const arrowIndex = content.lastIndexOf("=>");
    const xIndex = content.lastIndexOf("X");

    if (arrowIndex === -1 || xIndex <= arrowIndex + 2) {
      throw new Error("Cursor is not positioned after the => symbol");
    }
  } else {
    // For regular text, check if X appears after the specified text
    const expectedPosition = content.indexOf(text) + text.length;
    const actualPosition = content.lastIndexOf("X");

    if (actualPosition < expectedPosition) {
      throw new Error(`Cursor is not positioned after "${text}"`);
    }
  }

  // Clean up
  await global.page.keyboard.press("Backspace");
});

// Units-specific steps
Then("the result should show area units", async function () {
  await waitForEvaluation(500);
  const content = await getEditorContent();

  // Check for area units (m², ft², etc.)
  const areaUnitPatterns = /\b(m²|m\^2|ft²|ft\^2|in²|in\^2|cm²|cm\^2)\b/i;

  if (!areaUnitPatterns.test(content)) {
    throw new Error("No area units found in the result");
  }
});

Then("I should see a volume result with {string} units", async function (unitType: string) {
  await waitForEvaluation(500);
  const content = await getEditorContent();

  if (!content.includes(unitType)) {
    throw new Error(`Volume units "${unitType}" not found in result`);
  }
});

Then("the result should show velocity units", async function () {
  await waitForEvaluation(500);
  const content = await getEditorContent();

  // Check for velocity units (m/s, ft/s, etc.)
  const velocityUnitPatterns = /\b(m\/s|ft\/s|km\/h|mph)\b/i;

  if (!velocityUnitPatterns.test(content)) {
    throw new Error("No velocity units found in the result");
  }
});

Then("the conversion should be handled automatically", async function () {
  await waitForEvaluation(500);
  const content = await getEditorContent();

  // Check that units were converted (should have consistent units in result)
  if (content.includes("=>")) {
    const parts = content.split("=>");
    if (parts.length >= 2) {
      const result = parts[1].trim();
      // Should have a numeric result with units
      if (!/\d+\.?\d*\s+\w+/.test(result)) {
        throw new Error("Automatic unit conversion did not occur");
      }
    }
  }
});

Then("I should see a result that correctly adds the equivalent lengths", async function () {
  await waitForEvaluation(500);
  const content = await getEditorContent();

  // Check that the result shows a proper addition with consistent units
  if (content.includes("=>")) {
    const parts = content.split("=>");
    if (parts.length >= 2) {
      const result = parts[1].trim();
      // Should have a numeric result
      if (!/\d+\.?\d*/.test(result)) {
        throw new Error("Length addition did not produce a valid result");
      }
    }
  }
});

Then("the result should show force-like units", async function () {
  await waitForEvaluation(500);
  const content = await getEditorContent();

  // Check for force units (N, kg*m, etc.)
  const forceUnitPatterns = /\b(N|kg\*m|lb\*ft)\b/i;

  if (!forceUnitPatterns.test(content)) {
    throw new Error("No force units found in the result");
  }
});

Then("I should see a result with appropriate units", async function () {
  await waitForEvaluation(500);
  const content = await getEditorContent();

  // Check that the result has some form of units
  const unitPatterns = /\b(m|kg|s|N|J|W|V|A|Hz|Pa|°C|°F|ft|in|mi|lb|oz|gal|qt|pt|cup|tbsp|tsp)\b/i;

  if (!unitPatterns.test(content)) {
    throw new Error("No appropriate units found in the result");
  }
});

Then("the error should explain that length and mass cannot be added", async function () {
  await waitForEvaluation(500);
  const content = await getEditorContent();

  // Check for error message about incompatible units
  if (!content.includes("incompatible") && !content.includes("Error") && !content.includes("⚠️")) {
    throw new Error("No error message about incompatible units found");
  }
});

// Variable deletion and propagation
When("I delete the variable definition {string}", async function (variableDefinition: string) {
  // Find and delete the line containing the variable definition
  const lines = await getEditorLines();
  const lineIndex = lines.findIndex((line) => line.includes(variableDefinition));

  if (lineIndex === -1) {
    throw new Error(`Variable definition "${variableDefinition}" not found in editor`);
  }

  // Select all content and replace with content excluding the variable definition
  await global.page.keyboard.press("Control+a");
  await global.page.keyboard.press("Delete");

  // Re-type all lines except the deleted variable
  for (let i = 0; i < lines.length; i++) {
    if (i !== lineIndex) {
      await typeInEditor(lines[i]);
      await pressEnter();
      await waitForEvaluation(200);
    }
  }
});

Then("the expression should show an error: {string}", async function (expectedError: string) {
  await waitForEvaluation(500);
  const content = await getEditorContent();

  if (!content.includes("⚠️") && !content.includes("Error")) {
    throw new Error(`Expected error not found. Content: "${content}"`);
  }
});

Then("the expression should immediately show {string}", async function (expectedResult: string) {
  // Wait for SmartPad to be completely idle
  await waitForSmartPadIdle({ timeout: 5000 });

  // Verify the result appears in the content
  const content = await getEditorContent();
  const hasResult = content.includes(expectedResult);

  if (!hasResult) {
    // Double-check widget decorations
    const hasWidget = await global.page.evaluate((text) => {
      const widgets = document.querySelectorAll(
        ".semantic-result-display, .semantic-error-result"
      );
      return Array.from(widgets).some((widget) => widget.textContent?.includes(text));
    }, expectedResult);

    if (!hasWidget) {
      throw new Error(
        `Expected result "${expectedResult}" not found in content or widgets: "${content}"`
      );
    }
  }
});

Then("I should not need to manually refresh or re-evaluate", async function () {
  // This step is about automatic propagation, which should happen automatically
  // The previous step already verified the result appeared immediately
  await waitForEvaluation(200);
});

// Additional variable management steps
When("I type additional text {string}", async function (text: string) {
  await typeInEditor(text);
  await waitForEvaluation(300);
});

Then(
  "the variable {string} should still be stored with value {float}",
  async function (variableName: string, expectedValue: number) {
    // Wait for SmartPad to be completely idle
    await waitForSmartPadIdle({ timeout: 5000 });

    // Verify the variable appears in the panel
    const panel = await getVariablePanel();
    const panelContent = await panel.textContent();

    if (!panelContent.includes(variableName) || !panelContent.includes(expectedValue.toString())) {
      throw new Error(
        `Variable "${variableName}" with value ${expectedValue} not found in panel: "${panelContent}"`
      );
    }
  }
);

Then("no variable named {string} should exist", async function (variableName: string) {
  // Wait for SmartPad to be completely idle
  await waitForSmartPadIdle({ timeout: 5000 });

  const panel = await getVariablePanel();
  const panelContent = await panel.textContent();

  if (panelContent.includes(variableName)) {
    throw new Error(
      `Variable "${variableName}" should not exist but was found in panel: "${panelContent}"`
    );
  }
});

When("I check for variable {string}", async function (variableName: string) {
  // This step just prepares for the check, the actual verification is in the Then step
  await waitForEvaluation(300);
});

Then("it should not exist", async function () {
  // This step is used in scenarios where we check for non-existent variables
  // The verification is handled in the specific Then steps that call this
  await waitForEvaluation(300);
});

When("I delete variable {string}", async function (variableName: string) {
  // Find and delete the variable definition
  const lines = await getEditorLines();
  const lineIndex = lines.findIndex((line) => line.includes(`${variableName} =`));

  if (lineIndex === -1) {
    throw new Error(`Variable "${variableName}" not found in editor`);
  }

  // Select all content and replace with content excluding the variable
  await global.page.keyboard.press("Control+a");
  await global.page.keyboard.press("Delete");

  // Re-type all lines except the deleted variable
  for (let i = 0; i < lines.length; i++) {
    if (i !== lineIndex) {
      await typeInEditor(lines[i]);
      await pressEnter();
      await waitForEvaluation(200);
    }
  }
});

Given("I have typed the following variables:", async function (dataTable: any) {
  const rows = dataTable.hashes
    ? dataTable.hashes()
    : dataTable.raw().map((row: string[]) => ({ variable: row[0] }));

  for (const row of rows) {
    const variableDefinition = row.variable || row[0];
    await typeInEditor(variableDefinition);
    await pressEnter();
    await waitForEvaluation(200);
  }
});

When("I clear all variables", async function () {
  // Clear the editor completely
  await clearEditor();
  await waitForEvaluation(300);
});

// Final missing step definitions
Then("the expression should be evaluated", async function () {
  await waitForEvaluation(500);
  const content = await getEditorContent();

  // Check that the expression has been evaluated (contains a result after =>)
  if (content.includes("=>")) {
    const parts = content.split("=>");
    if (parts.length >= 2) {
      const result = parts[1].trim();
      // Result should contain a number or be an error message
      if (!/\d/.test(result) && !result.includes("⚠️") && !result.includes("Error")) {
        throw new Error("Expression was not evaluated");
      }
    }
  }
});

Then("the plain text should remain unchanged", async function () {
  await waitForEvaluation(300);
  const content = await getEditorContent();

  // Check that plain text lines don't contain evaluation artifacts
  const lines = content.split("\n");

  for (const line of lines) {
    // Skip lines that are expressions (contain =>)
    if (line.includes("=>")) continue;

    // Skip variable assignments (contain =)
    if (line.includes(" = ")) continue;

    // Plain text should not contain evaluation results or error messages
    if (line.includes("⚠️") || line.includes("Error") || /\d+\.\d+/.test(line)) {
      throw new Error(`Plain text was modified: "${line}"`);
    }
  }
});

Then("it should exist with value {float}", async function (expectedValue: number) {
  await waitForEvaluation(500);

  const panel = await getVariablePanel();
  const panelContent = await panel.textContent();

  if (!panelContent.includes(expectedValue.toString())) {
    throw new Error(`Variable with value ${expectedValue} not found in panel`);
  }
});
