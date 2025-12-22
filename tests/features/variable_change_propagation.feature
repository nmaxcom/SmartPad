# Variable Change Propagation Feature
# 
# Tests variable change propagation functionality including:
# - Real-time variable updates
# - Dependent expression updates
# - Propagation through dependency chains
# - Update performance and reliability

Feature: Variable Change Propagation
  As a user working with interdependent variables
  I want changes to propagate automatically to dependent expressions
  So that my calculations stay up-to-date

  Background:
    Given I am using the SmartPad editor
    And the editor is ready for input

  Scenario: Variable change updates dependent expression
    Given I have defined "price = 10"
    And I have typed "price * 2 => 20"
    When I change the variable definition to "price = 15"
    Then the expression should update to show "price * 2 => 30"

  Scenario: Multiple expressions update when shared variable changes
    Given I have defined "x = 5"
    And I have typed "x + 10 => 15"
    And I have typed "x * 3 => 15"
    When I change the variable definition to "x = 7"
    Then the first expression should show "x + 10 => 17"
    And the second expression should show "x * 3 => 21"

  Scenario: Complex expressions with multiple variables update correctly
    Given I have defined "base price = 100"
    And I have defined "tax rate = 0.08"
    And I have typed "(base price * tax rate) => 8"
    And I have typed "base price * (1 + tax rate) => 108"
    When I change the variable definition to "tax rate = 0.10"
    Then the first expression should show "(base price * tax rate) => 10"
    And the second expression should show "base price * (1 + tax rate) => 110"

  Scenario: Variable deletion causes error propagation
    Given I have defined "temp = 25"
    And I have typed "temp * 1.8 + 32 => 77"
    When I delete the variable definition "temp = 25"
    Then the expression should show an error: "temp * 1.8 + 32 => ⚠️ Undefined variable: temp"

  Scenario: Immediate propagation without manual refresh
    Given I have defined "width = 10"
    And I have defined "height = 5"
    And I have typed "width * height => 50"
    When I change the variable definition to "width = 12"
    Then the expression should immediately show "width * height => 60"
    And I should not need to manually refresh or re-evaluate 