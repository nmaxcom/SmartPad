# Basic Editor Feature
# 
# Tests basic editor functionality including:
# - Basic text input
# - Editor initialization
# - Core editor behavior
# - Essential editor features

Feature: Basic Editor
  As a user starting with SmartPad
  I want basic editor functionality to work
  So that I can begin writing content

  Background:
    Given I am using the SmartPad editor
    And the editor is ready for input

  Scenario: Basic text input works
    Given I have the SmartPad application open
    When I type "Hello World" in the editor
    Then I should see "Hello World" displayed in the editor 