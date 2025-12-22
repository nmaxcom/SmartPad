# Units Reference (Technical)

This document provides developer‑oriented details for the units system. User‑facing behavior lives in `Spec.md`.

## Goals and scope
- Comprehensive dimensional analysis and conversions via UnitsNet.
- A single arithmetic engine for both unitful and dimensionless math.
- Deterministic formatting and error messages across all paths.

## Architecture
- Adapter: `src/units/unitsnetAdapter.ts` (SmartPadQuantity)
  - Wraps UnitsNet values and exposes operations (+, -, *, /, ^, functions) and formatting.
  - Tracks dimensions for compatibility checks and conversions.
- Evaluators: `src/units/unitsnetEvaluator.ts`, `src/units/unitsnetAstEvaluator.ts`
  - Tokenize/parse expressions with units and constants; return render nodes with display text and positions.
  - Have highest priority in `src/eval/registry.ts` to handle any expression that involves units.
- Variables: stored as `SmartPadQuantity` where applicable to retain dimension metadata.

## Data model
- `SmartPadQuantity` encapsulates:
  - Numeric value in canonical base units
  - Dimension signature (e.g., `L T^-1` for speed)
  - Preferred display unit (optional) and formatting hints
- Plain numbers are treated as dimensionless quantities for a unified math path.

## Operations and compatibility
- Addition/Subtraction: require identical dimensions.
  - Unitless with unit allowed only when the unitless operand is zero.
- Multiplication/Division: dimensions combine (e.g., `Length/Time = Speed`).
- Power: raises dimension and value; non‑integer exponents may be restricted by UnitsNet capabilities.
- Functions: only when meaningful (e.g., `sqrt(m^2) = m`; trig on dimensionless).

Examples
```
10 m + 50 cm => 10.5 m
100 m / 10 s => 10 m/s
2 kg * 9.8 m/s^2 => 19.6 N
sqrt(9 m^2) => 3 m
```

## Conversions (`to`)
- Form: `quantity to <target unit> =>` where `quantity` is a variable or expression result.
- Cross‑category conversions are invalid (e.g., `m` to `s`).
- Mixed systems auto‑convert inputs; explicit `to` determines target display.

Examples
```
speed = 0.5 m/s
speed to km/h => 1.8 km/h
force to lbf => 6.61 lbf
```

## Temperature semantics
- Temperature + difference = temperature; temperature − temperature = difference.
- Keep ASCII‑friendly forms (`C`, `F`, `K`); support `°` variants when typed.
- Explicit conversions use `to` with absolute scales as needed.

Examples
```
100 C + 50 K => 150 C
100 C - 50 C => 50 K
25 C to K => 298.15 K
```

## Display and precision policy
- Decimal places are driven by settings; default used in tests should be documented in test helpers.
- Smart prefix thresholds choose readable SI prefixes (mm/cm/km; mA/kA; kPa/MPa) to avoid unwieldy numbers.
- Scientific notation for magnitudes beyond threshold; whole integers remain non‑scientific.
- Policy: preserve originally typed unit for simple echoes (`60 s => 60 s`). Use best display unit for derived/combined results.
- Spacing: display uses a space between value and unit (`10 m`), caret exponents (`m^2`), and slash for compound units (`m/s^2`).

Suggested thresholds (tuneable)
- Switch to scientific notation when abs(value) >= 1e6 or < 1e-4 (configurable).
- Auto‑prefix when value crosses 1000 or 0.01 boundaries in base units (category‑specific allowances).

## Error taxonomy and normalization
- Incompatible dimensions: `⚠️ incompatible dimensions: <lhs> and <rhs>`
- Division by zero: `⚠️ division by zero`
- Undefined variable: `⚠️ undefined variable: <name>`
- Invalid unit or conversion: `⚠️ invalid unit/conversion: <from> → <to>`
- Domain errors (e.g., `sqrt(-1)`): mapped to friendly messages

All error widgets must be visible/selectable when required by UX and expose `data-result` for automation.

## Supported categories (non‑exhaustive)
- Length, Mass, Time, Area, Volume, Speed
- Force, Pressure, Energy, Power
- Electric (Voltage, Current, Resistance, Capacitance, Inductance)
- Temperature (K, C, F)
- Frequency, Angle, Information (as supported by UnitsNet)

## Aliases and unit names
- Common aliases should be recognized (e.g., `mph` = `mi/h`, `kph` = `km/h`, `lbs` = `lbf`).
- Keep a single source of truth for aliases in the adapter; add tests for every alias.

## Developer recipes
- Adding a unit alias
  - Update the adapter’s parsing map; add unit tests confirming recognition and correct base mapping.
- Adding a category
  - Map UnitsNet types to `SmartPadQuantity` dimension signatures; implement formatting and conversions; add tests.
- Tweaking display policy
  - Change thresholds in formatting; update tests to align tolerances and regex expectations.

## Performance considerations
- Prefer caching of common conversions.
- Keep evaluation linear; avoid repeated tokenization across evaluators.
- Large documents: process incrementally where possible.

## Testing guidance
- Use Playwright for UI flows; assert via `.semantic-result-display[data-result]` and `.semantic-error-result[data-result]`.
- Wait for `evaluationDone` → decorator rebuild → `uiRenderComplete` before assertions.
- For units, match tolerant rounding via regex; avoid brittle exact string matches where policy allows smart prefixes.

## Known decisions and open items
- Mixed add/sub with unitless values: strict policy (allow only zero) recommended; verify code paths and migrate tests where needed.
- Temperature policy: confirm final wording and ensure consistent behavior across evaluators.
- Rounding/precision: document default decimals and scientific notation thresholds in code and tests.



