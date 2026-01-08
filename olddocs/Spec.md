# SmartPad Product Specification

This is the canonical specification for all user‑facing behavior in SmartPad. It merges user stories and acceptance criteria into concise “Behavior and criteria” sections. Examples use caret exponents (e.g., `m/s^2`) and `*` for multiplication.

Contents
- 1. Editor fundamentals
- 2. Variables
- 3. Expressions and results (`=>`)
- 4. Units and dimensional analysis
- 5. Variable panel
- 6. Templates and insertion
- 7. Save and load functionality
- 8. Keyboard and cursor behavior
- 9. Settings and formatting
- 10. Errors and messages
- 11. Number scrubbing and highlighting
- 12. Future features (stubs)
 - A. Appendix: Supported syntax and operations

## 1. Editor fundamentals

Behavior and criteria
- The editor is line‑based. Pressing Enter creates a new paragraph; deleting merges appropriately.
- Standard selection, copy, cut, and paste behave like a plain text editor.
- Paragraph text represents only what the user typed (e.g., `2 + 3 =>`). Results are separate widgets and do not alter the text.

## 2. Variables

### 2.1 Basic assignments
Behavior and criteria
- Form: `name = value` or `name = expression`.
- Names may include spaces and underscores; must start with a letter; consist of letters, numbers, spaces, and underscores.
- Assignment‑only lines store variables without rendering a widget; results appear only when `=>` is used.
- Assignments take effect immediately and can be referenced by later lines.

Examples
```
price = 10.5
my password = 2929
ratio = 3/2
```

#### 2.1.1 Disambiguation rules
Behavior and criteria
- The line must begin with the variable name (ignoring leading whitespace) and contain exactly one `=` for assignment.
- After the right‑hand side finishes (value or expression), there must be no trailing non‑whitespace characters on the line.
- If these conditions are not met, the line is not treated as an assignment (it remains plain text unless it ends with `=>`).

Invalid/ambiguous examples
```
I think my password = 2929 is secure   # trailing text → not an assignment
= 2929                                  # no variable name → not an assignment
my variable =                           # missing value → not an assignment
```

### 2.2 Combined assignment with evaluation
Behavior and criteria
- Form: `name = expression =>`. Stores the variable and shows a result widget next to `=>`.
- If evaluation fails, the variable is not created and an error widget appears.

Examples
```
area = length * width =>
final = subtotal * (1 + tax) =>
```

### 2.3 Reactivity
Behavior and criteria
- Variables defined from other variables update dependents immediately when edited.
- Circular dependencies are detected; the offending line shows an error and the assignment is skipped.

### 2.4 Variable state and persistence
Behavior and criteria
- Variables are stored in session state and available for use on subsequent lines.
- Refreshing the page clears variables (session‑based for now).
- The variable panel (Section 5) reflects current state after each evaluation cycle.

## 3. Expressions and results (`=>`)

### 3.1 Trigger and evaluation
Behavior and criteria
- Any line that ends with `=>` is evaluated. The result is rendered as a widget adjacent to `=>`.
- Visible paragraph text remains the user’s input; results are never inserted into the text.
- Expressions may reference variables and support arithmetic and functions.

Examples
```
2 + 3 =>          # shows 5
price * 1.08 =>   # uses stored price
sqrt(16) + 2 =>   # shows 6
```

### 3.2 Spacing and display
Behavior and criteria
- Spacing around operators and the trigger is preserved in the paragraph text: `2 + 3 =>`.
- Results render in a `.semantic-result-display` widget with a stable `data-result` attribute and visible text when required by UX.

### 3.3 Editing and re‑evaluation
Behavior and criteria
- Editing any part of an expression line re‑evaluates the result.
- Changing a variable updates all dependent expressions’ widgets.

### 3.4 Recognition rules
Behavior and criteria
- A line is an expression only if it contains the `=>` trigger.
- Assignment detection runs before expression detection.
- Lines without `=>` are not evaluated, even if they contain operators or functions.
- Parentheses determine order of operations; `^` is exponentiation.

## 4. Units and dimensional analysis

This section defines the user‑facing behavior. Technical details live in `Units.md`.

### 4.1 Basics
Behavior and criteria
- Quantities: `10 m`, `2 kg`, `60 s`, `25 C`, `9.8 m/s^2`.
- Supported operations: add, subtract (compatible units), multiply, divide, raising to powers, and common math functions where meaningful.

Examples
```
10 m =>
100 m / 10 s =>
2 kg * 9.8 m/s^2 =>
```

### 4.2 Conversions
Behavior and criteria
- Conversions are explicit using `to` against a value or a named variable defined earlier.

Examples
```
speed = 0.5 m/s
speed to km/h =>    # ~1.8 km/h
force to lbf =>     # when force is defined above
```

### 4.3 Compatibility rules
Behavior and criteria
- Adding/subtracting incompatible dimensions yields an error widget.
- Mixed systems auto‑convert to a sensible unit for display.
- Unitless plus/minus unit is allowed only when the unitless operand is zero; otherwise an incompatibility error.

Examples
```
3 m + 2 s =>        # error: incompatible dimensions
3 m + 0 => 3 m      # allowed zero case
```

### 4.4 Temperature policy
Behavior and criteria
- Temperature + temperature difference = temperature. Temperature − temperature = temperature difference.
- ASCII‑friendly notation only (e.g., `C`, `F`, `K`). If `°` is typed, it should still parse consistently.

Examples
```
100 C + 50 K =>     # 150 C (temperature + difference)
100 C - 50 C =>     # 50 K (difference)
```

### 4.5 Display and precision
Behavior and criteria
- Decimal places follow settings.
- Smart unit thresholds select readable prefixes (e.g., `mm`, `km`; `kPa`, `MPa`).
- Large magnitudes switch to scientific notation beyond a threshold; whole integers remain unscientific.

### 4.6 Error cases
Behavior and criteria
- Clear error messages for incompatible units, undefined variables, invalid conversions, division by zero, and domain errors (e.g., `sqrt(-1)`).
- Errors render in `.semantic-error-result` with `data-result` and visible text (including `⚠️` when used).

### 4.7 Common unit categories (non‑exhaustive)
- Length, Mass, Time, Area, Volume, Speed
- Force, Pressure, Energy, Power
- Electric (Voltage, Current, Resistance, Capacitance, Inductance)
- Temperature (K, C, F)

## 5. Variable panel

Behavior and criteria
- Displays current variables and values; updates after each evaluation cycle.
- Assignment‑only lines affect the panel; widgets render only for lines that use `=>`.

## 6. Templates and insertion

Behavior and criteria
- Inserting templates or programmatic content produces the same behavior as typing: each `=>` line yields a widget, variable definitions are stored, and highlighting applies.
- Insertion uses paragraph‑preserving patterns; no "line smushing."

Examples
```
base rent = 1250
utilities = 185
internet = 75
monthly total = base rent + utilities + internet =>
yearly total = monthly total * 12 =>
```

## 7. Save and load functionality

Behavior and criteria
- Two buttons are available in the right sidebar: "Save" and "Load".
- The Save button opens a dialog where users can name their save state.
- The Load button shows a dropdown menu with all saved states.
- Users can save multiple named states (up to 10 slots).
- Each save slot shows the name and relative timestamp (e.g., "2m ago", "1h ago").
- Users can delete individual save slots from the load menu.
- No automatic saving or loading occurs - all actions are user-initiated.
- Save states persist across browser sessions and page refreshes.
- The system automatically manages storage by removing oldest saves when limit is reached.

Examples
```
# User types content and clicks Save
price = 10.5
quantity = 3
total = price * quantity =>

# Save dialog appears asking for a name
# User types: "Pricing calculation test"

# Later, user clicks Load and sees:
# - Pricing calculation test (2m ago)
# - Previous test case (1h ago)
# - Error scenario (2h ago)

# User clicks on "Pricing calculation test" to restore that state
```

## 8. Keyboard and cursor behavior

Behavior and criteria
- Caret remains stable around `=>`; edits preserve spacing in paragraph text.
- Enter creates a new paragraph after the current line; Backspace near the result returns caret toward `=>` for editing.

## 9. Settings and formatting

Behavior and criteria
- Decimal places and unit display preferences affect widget formatting only, not paragraph text.
- Global settings are applied consistently across evaluators.
- Scientific notation threshold and rounding policy are consistent across units and pure math.
- There is a setting to toggle comma-based thousand separators so standard-notation results (including the variable panel) can show `1,000,000` without changing the typed expression or scientific notation.

## 10. Errors and messages

Behavior and criteria
- Normalized, friendly messages across all evaluation paths (e.g., incompatible units, division by zero, undefined variable, invalid token).
- Error widgets are visible/selectable where tests require it and carry `data-result` for automation.

## 11. Number scrubbing and highlighting

Behavior and criteria
- Semantic highlighting styles numbers, units, variables, operators, and the trigger symbol for clarity. It does not evaluate.
- Number scrubbing changes numeric tokens in place, re‑evaluates affected expressions, and updates widgets. Surrounding text structure is preserved.

Behavioral notes
- Scrubbing respects token boundaries (does not merge with neighboring text or units).
- Scrubbing preserves spacing around the token and the `=>` trigger.

## 12. Future features (stubs)

### Charts
Behavior and criteria
- Will define syntax (e.g., `chart(data, options) =>`), rendering behavior as a widget, and interactions. Details to be added when implemented.

### External data / API getters
Behavior and criteria
- Will define lookup syntax (e.g., `population("usa") ?>`), caching and rate‑limit UX, and error handling. Details to be added when implemented.

---

## Appendix A: Supported syntax and operations

Numbers
- Integers, decimals, negatives, scientific notation (e.g., `1.23e+4`).

Operators
- Addition `+`, subtraction `-`, multiplication `*`, division `/`, exponent `^`.

Functions (initial set)
- `sqrt(x)`, `abs(x)`, `round(x)`, `floor(x)`, `ceil(x)`
- Trigonometric: `sin(x)`, `cos(x)`, `tan(x)` (dimensionless arguments)
- Logarithms/exponentials: `log(x)`, `ln(x)`, `exp(x)`

Parentheses
- Full grouping support; standard precedence with `^` > `*` `/` > `+` `-`.

Variables
- Names start with a letter; letters, digits, spaces allowed. Longest‑match resolution for phrases with spaces.

Conversions
- `to` keyword on a line referencing a quantity (variable or expression result), e.g., `speed to km/h =>`.

Performance targets (non‑blocking UI)
- Simple expressions: ~<100 ms
- Complex expressions: ~<300 ms
- Re‑evaluation after edits should keep typing latency below perceptible thresholds.
