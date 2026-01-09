lengths = 3 m, 25 ft, 48 km
lengths =>3 m, 25 ft, 48 km
sum(lengths) to ft=>48,010.62 m
sum(lengths) to km=>48,010.62 m

Sort by the actual physical magnitude, not by textual form. If units are compatible (same dimension), sorting should use their canonical value, then preserve the original unit representation in output. 5ft is shorter than 3m.
lengths = 3 m, 5 ft, 48 km
sort(lengths) =>5 m, 3 ft, 48 km

The same rule applies to any dimension where a total ordering makes sense.
times = 2 min, 30 s, 1 h
sort(times) =>30 s, 2 min, 1 h

list can't have different dimensions:
weird = 3 m, 2 h=>3 m, 2 h

should only return if there's a value (once or more) equal to $8, otherwise empty
costs = $8, $12, $15, $9, $8, $100
costs where = $8 => $8, $8

Equality should be semantic, not textual.
lengths = 1 m, 100 cm, 2 m
lengths where = 1 m =>1 m, 100 cm

You should define a tolerance rule, otherwise equality becomes unusable.
Example:
xs = 0.1 + 0.2, 0.3
xs where = 0.3 => ?
Use a small relative/absolute tolerance for numeric equality

Tolerance rules

Use a standard combined tolerance test for numeric comparisons:

a == b is true if
|a - b| <= max(absTol, relTol * max(|a|, |b|))

Recommended defaults:

absTol = 1e-12

relTol = 1e-9