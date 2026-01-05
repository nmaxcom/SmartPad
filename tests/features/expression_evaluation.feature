# Expression Evaluation Feature
# 
# Tests expression evaluation functionality including:
# - Basic arithmetic operations
# - Mathematical functions
# - Variable integration
# - Real-time updates
# - Error handling

Feature: Expression Evaluation
  As a user writing mathematical notes
  I want to evaluate expressions using the "=>" trigger
  So that I can perform calculations seamlessly within my text

  Background:
    Given I am using the SmartPad editor
    And the editor is ready for input

  # Basic Expression Evaluation
  Scenario: Cursor positioning after evaluation
    When I type "2 + 3 =>"
    Then I should see "2 + 3 => 5" in the editor
    And the cursor should be positioned after the result

  Scenario: Cursor positioning after evaluation with no spacing
    When I type "2+3=>"
    Then I should see "2 + 3 => 5" in the editor
    And the cursor should be positioned after the result

  Scenario: Order of operations
    When I type "(10 + 5) * 2 =>"
    Then I should see "(10 + 5) * 2 => 30" in the editor

  Scenario: Order of operations with no spacing
    When I type "(10+5)*2=>"
    Then I should see "(10 + 5) * 2 => 30" in the editor

  Scenario: Mathematical functions
    When I type "sqrt(16) + abs(-5) =>"
    Then I should see "sqrt(16) + abs(-5) => 9" in the editor

  Scenario: Mathematical functions with no spacing
    When I type "sqrt(16)+abs(-5)=>"
    Then I should see "sqrt(16) + abs(-5) => 9" in the editor

  # Variable Integration
  Scenario: Expression with existing variables
    Given I have defined "price = 10.5"
    When I type "price * 1.08 =>"
    Then I should see "price * 1.08 => 11.34" in the editor

  Scenario: Expression with existing variables with no spacing
    Given I have defined "price = 10.5"
    When I type "price*1.08=>"
    Then I should see "price * 1.08 => 11.34" in the editor

  Scenario: Expression with phrase-based variables
    Given I have defined "my password = 2929"
    And I have defined "bonus amount = 100"
    When I type "my password + bonus amount =>"
    Then I should see "my password + bonus amount => 3029" in the editor

  Scenario: Complex expression with multiple variables
    Given I have defined "base price = 100"
    And I have defined "tax rate = 0.08"
    And I have defined "discount = 10"
    When I type "(base price - discount) * (1 + tax rate) =>"
    Then I should see "(base price - discount) * (1 + tax rate) => 97.2" in the editor

  Scenario: Complex expression with multiple variables with no spacing
    Given I have defined "base price = 100"
    And I have defined "tax rate = 0.08"
    And I have defined "discount = 10"
    When I type "(base price-discount)*(1+tax rate)=>"
    Then I should see "(base price - discount) * (1 + tax rate) => 97.2" in the editor

  # Real-time Updates
  Scenario: Expression updates when variable changes
    Given I have defined "price = 10"
    And I have typed "price * 2 => 20"
    When I change the variable definition to "price = 15"
    Then the expression should update to show "price * 2 => 30"

  Scenario: Expression updates when variable changes with no spacing
    Given I have defined "price=10"
    And I have typed "price * 2 => 20"
    When I change the variable definition to "price = 15"
    Then the expression should update to show "price * 2 => 30"

  Scenario: Multiple expressions update together
    Given I have defined "x = 5"
    And I have typed "x + 10 => 15"
    And I have typed "x * 3 => 15"
    When I change the variable definition to "x = 7"
    Then the first expression should show "x + 10 => 17"
    And the second expression should show "x * 3 => 21"

  # Error Handling
  Scenario: Division by zero error
    When I type "10 / 0 =>"
    Then I should see "10 / 0 => ⚠️ Division by zero" in the editor

  Scenario: Division by zero error with no spacing
    When I type "10/0=>"
    Then I should see "10 / 0 => ⚠️ Division by zero" in the editor
    And the error should be visually distinct

  Scenario: Undefined variable error
    When I type "unknown_var + 5 =>"
    Then I should see "unknown_var + 5 => unknown_var + 5" in the editor

  Scenario: Invalid mathematical operation
    When I type "sqrt(-1) =>"
    Then I should see "sqrt(-1) => ⚠️ Square root of negative number" in the editor

  Scenario: Malformed expression
    When I type "2 + + 3 =>"
    Then I should see an error message containing "⚠️"
    And the original expression should remain visible

  # Precision and Formatting
  Scenario: Decimal precision
    When I type "0.1 + 0.2 =>"
    Then I should see "0.1 + 0.2 => 0.3" in the editor

  Scenario: Decimal precision with no spacing
    When I type "0.1+0.2=>"
    Then I should see "0.1 + 0.2 => 0.3" in the editor

  Scenario: Large number formatting
    When I type "999999 * 999999 =>"
    Then the result should be displayed in appropriate scientific notation

  Scenario: Integer results display without decimals
    When I type "10.0 / 2.0 =>"
    Then I should see "10.0 / 2.0 => 5" in the editor

  # Mixed Content
  Scenario: Variables and expressions in same document
    When I type the following content:
      """
      Shopping calculation
      item price = 25.99
      tax rate = 0.08
      
      Subtotal: item price => 25.99
      Tax: item price * tax rate => 2.08
      Total: item price * (1 + tax rate) => 28.07
      """
    Then all expressions should be evaluated correctly
    And variable assignments should be recognized

  Scenario: Plain text mixed with calculations
    When I type the following content:
      """
      Meeting notes for project budget
      
      Initial budget = 10000
      Marketing cost = 2500
      
      Remaining: Initial budget - Marketing cost => 7500
      
      This looks good for Q1 planning.
      """
    Then the expression should be evaluated
    And the plain text should remain unchanged

  # Edge Cases
  Scenario: Empty expression
    When I type " =>"
    Then I should see an appropriate error message

  Scenario: Expression without trigger
    When I type "2 + 3"
    Then the text should remain as plain text
    And no evaluation should occur

  Scenario: Multiple arrow symbols
    When I type "2 + 3 => => 5"
    Then only the first arrow should trigger evaluation

  # Performance and UX
  Scenario: Rapid typing doesn't cause issues
    When I rapidly type "price * 1.08 =>"
    Then the evaluation should happen smoothly
    And the cursor should end up after the result

  Scenario: Editing existing expressions
    Given I have "price * 1.08 => 11.34" in the editor
    When I move the cursor before "1.08" and change it to "1.15"
    Then the expression should re-evaluate to show the new result

  Scenario: Cursor positioning after evaluation
    When I type "2 + 3 =>"
    And the expression evaluates to "2 + 3 => 5"
    Then the cursor should be positioned after "5"
    And pressing Enter should create a new line 
