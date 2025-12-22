# Semantic Highlighting Feature
# 
# Tests semantic syntax highlighting functionality including:
# - Variable name highlighting
# - Expression operator highlighting
# - Error state highlighting
# - Real-time highlighting updates

Feature: Semantic Highlighting
  As a user writing mathematical expressions
  I want to see syntax highlighting that helps me understand the structure
  So that I can write and debug expressions more effectively

  Background:
    Given I am using the SmartPad editor
    And the editor is ready for input

  Scenario: Variable names are highlighted
    When I type "price = 10.5"
    Then the text "price" should have class "semantic-variable"
    And the text "price" should be displayed in blue color

  Scenario: Operators are highlighted in red
    When I type "5 + 3 =>"
    Then the text "+" should have class "semantic-operator"
    And the operators should be displayed in red color

  Scenario: Trigger symbol is highlighted distinctly
    When I type "5 + 3 =>"
    Then the text "=>" should have class "semantic-trigger"
    And the trigger symbol should be displayed in purple color

  Scenario: Numbers are highlighted in dark blue
    When I type "price = 10.5"
    Then the text "10.5" should have class "semantic-number"
    And the text "10.5" should be displayed in dark blue color

  Scenario: Mathematical functions are highlighted in purple
    When I type "sqrt(16) =>"
    Then the text "sqrt" should have class "semantic-function"
    And the text "sqrt" should be displayed in purple color

  Scenario: Results are highlighted in green
    When I type "5 + 3 =>"
    And I wait for the expression to evaluate
    Then the text "8" should have class "semantic-result"
    And the text "8" should be displayed in green color

  Scenario: Errors are highlighted in red italic
    When I type "invalid_var =>"
    And I wait for the expression to evaluate
    Then the error message should have class "semantic-error"
    And the error text should be displayed in red italic style

  Scenario: Complex expression with multiple token types
    Given I have typed "price = 10"
    And I have typed "tax = 0.08"
    When I type "total = price * (1 + tax) =>"
    And I wait for the expression to evaluate
    Then the text "total" should have class "semantic-variable"
    And the text "price" should have class "semantic-variable"
    And the text "tax" should have class "semantic-variable"
    And the text "*" should have class "semantic-operator"
    And the text "+" should have class "semantic-operator"
    And the text "=>" should have class "semantic-trigger"
    And the text "1" should have class "semantic-number"
    And the text "10.8" should have class "semantic-result"

  Scenario: Phrase-based variables are highlighted correctly
    When I type "tax rate = 0.08"
    Then the text "tax rate" should have class "semantic-variable"
    And the text "0.08" should have class "semantic-number"

  Scenario: Highlighting preserves cursor position
    When I type "price = 10"
    And I move the cursor after "price"
    And I type " per unit"
    Then the text "price per unit" should have class "semantic-variable"
    And the cursor should be after "unit"

  Scenario: Highlighting works with copy and paste
    Given I have typed "sqrt(16) + 2 =>"
    When I select all text
    And I copy the selection
    And I move to a new line
    And I paste
    Then the pasted text should have the same highlighting as the original 