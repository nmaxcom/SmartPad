# Editor Interaction Feature
# 
# Tests editor interaction functionality including:
# - Basic editor interactions
# - Text input and editing
# - Editor responsiveness
# - User interaction handling

Feature: Editor Interaction
  As a user interacting with the SmartPad editor
  I want the editor to respond appropriately to my interactions
  So that I can write and edit content effectively

  Background:
    Given I am using the SmartPad editor
    And the editor is ready for input

  Scenario: Basic text input works
    Given the editor area is properly sized
    When I click at the top of the editor area
    And I type "top area text"
    Then I should see "top area text" in the editor
    When I click at the bottom of the editor area
    And I type "bottom"
    Then I should see text at the cursor position
    When I click at the middle of the editor area
    And I type "middle"
    Then I should see text at the cursor position

  Scenario: Editor area provides full surface for interaction
    Given the editor is empty
    When I click at coordinates 200, 100 within the editor
    And I type "first click"
    Then I should see "first click" in the editor
    When I click at coordinates 200, 300 within the editor  
    And I type " second click"
    Then I should see text has been entered 