// @ts-nocheck
/**
 * Save/Load Buttons Tests
 *
 * Tests the multi-slot save/load functionality including:
 * - Save button with named save dialog
 * - Load button with hover menu showing save slots
 * - Multiple save slots management
 * - Delete individual save slots
 * - Explicit save/load only - no automatic persistence
 */

import { test, expect } from "@playwright/test";
import { waitForUIRenderComplete } from "./utils";

test.describe("Save/Load Buttons", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto("/");

    // Wait for the app to load
    await page.waitForSelector('[data-testid="smart-pad-editor"]');
    
    // Clear any existing localStorage
    await page.evaluate(() => localStorage.clear());
  });

  test("renders save and load buttons in sidebar", async ({ page }) => {
    const saveButton = page.locator('.save-button');
    const loadButton = page.locator('.load-button');
    
    await expect(saveButton).toBeVisible();
    await expect(loadButton).toBeVisible();
    
    // Check button text
    await expect(saveButton).toContainText("Save");
    await expect(loadButton).toContainText("Load");
  });

  test("opens save dialog when save button is clicked", async ({ page }) => {
    const saveButton = page.locator('.save-button');
    const editor = page.locator('[data-testid="smart-pad-editor"]');

    // Add some content to the editor
    await editor.click();
    await page.keyboard.type("test content = 42 =>");

    // Click the save button
    await saveButton.click();

    // Check that the save dialog appears
    const saveDialog = page.locator('.save-dialog');
    await expect(saveDialog).toBeVisible();
    
    // Check dialog content
    await expect(saveDialog).toContainText("Save Current State");
    await expect(saveDialog).toContainText("Give this save a name:");
  });

  test("saves content with a name when confirmed", async ({ page }) => {
    const saveButton = page.locator('.save-button');
    const editor = page.locator('[data-testid="smart-pad-editor"]');

    // Add some content to the editor
    await editor.click();
    await page.keyboard.type("saved content = 123 =>");

    // Click the save button
    await saveButton.click();

    // Wait for dialog and type save name
    const saveNameInput = page.locator('#save-name');
    await saveNameInput.waitFor();
    await saveNameInput.fill("Test Save 1");

    // Click confirm button
    const confirmButton = page.locator('.confirm-button');
    await confirmButton.click();

    // Check that dialog is closed
    const saveDialog = page.locator('.save-dialog');
    await expect(saveDialog).not.toBeVisible();
  });

  test("shows saved slots in load menu", async ({ page }) => {
    const saveButton = page.locator('.save-button');
    const loadButton = page.locator('.load-button');
    const editor = page.locator('[data-testid="smart-pad-editor"]');

    // Create a save first
    await editor.click();
    await page.keyboard.type("first save = 111 =>");
    await saveButton.click();
    const saveNameInput = page.locator('#save-name');
    await saveNameInput.waitFor();
    await saveNameInput.fill("First Save");
    const confirmButton = page.locator('.confirm-button');
    await confirmButton.click();

    // Create another save
    await editor.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    await page.keyboard.type("second save = 222 =>");
    await saveButton.click();
    await saveNameInput.waitFor();
    await saveNameInput.fill("Second Save");
    await confirmButton.click();

    // Now click load button to see the menu
    await loadButton.click();

    // Check that the load menu shows both saves
    const loadMenu = page.locator('.load-menu');
    await expect(loadMenu).toBeVisible();
    await expect(loadMenu).toContainText("First Save");
    await expect(loadMenu).toContainText("Second Save");
    await expect(loadMenu).toContainText("2 slots");
  });

  test("loads content when clicking on a save slot", async ({ page }) => {
    const saveButton = page.locator('.save-button');
    const loadButton = page.locator('.load-button');
    const editor = page.locator('[data-testid="smart-pad-editor"]');

    // Create a save
    await editor.click();
    await page.keyboard.type("load test content = 999 =>");
    await saveButton.click();
    const saveNameInput = page.locator('#save-name');
    await saveNameInput.waitFor();
    await saveNameInput.fill("Load Test");
    const confirmButton = page.locator('.confirm-button');
    await confirmButton.click();

    // Clear the editor
    await editor.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");

    // Click load button and select the save
    await loadButton.click();
    const saveSlot = page.locator('.save-slot').first();
    await saveSlot.click();

    // Wait for content to be loaded
    await waitForUIRenderComplete(page);

    // Check that the saved content was loaded
    await expect(editor).toContainText("load test content = 999 =>");
  });

  test("shows empty state when no saves exist", async ({ page }) => {
    const loadButton = page.locator('.load-button');

    // Click the load button without any saves
    await loadButton.click();

    // Check that the load menu shows empty state
    const loadMenu = page.locator('.load-menu');
    await expect(loadMenu).toBeVisible();
    await expect(loadMenu).toContainText("No saved states");
    await expect(loadMenu).toContainText("Save some content to get started");
  });

  test("deletes save slot when delete button is clicked", async ({ page }) => {
    const saveButton = page.locator('.save-button');
    const loadButton = page.locator('.load-button');
    const editor = page.locator('[data-testid="smart-pad-editor"]');

    // Create a save
    await editor.click();
    await page.keyboard.type("delete test = 555 =>");
    await saveButton.click();
    const saveNameInput = page.locator('#save-name');
    await saveNameInput.waitFor();
    await saveNameInput.fill("Delete Test");
    const confirmButton = page.locator('.confirm-button');
    await confirmButton.click();

    // Click load button to see the save
    await loadButton.click();
    const loadMenu = page.locator('.load-menu');
    await expect(loadMenu).toContainText("Delete Test");

    // Click the delete button on the save slot
    const deleteButton = page.locator('.delete-slot').first();
    await deleteButton.click();

    // Check that the save is removed
    await expect(loadMenu).not.toContainText("Delete Test");
    await expect(loadMenu).toContainText("No saved states");
  });

  test("closes save dialog when clicking outside", async ({ page }) => {
    const saveButton = page.locator('.save-button');
    const editor = page.locator('[data-testid="smart-pad-editor"]');

    // Add content and open save dialog
    await editor.click();
    await page.keyboard.type("test content");
    await saveButton.click();

    // Check dialog is open
    const saveDialog = page.locator('.save-dialog');
    await expect(saveDialog).toBeVisible();

    // Click outside the dialog (on the page body, not the editor)
    await page.mouse.click(10, 10);

    // Check that dialog is closed
    await expect(saveDialog).not.toBeVisible();
  });

  test("closes load menu when clicking outside", async ({ page }) => {
    const saveButton = page.locator('.save-button');
    const loadButton = page.locator('.load-button');
    const editor = page.locator('[data-testid="smart-pad-editor"]');

    // Create a save first
    await editor.click();
    await page.keyboard.type("test save");
    await saveButton.click();
    const saveNameInput = page.locator('#save-name');
    await saveNameInput.waitFor();
    await saveNameInput.fill("Test Save");
    const confirmButton = page.locator('.confirm-button');
    await confirmButton.click();

    // Open load menu
    await loadButton.click();
    const loadMenu = page.locator('.load-menu');
    await expect(loadMenu).toBeVisible();

    // Click outside the menu (on the page body, not the editor)
    await page.mouse.click(10, 10);

    // Check that menu is closed
    await expect(loadMenu).not.toBeVisible();
  });

  test("handles keyboard shortcuts in save dialog", async ({ page }) => {
    const saveButton = page.locator('.save-button');
    const editor = page.locator('[data-testid="smart-pad-editor"]');

    // Add content and open save dialog
    await editor.click();
    await page.keyboard.type("keyboard test");
    await saveButton.click();

    // Wait for dialog and type save name
    const saveNameInput = page.locator('#save-name');
    await saveNameInput.waitFor();
    await saveNameInput.fill("Keyboard Test");

    // Test Enter key to save
    await saveNameInput.press("Enter");

    // Check that dialog is closed
    const saveDialog = page.locator('.save-dialog');
    await expect(saveDialog).not.toBeVisible();

    // Open dialog again
    await saveButton.click();
    await saveNameInput.waitFor();

    // Test Escape key to cancel
    await saveNameInput.press("Escape");

    // Check that dialog is closed
    await expect(saveDialog).not.toBeVisible();
  });

  test("maintains save order and limits", async ({ page }) => {
    const saveButton = page.locator('.save-button');
    const editor = page.locator('[data-testid="smart-pad-editor"]');

    // Create 3 saves to test basic functionality
    for (let i = 1; i <= 3; i++) {
      await editor.click();
      await page.keyboard.press("Control+a");
      await page.keyboard.press("Delete");
      await page.keyboard.type(`test ${i} = ${i} =>`);
      await saveButton.click();
      const saveNameInput = page.locator('#save-name');
      await saveNameInput.waitFor();
      await saveNameInput.fill(`Test ${i}`);
      const confirmButton = page.locator('.confirm-button');
      await confirmButton.click();
      
      // Wait for the save to complete
      await page.waitForTimeout(200);
    }

    // Click load button to see the saves
    const loadButton = page.locator('.load-button');
    await loadButton.click();

    // Wait for the menu to fully load
    const loadMenu = page.locator('.load-menu');
    await loadMenu.waitFor();
    
    // Check that we have 3 save slots
    const saveSlots = page.locator('.save-slot');
    await expect(saveSlots).toHaveCount(3);
    
    // Check that the slot count shows 3
    await expect(loadMenu).toContainText("3 slots");
    
    // Check that saves are in reverse chronological order (newest first)
    const firstSlot = saveSlots.first();
    await expect(firstSlot).toContainText("Test 3");
    
    const lastSlot = saveSlots.last();
    await expect(lastSlot).toContainText("Test 1");
    
    // Verify all saves are present
    await expect(saveSlots.filter({ hasText: "Test 3" })).toHaveCount(1);
    await expect(saveSlots.filter({ hasText: "Test 2" })).toHaveCount(1);
    await expect(saveSlots.filter({ hasText: "Test 1" })).toHaveCount(1);
  });



  test("loads multi-line content without creating unwanted paragraphs", async ({ page }) => {
    const saveButton = page.locator('.save-button');
    const loadButton = page.locator('.load-button');
    const editor = page.locator('[data-testid="smart-pad-editor"]');

    // Create content with multiple lines
    await editor.click();
    await page.keyboard.type("line 1 = 1 =>");
    await page.keyboard.press("Enter");
    await page.keyboard.type("line 2 = 2 =>");
    await page.keyboard.press("Enter");
    await page.keyboard.type("line 3 = 3 =>");

    // Save the multi-line content
    await saveButton.click();
    const saveNameInput = page.locator('#save-name');
    await saveNameInput.waitFor();
    await saveNameInput.fill("Multi-line Test");
    const confirmButton = page.locator('.confirm-button');
    await confirmButton.click();

    // Clear the editor
    await editor.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");

    // Load the saved content
    await loadButton.click();
    const saveSlot = page.locator('.save-slot').first();
    await saveSlot.click();

    // Wait for content to be loaded
    await waitForUIRenderComplete(page);

    // Check that all lines are present
    await expect(editor).toContainText("line 1 = 1 =>");
    await expect(editor).toContainText("line 2 = 2 =>");
    await expect(editor).toContainText("line 3 = 3 =>");

    // Verify the DOM structure doesn't have unwanted paragraph breaks
    const editorContent = page.locator('.editor-content');
    const paragraphCount = await editorContent.locator('p').count();
    
    // Should have only one paragraph element, not one per line
    expect(paragraphCount).toBe(1);
  });
});
