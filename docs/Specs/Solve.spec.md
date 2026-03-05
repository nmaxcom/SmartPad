# SmartPad Solve and Symbolic Math Spec

This spec defines SmartPad's solve behavior for unknown variables, including implicit back-solving (`x =>`) and explicit solve clauses (`solve x in ... =>`).

---

## 0) Goals

1. Allow users to solve for unknowns without leaving plain-text math flow.
2. Return numeric answers when enough values exist.
3. Return symbolic expressions when values are missing but the equation is solvable.
4. Keep solve behavior deterministic and line-order aware.

---

## 1) Trigger Forms

### 1.1 Implicit solve trigger

- Syntax: `<target variable> =>`
- Examples:
  - `qty =>`
  - `break_even_km =>`

Behavior:
- If the target variable already has a concrete value, SmartPad returns that value.
- Otherwise SmartPad searches prior equations and attempts to isolate the target.

### 1.2 Explicit solve trigger (deterministic path)

- Syntax: `solve <target> in <equation>[, <assignment>, ...][ where <clause>] =>`
- Examples:
  - `solve v in distance = v * time =>`
  - `solve v in distance = v * time, time = 2 s, distance = 40 m =>`
  - `solve r in area = PI * r^2 where r > 0 =>`

Notes:
- Explicit solve with `=>` is the deterministic path and works even when live previews are off.
- `where` is accepted syntactically and preserved as part of explicit solve input, but does not currently alter solve algebra.

### 1.3 Live-mode explicit solve (no trigger)

- Syntax: `solve <target> in <equation>[, <assignment>, ...][ where <clause>]`
- Current behavior:
  - When `liveResultEnabled = true`, this line can evaluate as a live expression.
  - When `liveResultEnabled = false`, this line is visually suppressed unless `=>` is present.

Recommendation:
- Keep `=>` on shared/reviewed solve lines for deterministic behavior across settings.

---

## 2) Equation Sources

Implicit solve can use equations recorded from earlier lines, including:

1. Variable assignments:
   - `distance = v * time`
2. Combined assignments:
   - `distance = v * time =>`
3. Standalone equations without trigger:
   - `3 * x + 2 = 0`
4. Triggered assignment outputs with explicit right-hand values:
   - `crossover balance => 0` (records `crossover balance = 0`)

Line-order contract:
- Solve only uses equations above the solve line.
- The nearest compatible equation above is preferred.

---

## 3) Output Contract

1. Numeric when fully resolvable:
   - `distance = 40 m`, `time = 2 s`, `v =>` -> `20 m/s`
2. Symbolic when unresolved values remain:
   - `distance = v * time`, `v =>` -> `distance / time`
3. Solved expressions substitute known scalar constants when available.
4. Unit/currency conversion suffixes (`to` / `in`) can be applied after solve when conversion target is valid.

---

## 4) Implemented Algebra Coverage

Supported isolation patterns include:

1. Linear arithmetic with `+`, `-`, `*`, `/`
2. Power isolation:
   - square roots (`x^2` <-> `sqrt`)
   - fractional exponents
   - constant-base exponent inversion via logarithms
3. Function inverses:
   - `sqrt`, `exp`, `ln`/`log`, `log10`
   - `sin`/`asin`, `cos`/`acos`, `tan`/`atan`
4. Special-case ratio inversion:
   - `y = ln(x / (1 - x))` -> `x = exp(y) / (1 + exp(y))`
5. Nested expression isolation across grouped operations.
6. Aggregator expansion for solve algebra:
   - `sum(...)` / `total(...)` are expanded to additive forms during solve parsing.

---

## 5) Guardrails and Errors

Solve returns explicit errors for invalid or unsupported cases, including:

1. `Cannot solve: no equation found for "<target>"`
2. `Cannot solve: equation is not valid`
3. `Cannot solve: multiple equations for target` (explicit solve)
4. `Cannot solve: variable appears on both sides` (except known denominator special case)
5. `Cannot solve: unsupported function` / `unsupported operator`
6. `⚠️ Cannot solve: no real solution` when solved expression requires invalid real-domain evaluation (for example negative radicand)

---

## 6) Acceptance Examples

1. Implicit symbolic solve:
   - `distance = v * time`
   - `v =>`
   - Result: `distance / time`

2. Implicit numeric solve:
   - `distance = v * time`
   - `distance = 40 m`
   - `time = 2 s`
   - `v =>`
   - Result: `20 m/s`

3. Explicit solve with inline assumptions:
   - `solve v in distance = v * time, time = 2 s, distance = 40 m =>`
   - Result: `20 m/s`

4. Standalone equation solve:
   - `3 * x + 2 = 0`
   - `x =>`
   - Result: `-0.666667`

5. Solve with aggregate expansion:
   - `goal = total(50, 20, x)`
   - `goal => 100`
   - `x =>`
   - Result: `30`
