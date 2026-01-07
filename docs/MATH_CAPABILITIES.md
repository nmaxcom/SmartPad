# Math Capabilities (Current Solver Status)

SmartPad’s `SolveEvaluator` now understands a broader set of symbolic patterns without relying on an external CAS:

## What it can do today

- **Function inverses** – `sqrt`, the exponential/log pair (`exp` ↔ `log`/`ln`, `log10`), and the six basic trigonometric functions (`sin`, `cos`, `tan` plus their inverses) are “unwound” when the target appears inside the function.
- **Fractional powers** – expressions such as `x^(1/2)` or `x^(3/4)` are accepted because the exponent parser now evaluates literal fractions (`1/2`, `3/4`, etc.) and multiplies by the reciprocal (e.g., solving `x^3 = K` returns `K^(1/3)`).
- **Rational denominators** – the solver can isolate targets that appear inside denominators; for example `y = 1 / (x + 2)` now rewrites to `x => 1 / y - 2`.
- **Logistic ratios** – expressions like `y = ln(x / (1 - x))` are now detected specially, so the solver returns `exp(y) / (1 + exp(y))` without throwing `variable appears on both sides`.
- **Complex chains** – nested expressions such as `(((z + 3)^2) + 2) / 4` still resolve because the recursive solver traverses parentheses/exponents and applies the algebraic inverse at each level.
- **Test coverage** – these capabilities are exercised in `tests/unit/solve.test.ts`, particularly the new cases added for `log10(x^3)`, `2 * sin(3 * x)`, `tan(x / 2)`, `growth = initial * exp(rate * time)`, and `y = 4 * exp(0.5 * x)` so we can confidently expand the behavior from `docs/next.md`.

## Format strategy

- The result formatter now falls back to returning the symbolic expression whenever evaluating it would require unknown identifiers. That keeps the displayed text readable (e.g., `atan(y) * 2` or `(10 ^ y) ^ 0.3333333333333333`) even if we cannot fully simplify numerically.

## Known limitations & next steps

- **Variable on both sides** – more complex systems where the target appears on both sides of the same operator (beyond the logistic pattern above) remain unsupported; we still bubble the “variable appears on both sides” runtime error.
- **Rounding/max/min** – functions such as `round`, `floor`, `ceil`, `max`, and `min` remain semantic helpers; the solver does not invert them yet, so `round(PI, 2)` or `max(a, b)` will keep returning the symbolic expression until we add explicit support.
- **Units & dates** – the solver avoids handing unit/currency/date expressions to this symbolic path; those continue to rely on the standard evaluator. Mixing units inside symbolic solving still requires manual manipulation.

## What’s next (per `docs/next.md`)

- Continue adding the remaining equations from `docs/next.md`, keeping this capability log up to date and pointing to the relevant test cases. The next chunk will cover rounding behavior, symbolic simplification, and any missing inverse routes (e.g., logistic ratios) before documenting the outputs in the public spec.
