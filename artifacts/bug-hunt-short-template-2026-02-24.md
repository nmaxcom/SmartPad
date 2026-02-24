# SmartPad Bug Hunt Short Template

## BH-001 | 95% | P1 | BUG
Minimal repro:
```smartpad
1,,2=>
1, ,2=>
```
# Expected: explicit parse error for empty list element (for example `Cannot create list: empty value`) per list validation behavior in `docs/Specs/Lists.spec.md`.
# Impact: users get no feedback and cannot self-correct malformed list input.
# Recommendation: force explicit error render on empty list elements in explicit `=>` path.

## BH-002 | 98% | P1 | BUG
Minimal repro:
```smartpad
1,2 to =>
```
# Expected: invalid conversion target error; `to` should only bind when RHS is a valid unit target.
# Impact: incorrect output can be mistaken for valid computation.
# Recommendation: reject empty target after `to|in` before list annotation path.

## BH-003 | 92% | P0 | BUG
Minimal repro:
```smartpad
speed=9m/s
speed to m/(0 s)=>
```
# Expected: hard error for zero denominator target.
# Impact: mathematically invalid result accepted as valid conversion.
# Recommendation: disallow zero-valued denominator groups in conversion targets.

## BH-004 | 90% | P0 | BUG
Minimal repro:
```smartpad
distance=v*time
distance=10m
time=0s
v=>
```
# Expected: solve error for division by zero / unsatisfied domain.
# Impact: unsafe symbolic/numeric outputs can propagate invalid numbers.
# Recommendation: add zero-denominator domain checks in solve simplification and numeric substitution.

## BH-005 | 88% | P1 | BUG
Minimal repro:
```smartpad
costs=10,20,30 to $
sum(costs where > $15)=>
```
# Expected: filtered list then aggregation (`$50`).
# Impact: documented list + aggregator composition fails in realistic workflows.
# Recommendation: ensure `where` subexpressions preserve list type when nested under aggregators.

## BH-006 | 87% | P1 | BUG
Minimal repro:
```smartpad
costs=10,20,30 to $
tax=8%
tax on sum(costs)=>
```
# Expected: percentage-on over computed scalar (`$64.8`).
# Impact: appears evaluated but is not; trust risk.
# Recommendation: prevent unresolved phrase fallthrough from rendering as successful math result.

## BH-007 | 84% | P1 | BUG
Minimal repro:
```smartpad
r=2m,4m,6m
f(x)=x*2
f(sum(r to cm))=>
```
# Expected: nested expression evaluates and binds to `x`.
# Impact: nested function composition breaks for unit/list pipelines.
# Recommendation: fix argument binding when call arg contains conversion+aggregation expression.

## BH-008 | 90% | P1 | SPEC_DIVERGENCE
Minimal repro:
```smartpad
xs=1,2,3
xs where >== 2=>
```
# Expected: syntax/operator error.
# Impact: typos silently produce plausible but potentially wrong results.
# Recommendation: either formalize permissive aliasing in spec or reject malformed comparator tokens.

## BH-009 | 93% | P1 | SPEC_DIVERGENCE
Minimal repro:
```smartpad
sum()=>
avg()=>
```
# Expected: argument/list contract error per `docs/Specs/Lists.spec.md` aggregator rules.
# Impact: hides missing-input mistakes as valid output.
# Recommendation: enforce required list argument count for aggregators.

## BH-010 | 89% | P2 | SPEC_DIVERGENCE
Minimal repro:
```smartpad
2024-02-30=>
```
# Expected: normalized date-literal error (for example `Invalid date literal`), no raw parser leak.
# Impact: inconsistent UX error surface.
# Recommendation: normalize ISO-invalid dates through the same user-facing date error channel.

## BH-011 | 82% | P2 | SPEC_DIVERGENCE
Minimal repro:
```smartpad
2026-01-01..2026-01-03 step 25h=>
```
# Expected: valid date range stepping by duration literal (compact unit token).
# Impact: valid compact duration input rejected with misleading message.
# Recommendation: accept compact duration tokens (`25h`, `30min`) in range-step parser or explicitly de-spec.

## BH-012 | 80% | P2 | SPEC_DIVERGENCE
Minimal repro:
```smartpad
2026-01-05..2026-01-01 step 1 day=>
2026-01-05..2026-01-01 step -1 day=>
```
# Expected: consistent step-direction rule for numeric/date/time ranges.
# Impact: inconsistent mental model vs numeric ranges.
# Recommendation: pick one rule and enforce/document uniformly.

## BH-013 | 78% | P3 | EMERGENT_FEATURE
Minimal repro:
```smartpad
round(PI,)=>
g(3,)=>
```
# Expected: currently unspecified.
# Impact: may improve editing ergonomics and reduce syntax friction.
# Recommendation: decide whether to officially support trailing commas in function calls; document if accepted.

## BH-014 | 75% | P3 | EMERGENT_FEATURE
Minimal repro:
```smartpad
1...5=>
```
# Expected: currently unspecified (likely typo).
# Impact: typo-tolerance can help speed, but may also hide mistakes.
# Recommendation: choose policy: lint warning, strict error, or documented tolerant parse.
