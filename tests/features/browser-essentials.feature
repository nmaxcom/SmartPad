# Browser Essentials Feature
# 
# Tests browser essential functionality including:
# - Page loading and initialization
# - Basic browser interactions
# - Browser compatibility
# - Essential UI elements

Feature: Browser Essentials
  As a user accessing SmartPad in a browser
  I want the application to load and function properly
  So that I can use all features reliably

  Background:
    Given I am using the SmartPad editor
    And the editor is ready for input

  Scenario: Application loads successfully
    When I type "Hello World"
    Then I should see "Hello World" displayed in the editor

  Scenario: Enter key creates new lines correctly
    When I type "first line"
    And I press Enter
    And I type "second line"
    Then I should see "first line" on the first line
    And I should see "second line" on the second line

  Scenario: Simple expression evaluation displays result
    When I type "2 + 3 =>"
    Then I should see "2 + 3 => 5" in the editor
    And the cursor should be positioned after the result

  Scenario: Cursor positioning after Enter
    When I type "10 + 40 => 50"
    And I press Enter at the end
    And I type "next line"
    Then I should see "10 + 40 => 50" on the first line
    And I should see "next line" on the second line

  Scenario: Variable panel updates when variable is created
    When I type "price = 125"
    Then the variable "price" should be stored with value 125
    And the variable panel should show the variable

  Scenario: Real keyboard selection and deletion
    When I type "Hello World"
    And I select "World"
    And I press Delete
    Then I should see "Hello " in the editor

  Scenario: Editor maintains focus during expression evaluation
    When I type "5 * 4 =>"
    And the expression evaluates to "5 * 4 => 20"
    And I type " units"
    Then I should see "5 * 4 => 20 units" in the editor 

  Scenario: Clicking anywhere in editor area allows typing
    Given the editor area is properly sized
    When I click at the top of the editor area
    And I type "top area text"
    Then I should see "top area text" in the editor
    When I click at the bottom of the editor area
    And I type " bottom area text"
    Then I should see "top area text bottom area text" in the editor
    When I click at the middle of the editor area
    And I type " middle text"
    Then I should see text at the cursor position

  Scenario: Editor area provides full surface for interaction
    Given the editor is empty
    When I click at coordinates 200, 100 within the editor
    And I type "first click"
    Then I should see "first click" in the editor
    When I click at coordinates 200, 300 within the editor  
    And I type " second click"
    Then I should see text has been entered