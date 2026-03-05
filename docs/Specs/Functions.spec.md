# SmartPad User-Defined Functions Spec

This spec defines single-line user-defined function behavior (definition, invocation, argument binding, and errors).

---

## 0) Goals

1. Let users define reusable formulas inline in sheet syntax.
2. Support positional, named, and default arguments.
3. Preserve semantic typing across units/currency/percentages.
4. Keep failures explicit and local to the call site.

---

## 1) Syntax

### 1.1 Function definition

- Syntax: `<name>(<params>) = <expression>`
- Examples:
  - `area(r) = PI * r^2`
  - `tip(bill, rate=15%) = bill * rate`
  - `magic() = 42`

Rules:
- Function definitions do not use `=>`.
- Redefinition is allowed; latest definition replaces previous.

### 1.2 Function calls

- Positional:
  - `area(3 m) =>`
- Named:
  - `tip(rate: 20%, bill: 50) =>`
- Mixed/default:
  - `tax(amount, rate=rate) = amount * rate`
  - `tax(200) =>`

---

## 2) Evaluation Contract

1. Functions are resolved from `functionStore` by normalized function name.
2. External variables are read dynamically from current variable context (not lexical snapshot).
3. Parameter defaults are evaluated in call context.
4. Maximum call depth is guarded (`Maximum call depth exceeded`).

---

## 3) Type Behavior

1. Units and currency values pass through function calls as semantic values.
2. Unit/currency arithmetic inside functions follows existing semantic arithmetic rules.
3. Conversion suffixes can be applied to function call results:
   - `calc(3 m) to cm^2 =>`
   - `calc(3 m) in cm^2 =>`

---

## 4) Errors

1. `Undefined function: <name>`
2. `Missing argument: <param>`
3. `Unknown argument: <name>`
4. `Error in <functionName>: <inner error>`
5. `Maximum call depth exceeded`

---

## 5) Acceptance Examples

1. Named argument call:
   - `tip(bill, rate=15%) = bill * rate`
   - `tip(rate: 20%, bill: 50) =>`
   - Result: `10`

2. Dynamic external scope:
   - `rate = 10%`
   - `tax(amount) = amount * rate`
   - `tax(100) =>` -> `10`
   - `rate = 20%`
   - `tax(100) =>` -> `20`

3. Unit-aware call:
   - `speed(distance, time) = distance / time`
   - `speed(150 m, 12 s) =>`
   - Result: `12.5 m/s`

4. Missing argument error:
   - `square(x) = x * x`
   - `square() =>`
   - Result: `⚠️ Missing argument: x`
