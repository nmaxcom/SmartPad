import { Given, When, Then } from "@cucumber/cucumber";
import {
  typeInEditor,
  getEditorContent,
  waitForContent,
  clearEditor,
} from "../support/playwright-setup";

// Import Playwright setup
require("../support/playwright-setup");

Given("I have the SmartPad application open", async function () {
  // The application is already loaded in the Before hook
  // Just ensure we have a clean editor state
  await clearEditor();
});

When("I type {string} in the editor", async function (text: string) {
  await typeInEditor(text);
});

Then("I should see {string} displayed in the editor", async function (expectedText: string) {
  await waitForContent(expectedText);
  const content = await getEditorContent();

  if (!content.includes(expectedText)) {
    throw new Error(`Expected "${expectedText}" but found "${content}"`);
  }
});
