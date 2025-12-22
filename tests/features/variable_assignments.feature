# Variable Assignments Feature
# 
# Tests variable assignment functionality including:
# - Simple variable assignments
# - Phrase-based variable names
# - Expression-based assignments
# - Variable panel updates

Feature: Variable Assignments
  As a user writing mathematical notes
  I want to assign values to variables
  So that I can reuse values throughout my document

  Background:
    Given I am using the SmartPad editor
    And the editor is ready for input

  Scenario: Simple variable assignment
    When I type "price = 10.5"
    Then the variable "price" should be stored with value 10.5

  Scenario: Phrase-based variable assignment
    When I type "my password = 2929"
    Then the variable "my password" should be stored with value 2929

  Scenario: Multiple word variable assignment
    When I type "total cost = 150.50"
    Then the variable "total cost" should be stored with value 150.50

  Scenario: Variable assignment with whitespace
    When I type "  tax rate = 0.08  "
    Then the variable "tax rate" should be stored with value 0.08

  Scenario: Traditional identifier still works
    When I type "itemCost = 25"
    Then the variable "itemCost" should be stored with value 25

  Scenario: Negative number assignment
    When I type "temperature = -5.2"
    Then the variable "temperature" should be stored with value -5.2

  Scenario: Variable reassignment
    Given I have typed "price = 10"
    When I type "price = 15.99"
    Then the variable "price" should be stored with value 15.99

  Scenario: Ambiguous text is not parsed as assignment
    When I type "I think my password = 2929 is secure"
    Then no variable should be created

  Scenario: Text not starting with variable name is not parsed
    When I type "The my calculation = 50 seems wrong"
    Then no variable should be created

  Scenario: Line with only equals sign is not parsed
    When I type "= 2929"
    Then no variable should be created

  Scenario: Non-numeric value is not parsed
    When I type "my variable = abc"
    Then no variable should be created

  Scenario: Multiple assignments on different lines
    When I type the following lines:
      | my password = 2929   |
      | total cost = 150.50  |
      | tax rate = 0.08      |
    Then the following variables should be stored:
      | variable    | value   |
      | my password | 2929    |
      | total cost  | 150.50  |
      | tax rate    | 0.08    | 