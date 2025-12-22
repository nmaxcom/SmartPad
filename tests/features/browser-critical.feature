# Browser Critical Feature
# 
# Tests browser critical functionality including:
# - Critical browser operations
# - Essential user workflows
# - Critical error handling
# - Browser stability

Feature: Browser Critical
  As a user relying on SmartPad for critical work
  I want the application to handle critical operations reliably
  So that I can trust it for important tasks

  Background:
    Given I am using the SmartPad editor
    And the editor is ready for input

  Scenario: Critical functionality works
    When I type "Hello World"
    Then I should see "Hello World" displayed in the editor

  Scenario: Simple expression evaluation
    When I type "2 + 3 =>"
    Then I should see "2 + 3 => 5" in the editor

  Scenario: Variable creation
    When I type "price = 125"
    Then the variable "price" should be stored with value 125

  Scenario: Enter key creates new paragraph
    When I type "line one"
    And I press Enter
    And I type "line two"
    Then the editor should contain both lines 