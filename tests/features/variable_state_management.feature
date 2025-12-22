# Variable State Management Feature
# 
# Tests variable state management functionality including:
# - Variable creation and deletion
# - Variable persistence
# - Variable panel state
# - State synchronization

Feature: Variable State Management
  As a user managing variables in my document
  I want variables to be properly managed and persisted
  So that my work is preserved and organized

  Background:
    Given I am using the SmartPad editor
    And the editor is ready for input

  Scenario: Variable is created and displayed in panel
    When I type "price = 10.5"
    Then the variable "price" should be stored with value 10.5
    And I should have 1 variable in total

  Scenario: Multiple variables are stored independently
    When I type the following lines:
      | price = 10.5      |
      | my password = 2929|
      | tax rate = 0.08   |
    Then the following variables should be stored:
      | variable    | value |
      | price       | 10.5  |
      | my password | 2929  |
      | tax rate    | 0.08  |
    And I should have 3 variables in total

  Scenario: Variable updates when reassigned
    Given I have typed "price = 10.5"
    When I type "price = 15.99"
    Then the variable "price" should be stored with value 15.99
    And I should have 1 variable in total

  Scenario: Variables persist throughout the session
    Given I have typed "price = 10.5"
    When I type additional text "This is a note"
    Then the variable "price" should still be stored with value 10.5

  Scenario: Invalid assignments don't affect variable store
    Given I have typed "price = 10.5"
    When I type "invalid = abc"
    Then the variable "price" should still be stored with value 10.5
    And I should have 1 variable in total
    And no variable named "invalid" should exist

  Scenario: Variables can be retrieved by name
    Given I have typed "my password = 2929"
    When I check for variable "my password"
    Then it should exist with value 2929

  Scenario: Non-existent variables return undefined
    When I check for variable "nonexistent"
    Then it should not exist

  Scenario: Variable names are case sensitive
    Given I have typed "Price = 10.5"
    When I check for variable "price"
    Then it should not exist
    When I check for variable "Price"
    Then it should exist with value 10.5

  Scenario: Variables can be deleted
    Given I have typed "temp = 25"
    When I delete variable "temp"
    Then no variable named "temp" should exist
    And I should have 0 variables in total

  Scenario: Clearing all variables
    Given I have typed the following variables:
      | price = 10.5      |
      | my password = 2929|
      | tax rate = 0.08   |
    When I clear all variables
    Then I should have 0 variables in total 