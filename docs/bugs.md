Bugs
#####
Fixed and covered by tests:

- Currency formatting now respects scientific thresholds (currency values can switch to scientific notation when the upper limit is low).
- Large numbers render in standard notation when the upper threshold is high, even for values >= 1e21.
- Currency-per-duration multiplication now returns a currency result for expressions like `$20/h * time`.
