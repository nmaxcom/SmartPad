# Solve and Symbolic Math

- Status: `implemented`
- Source spec: `docs/Specs/Solve.spec.md`
- Mapped groups:
  - `Solve And Symbolic Math`
  - `Expression Engine`
- Verification tests:
  - `tests/unit/solve.test.ts`
  - `tests/unit/astParser.test.ts`
  - `tests/unit/capabilitySprintTemplate.test.ts`
  - `tests/unit/goalSeekTemplate.test.ts`
  - `tests/e2e/bounded-goal-seek.spec.ts`
  - `tests/e2e/goal-seek-template.spec.ts`

This card is the trust declaration for shipped solve behavior, including one-variable Goal Seek with optional inclusive, unit-aware lower and upper limits.
