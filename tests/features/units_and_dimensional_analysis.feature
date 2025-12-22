# Units and Dimensional Analysis Feature
# 
# Tests units and dimensional analysis functionality including:
# - Unit expressions and arithmetic
# - Unit conversions
# - Dimensional analysis
# - Error handling for incompatible units

Feature: Units and Dimensional Analysis
  As a user writing scientific or engineering notes
  I want to work with units and perform dimensional analysis
  So that I can ensure calculations are physically meaningful

  Background:
    Given I am using the SmartPad editor
    And the editor is ready for input

  # Basic Unit Expressions
  Scenario: Simple unit calculations
    When I type "10 m =>"
    Then I should see "10 m => 10 m" in the editor
    And the result should preserve units

  Scenario: Adding compatible units
    When I type "10 m + 5 m =>"
    Then I should see "10 m + 5 m => 15 m" in the editor

  Scenario: Subtracting compatible units  
    When I type "20 m - 8 m =>"
    Then I should see "20 m - 8 m => 12 m" in the editor

  # Dimensional Analysis
  Scenario: Area calculation from length multiplication
    When I type "10 m * 5 m =>"
    Then I should see "10 m * 5 m => 50 m^2" in the editor
    And the result should show area units

  Scenario: Volume calculation from area and length
    When I type "25 m^2 * 2 m =>"
    Then I should see a volume result with "m^3" units

  Scenario: Velocity calculation from distance and time
    When I type "100 m / 10 s =>"
    Then I should see "100 m / 10 s => 10 m/s" in the editor
    And the result should show velocity units

  # Unit Conversions
  Scenario: Automatic metric unit conversion
    When I type "1 km + 500 m =>"
    Then I should see "1 km + 500 m => 1.5 km" in the editor
    And the conversion should be handled automatically

  Scenario: Imperial to metric conversion  
    When I type "1 ft + 0.3048 m =>"
    Then I should see a result that correctly adds the equivalent lengths

  Scenario: Mixed unit arithmetic
    When I type "1000 m + 1 km =>"
    Then I should see "1000 m + 1 km => 2 km" in the editor

  # Error Handling - Dimensional Analysis
  Scenario: Incompatible unit addition error
    When I type "10 m + 5 kg =>"
    Then I should see an error message containing "incompatible dimensions"
    And the error should explain that length and mass cannot be added

  Scenario: Incompatible unit subtraction error
    When I type "20 s - 5 m =>"
    Then I should see an error message containing "incompatible dimensions"

  # Combined Assignments with Units
  Scenario: Variable assignment with units
    When I type "length = 10 m =>"
    Then I should see "length = 10 m => 10 m" in the editor
    And the variable "length" should be stored with value 10

  Scenario: Area calculation with variable assignment
    When I type "area = 10 m * 5 m =>"
    Then I should see "area = 10 m * 5 m => 50 m^2" in the editor
    And the variable "area" should be stored with value 50

  # Variables with Units
  Scenario: Using variables in unit calculations
    Given I have defined "width = 5"
    And I have defined "height = 10"
    When I type "width * height * 1 m^2 =>"
    Then I should see "width * height * 1 m^2 => 50 m^2" in the editor

  Scenario: Mixed variables and units
    Given I have defined "scale = 2"
    When I type "scale * 10 m =>"
    Then I should see "scale * 10 m => 20 m" in the editor

  # Real-world Physics Examples
  Scenario: Force calculation (F = ma)
    When I type "10 kg * 9.8 m =>"
    Then I should see "10 kg * 9.8 m => 98 kg*m" in the editor
    And the result should show force-like units

  Scenario: Kinetic energy calculation (simplified)
    When I type "0.5 * 10 kg * 20 m =>"
    Then I should see "0.5 * 10 kg * 20 m => 100 kg*m" in the editor

  Scenario: Pressure calculation concept
    When I type "100 kg / 10 m^2 =>"
    Then I should see a result with appropriate units

  # Functions with Units
  Scenario: Absolute value with units
    When I type "abs(-15 m) =>"
    Then I should see "abs(-15 m) => 15 m" in the editor

  Scenario: Rounding with units
    When I type "round(10.7 kg) =>"
    Then I should see "round(10.7 kg) => 11 kg" in the editor

  # Complex Expressions
  Scenario: Order of operations with units
    When I type "10 m + 5 m * 2 =>"
    Then I should see "10 m + 5 m * 2 => 20 m" in the editor

  Scenario: Parentheses with units
    When I type "(10 m + 5 m) * 2 m =>"
    Then I should see "(10 m + 5 m) * 2 m => 30 m^2" in the editor

  # Edge Cases
  Scenario: Zero with units
    When I type "0 m + 10 m =>"
    Then I should see "0 m + 10 m => 10 m" in the editor

  Scenario: Negative units
    When I type "-5 m + 10 m =>"
    Then I should see "-5 m + 10 m => 5 m" in the editor

  Scenario: Decimal precision with units
    When I type "10.5 m * 2.5 =>"
    Then I should see "10.5 m * 2.5 => 26.25 m" in the editor

  # Integration with Existing Features
  Scenario: Units with existing mathematical functions
    When I type "sqrt(25) * 1 m =>"
    Then I should see "sqrt(25) * 1 m => 5 m" in the editor

  Scenario: Units mixed with dimensionless calculations
    When I type "10 m * (2 + 3) =>"
    Then I should see "10 m * (2 + 3) => 50 m" in the editor 