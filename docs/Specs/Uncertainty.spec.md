# SmartPad Uncertainty Spec

Status: implemented

Implemented in: `1.0.0-rc.16`

This spec defines deterministic uncertainty intervals that stay editable, typed, live, and visible in the normal sheet.

## 1. Design contract

1. A user writes `centre ± tolerance`; there is no separate uncertainty panel.
2. Both numeric literals use the existing horizontal scrubber and edit the source text.
3. Dependent calculations show their centre and propagated possible interval.
4. Plots draw a subtle envelope around an uncertain series.
5. The interval is deterministic possibility, not a probability distribution or confidence level.

## 2. Syntax and supported values

One top-level `±` is accepted as a complete assignment or result expression:

```smartpad
demand = 1000 ± 120
conversion = 3% ± 0.5%
distance = 10 km ± 1 km
budget = 5000 EUR ± 400 EUR
```

The centre and tolerance must have compatible semantic types and the tolerance must be finite and non-negative. Supported underlying values are numbers, percentages, currencies, physical units, currency-unit rates, and durations. A mismatched currency or physical dimension returns a visible source error.

In this version, `±` is a whole-expression constructor. Put an uncertain value in a named variable before using it inside another expression or model call; nested literals such as `2 * (100 ± 10)` are not accepted yet.

## 3. Propagation

SmartPad propagates lower and upper bounds through addition, subtraction, multiplication, division, and scalar powers using conservative interval arithmetic. Exact values participate as zero-width intervals.

```smartpad
visits = 10000 ± 2000
conversion = 3% ± 0.5%
price = 49 EUR
revenue = visits * conversion * price =>
# 14700 EUR [9800 EUR – 20580 EUR]
```

Division rejects a denominator interval that contains zero. `sqrt`, `abs`, `round`, `floor`, `ceil`, `log`, `log10`, `ln`, and `exp` propagate bounds when their domain is safe. Functions for which endpoint mapping is not safe, including trigonometric functions in this version, return an explicit unsupported message rather than a misleading interval.

`sum` and `mean` preserve uncertainty through the ordinary semantic arithmetic path. Selection statistics deliberately do not offer insertion for selected `±` source values until nested uncertainty literals are supported.

## 4. Plots

Line plots retain centre, lower, and upper values for every sample. When at least two bounded samples exist, the series renders a translucent band behind the centre line. Bounds participate in automatic Y-domain calculation.

If the uncertain value itself is the X variable, each plotted X sample is treated as an exact explored value; uncertainty from the remaining inputs still forms the Y envelope. The current result at the source line continues to include the complete current interval.

## 5. Deliberate limits

- Bounds are conservative. Correlation is not tracked, so repeating the same uncertain input can overestimate the range; for example, interval arithmetic does not assume `x - x` is exactly zero.
- No normal, triangular, sampled, or custom probability distributions are implied.
- No covariance, confidence level, Monte Carlo sampling, or statistical inference is performed.
- Modulo and unsafe/non-monotonic built-ins do not accept uncertainty yet.

These limits keep the answer explainable and prevent decorative precision from being mistaken for evidence.

## 6. Acceptance gate

The feature requires typed propagation tests, error/domain tests, plot-envelope verification, a real-browser scrub flow, documentation/spec-trust checks, and a production build.
