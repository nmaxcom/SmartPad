# 📋 SmartPad Project Overview

> 🧭 **Navigation**: [`docs/INDEX.md`](./docs/INDEX.md) > `about.MD`  
> 📍 **You are here**: Complete project vision & requirements

# SmartPad: Next-Generation Text-Based Calculator

Similar projects: parsify.app, figr.app, aybo.app, calca.io, numi.app, Soulver 3, notepadcalculator.com, mathnotepad.com, bbodi.github.io/notecalc3, numbat.dev, hissab.io, numpad.io, antinote

## Project Overview

The SmartPad is a text-based web application that combines the simplicity of a plain text editor with the power of real-time mathematical interpretation and calculation. It allows users to write regular notes, define variables, and perform calculations seamlessly within a single text document. It's meant to work like an advanced version of a "back-of-the-envelope calculation".

Future features include:
- Other elements besides text and numbers, like small charts and other interactive elements
- The ability to change the value of variables in a continuum by dragging its value with the mouse, that way we can fiddle with values and quickly see how it impacts results
- Invoking real world values SmartPad will automatically insert for the user like earth's mass, number of mamal spieces, Spain's GDP, currency conversions and so on (specific mechanics to be figured out)
- Variable auto-complete

## Core Functionality

### Simple Text Editor

*   The application provides a basic text editing interface similar to a standard notepad.
*   Like similar editors, it'll use an editable div that will turn the input into the correct DOM structure within it, making each line a div element.
*   Users can freely type text, numbers, mathematical expressions, and variable assignments, remove or create lines, split them with enter...

### Real-time Parsing and Calculation

*   The application continuously parses the entire document, line by line, on every kepress.
*   It identifies and processes special lines containing variable assignments or expressions to be calculated.
*   All calculations are updated instantly as the user types or modifies any part of the document.

## Key Components and Rules

### 1\. Variable Assignments

*   Syntax: `VARIABLE NAME = VALUE`
*   Example: `price = 10.5`
*   Rules:
    *   Must be on a single line.
    *   The `=` symbol is used exclusively for variable assignment.
    *   Variables can be reassigned new values.
    *   Variable names should be alphanumeric (exact regex to be defined in implementation).

### 2\. Expressions and Calculations

*   Syntax: `EXPRESSION =>`
*   Example: `2 * price =>`
*   Rules:
    *   Must be on a single line.
    *   The `=>` symbol indicates that the preceding expression should be evaluated.
    *   The application replaces anything to the right of `=>` with the calculated result.
    *   If the expression is invalid, an error is indicated (see Error Handling).

### 3\. Unit Handling

*   The application supports basic unit calculations.
*   Users can define and use arbitrary units.
*   Example: `2 apples * 3 baskets => 6 apple*baskets`
*   Rules:
    *   Units are treated as algebraic entities.
    *   The application ensures unit calculations are coherent and correct.
    *   It does not perform unit conversions or have predefined unit values.

### 4\. Mathematical Operations

*   Supported operations include basic arithmetic: addition, subtraction, multiplication, division, and exponents.
*   The application should handle operator precedence correctly.

### 5\. Line Processing

*   Each line is processed independently.
*   Lines are categorized as:
    *   Variable assignment (contains `=`)
    *   Expression to be evaluated (contains `=>`)
    *   Plain text (any other line)

### 6\. Real-time Updates

*   Any change in the document triggers a re-evaluation of all expressions.
*   Results are updated immediately after any variable assignment or modification.

### 7\. Error Handling

*   It's ok if an error occurs during parsing or evaluation in some lines, it shouldn't break the app. If a line is wrong, it's probably because the user is still typing it.
*   For currently invalid expressions:
    *   The background of the problematic line is set to red.
    *   Detailed error information is logged to the console.
*   Types of errors to handle include:
    *   Invalid mathematical expressions
    *   Undefined variables
    *   Unit mismatches or inconsistencies

### 8\. User Interface

*   The interface is primarily text-based.
*   No explicit UI elements like buttons or input fields for variables or expressions.
*   Because we're using an editable div, we can use CSS to highlight variables and calculated results for visual distinction.

## Design Principles

The implementation of this project should adhere to the following principles:

1.  SOLID principles should be followed to ensure a robust and maintainable codebase.
2.  The code should be clear and readable, even if it results in more verbose implementations.
3.  The architecture should be designed with ease of expansion in mind, anticipating potential future enhancements.
4.  Separation of concerns should be maintained between different functionalities (e.g., text processing, mathematical evaluation, error handling).
5.  The general workflow should be found in a main file that handles all functionality leveraging the other modules.

## Content examples of SmartPad usage

### Example 1: Simple Grocery Budget

My Weekly Grocery Budget

eggs price = 2.50$  
milk price = 3.75$  
bread price = 2.25$

Weekly shopping list:

2 dozen eggs  
3 gallons of milk  
2 loaves of bread  
Total cost: (2 \* eggs price) + (3 \* milk price) + (2 \* bread price) => 18.25$

If I want to keep my budget under $15, I need to save:  
18.25$ - 15$ => 3.25$

In this example, the application would:

1.  Recognize and store the variable assignments for egg price, milk price, and bread price.
2.  Calculate the total cost when it encounters the line with "=>".
3.  Perform the budget difference calculation in the last line.

### Example 2: Basic Physics Calculations (with units)

Calculating Force and Acceleration

mass = 10 kg  
acceleration = 5 m/s^2

Force (F = ma):  
mass \* acceleration => 50 kg\*m/s^2

Note: kg\*m/s^2 is equivalent to Newtons (N)

Let's change the mass:  
mass = 15 kg

Updated Force:  
mass \* acceleration => 75 kg\*m/s^2

Now, let's calculate acceleration given force and mass:

force = 100 N  
mass = 20 kg

Acceleration (a = F/m):  
force / mass => 5 m/s^2

In this example, the application would:

1.  Handle unit calculations (kg\*m/s^2).
2.  Update the force calculation when the mass is changed.
3.  Perform division with units correctly.

### Example 3: Handling Errors

Error Handling Examples

Valid calculation:  
2 + 3 => 5

Undefined variable:  
x + 5 =>

Division by zero:  
10 / 0 =>

Unit mismatch:  
5 meters + 3 seconds =>

In this example:

1.  The first calculation would display normally.
2.  The subsequent calculations would display with a red background.
3.  Error details for each invalid calculation would be logged to the console.

### Example 4: Custom Units

Recipe Scaling

recipe flour = 2 cups  
recipe sugar = 0.5 cups  
recipe eggs = 3 units

Scaling factor:  
scale = 1.5

Scaled ingredients:  
recipe flour \* scale => 3 cups recipe sugar \* scale => 0.75 cups recipe eggs \* scale => 4.5 units

Note: We might need to round the number of eggs: round(recipe eggs \* scale) => 5 units

This example demonstrates:

1.  Use of custom units (cups, units).
2.  Calculations with scaling factors.
3.  A note about potential need for a rounding function (not implemented in the basic version).

These examples showcase various aspects of the SmartPad, including variable assignments, real-time calculations, unit handling, error scenarios, and potential use cases. They illustrate how users can seamlessly mix text, variables, and calculations in a single document.simil
