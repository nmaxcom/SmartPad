# SmartPad Advanced Math Spec

Status: implemented

Implemented in: `1.0.0-rc.14`

This spec defines matrices, complex values, and explicit symbolic operations. The feature adds mathematical depth while preserving SmartPad's text-first, live, reusable value model.

## 1. Design contract

1. Advanced values are written, edited, copied, and reused as ordinary sheet text.
2. Existing scalar, unit, currency, date, and list evaluation keeps precedence unless an expression clearly requests advanced math.
3. Symbolic transformations are explicit commands. SmartPad does not silently reinterpret ordinary prose or unresolved variables as algebra.
4. Results use parseable SmartPad notation so they can be reused in later lines.
5. No detached algebra canvas or persistent control panel is introduced.

## 2. Matrices

Accepted literal forms:

```smartpad
A = [[1, 2], [3, 4]]
B = [1, 2; 3, 4]
```

Both render canonically as `[1, 2; 3, 4]`.

Supported operations:

```smartpad
A + B
A - B
A * B
A^2
transpose(A)
det(A)
inv(A)
trace(A)
rows(A)
cols(A)
eigenvalues(A)
linsolve(A, b)
```

Matrix entries may be real or complex numbers. Matrices must be rectangular and are capped at 25 × 25. Dimension mismatches, singular inverses, and unsupported results return visible errors rather than silent coercion.

`linsolve(A, b)` solves the linear system `A·x=b`. `b` may be a column matrix or compatible numeric list.

## 3. Complex numbers

Complex literals use conventional `i` notation:

```smartpad
z = 3 + 4i
z * (2 - i)
```

Supported helpers:

```smartpad
complex(3, 4)
re(z)
im(z)
abs(z)
arg(z)
conj(z)
```

Complex values remain distinct from real scalar values. A value with a non-zero imaginary part cannot be treated as a scrubber input, unit quantity, or ordinary chart coordinate.

## 4. Symbolic operations

Supported explicit calls:

```smartpad
simplify((x + x) / 2)
expand((x + 1)^3)
factor(x^2 - 5*x + 6)
derive(x^3 + sin(x), x)
integrate(2*x, x)
substitute(x^2 + 1, x, 3)
roots(x^2 - 5*x + 6, x)
```

Aliases `derivative` and `diff` map to `derive`. Human-readable command forms such as `derive x^3 by x` are also accepted for derive, integrate, roots, simplify, expand, and factor.

Symbolic results can be named and reused:

```smartpad
formula = expand((x + 1)^3)
derive(formula, x)
```

`roots` treats a bare expression as equal to zero and accepts an explicit equation. Unsupported symbolic syntax returns a `Symbolic math:` error at the source line.

## 5. Discovery and UX

- The `Advanced Math` template is the guided, runnable introduction.
- Function autocomplete includes every supported matrix, complex, and symbolic helper.
- Results appear in the same live result chips as ordinary calculations.
- Explicit `=>` remains optional for ordinary live expressions and useful when a durable command-like result is desired.

## 6. Deliberate boundaries

This version does not provide:

- an interactive geometry/CAS canvas
- assumptions, domains, limits, symbolic sums, or differential-equation solving
- step-by-step algebraic proofs
- symbolic unit or currency algebra
- arbitrary precision numeric matrices

These boundaries keep advanced math deterministic and prevent it from changing the meaning of existing SmartPad sheets.

## 7. Acceptance examples

```smartpad
A = [[1, 2], [3, 4]]
det(A) =>
# -2

z = 3 + 4i
z * (2 - i) =>
# 10 + 5i

derive(x^3 + sin(x), x) =>
# 3 * x ^ 2 + cos(x)
```

The feature gate requires targeted unit coverage, a real-browser rendering flow, related regression tests, documentation/spec trust checks, and a production build.
