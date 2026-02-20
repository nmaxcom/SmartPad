# Solve & Symbolic Capability Matrix (Legacy Delta)

Status: proposed
Source: extracted from legacy `docs/MATH_CAPABILITIES.md`.

This card tracks solver behavior currently implemented/tested but not yet represented by a dedicated canonical `docs/Specs/*.spec.md` source spec.

## Implemented capabilities (observed)

- Function inverse isolation: `sqrt`, `exp`/`ln`/`log10`, `sin`/`asin`, `cos`/`acos`, `tan`/`atan`.
- Fractional exponents and reciprocal-power rewrites (`x^(1/2)`, `x^(3/4)`).
- Denominator isolation (e.g., `y = 1/(x+2)` -> `x => 1/y - 2`).
- Logistic-ratio special case:
  - `y = ln(x/(1-x))` -> `x => exp(y)/(1+exp(y))`.
- Nested chain isolation across grouped operations.

Primary validation surface today:
- `tests/unit/solve.test.ts`

## Known limitations (observed)

- General "variable appears on both sides" cases remain unsupported outside known patterns.
- Non-invertible helper functions are not solve-inverted (`round`, `floor`, `ceil`, `max`, `min`).
- Unit/currency/date expressions are intentionally not routed through symbolic solving in most cases.

## Promotion criteria

Promote to implemented once there is a dedicated source spec for solve behavior and mapped verification coverage beyond ad-hoc test discovery.
