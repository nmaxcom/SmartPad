# Enter Key Behavior Feature
# 
# Tests enter key behavior and line management including:
# - Enter key line creation
# - Cursor positioning after Enter
# - Multi-line content management
# - Enter key in expressions

Feature: Enter Key Behavior
  As a user writing multi-line mathematical notes
  I want the Enter key to create new lines appropriately
  So that I can organize my content effectively

  Background:
    Given I am using the SmartPad editor
    And the editor is ready for input

  Scenario: Enter key creates new line
    When I type "hello"
    And I press Enter
    And I type "world"
    Then I should see "hello" on the first line
    And I should see "world" on the second line

  Scenario: New line creation with variable assignments
    When I type "price = 10"
    And I press Enter
    And I type "tax = 0.08"
    Then I should see "price = 10" on the first line
    And I should see "tax = 0.08" on the second line

  Scenario: Cursor position after expression evaluation
    When I type "10 + 40 =>"
    Then the expression should be evaluated to show "10 + 40 => 50"
    And the cursor should be positioned at the end of the result

  Scenario: Enter key at end of expression result should create new line
    Given I have typed "10 + 40 => 50"
    When the cursor is at the end of the line
    And I press Enter
    Then a new empty line should be created
    And the cursor should be on the new line
    When I type "next line"
    Then I should see "10 + 40 => 50" on the first line
    And I should see "next line" on the second line

  Scenario: Enter key should NOT duplicate expression result
    Given I have typed "10 + 40 => 50"
    When the cursor is at the end of the line
    And I press Enter
    Then the new line should be empty
    And should NOT contain "50"

  Scenario: Enter key in middle of expression result should move cursor to end
    Given I have typed "10 + 40 => 50"
    When the cursor is positioned in the middle of "50"
    And I press Enter
    Then the cursor should move to the end of the line
    And no new line should be created
    When I type "X"
    Then I should see "10 + 40 => 50X"

  Scenario: Multiple Enter presses should create multiple lines
    When I type "line 1"
    And I press Enter
    And I type "line 2"
    And I press Enter
    And I type "line 3"
    Then I should see "line 1" on the first line
    And I should see "line 2" on the second line
    And I should see "line 3" on the third line

  Scenario: Cursor should not snap back to previous line
    When I type "first line"
    And I press Enter
    And I type "second line"
    And I type " more"
    Then I should see "first line" on the first line
    And I should see "second line more" on the second line

  Scenario: Expression with multiple arrows
    When I type "2 + 3 => => 5"
    And I press Enter at the end
    And I type "next"
    Then I should see "2 + 3 => => 5" on the first line
    And I should see "next" on the second line

  Scenario: Empty expression handling
    When I type " =>"
    And I press Enter
    And I type "next line"
    Then I should see " =>" on the first line
    And I should see "next line" on the second line 