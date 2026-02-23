# Temporary Edge Exploration Report

- Generated at: 2026-02-23T22:12:58.889Z
- Total cases: 50
- Passed: 50
- Failed: 0

## Failing Cases

- None
## Failing Case TODO Coverage

- No failing cases.
## All Cases

| # | Case | Input | Status | TODO | Output |
|---|---|---|---|---|---|
| 1 | Constant multiplication without spaces | `23*PI=>` | PASS |  | 72.256631 |
| 2 | Constant multiplication reversed order | `PI*23=>` | PASS |  | 72.256631 |
| 3 | Implicit multiplication number-parentheses | `2(3+4)=>` | PASS |  | 14 |
| 4 | Implicit multiplication between grouped expressions | `(2+3)(4+5)=>` | PASS |  | 45 |
| 5 | Unary minus with exponent precedence | `-2^2=>` | PASS |  | 4 |
| 6 | Parenthesized negative base exponent | `(-2)^2=>` | PASS |  | 4 |
| 7 | Function call without parentheses style | `abs -4=>` | PASS |  | abs - 4 |
| 8 | PI rounding helper | `round(PI,2)=>` | PASS |  | 3.14 |
| 9 | Max helper without function parentheses (unsupported syntax) | `max 3,7=>` | PASS |  | max 3,7=> ⚠️ Cannot create list: incompatible units |
| 10 | Chained function and decimal | `sqrt(16)+2.5=>` | PASS |  | 6.5 |
| 11 | Phrase percentage with spaced variable name | `discount off base price =>` | PASS |  | $102.425 |
| 12 | Tax on phrase-result variable | `tax on final price =>` | PASS |  | $110.619 |
| 13 | As-percent without spaces | `20/80 as %=>` | PASS |  | 25% |
| 14 | Part-of-base is percent compact form | `20 of 80 is %=>` | PASS |  | 25% |
| 15 | Percent of unit value no spaces around of | `10% of 155N=>` | PASS |  | 15.5 N |
| 16 | Percent on scalar | `5% on 100=>` | PASS |  | 105 |
| 17 | Percent off scalar | `5% off 100=>` | PASS |  | 95 |
| 18 | Variable ratio as percent compact | `numerator/denominator as %=>` | PASS |  | 25% |
| 19 | Add percentage shorthand | `80+20%=>` | PASS |  | 96 |
| 20 | Sequential percentage subtraction | `500-10%-5%=>` | PASS |  | 427.5 |
| 21 | Unit arithmetic no spaces | `2km+300m=>` | PASS |  | 2.3 km |
| 22 | Mixed imperial-metric add | `1ft+1m=>` | PASS |  | 1.3048 m |
| 23 | Rate multiplied by duration compact | `9L/min*18min=>` | PASS |  | 162 L |
| 24 | Speed conversion mph to m/s | `60mph to m/s=>` | PASS |  | 26.8224 m/s |
| 25 | Data throughput conversion | `24Mbit/s to MB/s=>` | PASS |  | 3 MB/s |
| 26 | Squared unit conversion | `100 cm^2 to m^2=>` | PASS |  | 0.01 m^2 |
| 27 | Exponent suffix form | `4^2m=>` | PASS |  | 16 m |
| 28 | Derived unit conversion to N | `1kg*m/s^2 to N=>` | PASS |  | 1 N |
| 29 | RPM to Hz conversion | `1200rpm to Hz=>` | PASS |  | 20 Hz |
| 30 | US gallon to liter conversion compact | `2gal to L=>` | PASS |  | 7.570824 L |
| 31 | Date month carry no spaces | `2024-01-31+1 month=>` | PASS |  | 2024-02-29 |
| 32 | Date plus exact days no spaces | `2024-01-31+30 days=>` | PASS |  | 2024-03-01 |
| 33 | Business-day addition compact | `2024-11-25+5 business days=>` | PASS |  | 2024-12-02 |
| 34 | Business-day subtraction compact | `2024-12-02-1 business day=>` | PASS |  | 2024-11-29 |
| 35 | Time plus duration compact | `19:30+5h20min3s=>` | PASS |  | 00:50:03 (+1 day) |
| 36 | Time minus duration compact | `00:10-45min=>` | PASS |  | 23:25 (-1 day) |
| 37 | Today keyword compact spacing | `today+10 days=>` | PASS |  | 2026-03-05 |
| 38 | Relative weekday lowercase | `next monday+2 weeks=>` | PASS |  | 2026-03-16 |
| 39 | Date range explicit duration step | `2026-01-01..2026-01-05 step 1 day=>` | PASS |  | 2026-01-01, 2026-01-02, 2026-01-03, 2026-01-04, 2026-01-05 |
| 40 | Time range explicit duration step | `09:00..11:00 step 30 min=>` | PASS | T-2026-02-23-24 | 09:00, 09:30, 10:00, 10:30, 11:00 |
| 41 | List sum with compact assignment | `sum(costs)=>` | PASS |  | $36 |
| 42 | Average with direct list args | `avg($12,$15,$9)=>` | PASS |  | $12 |
| 43 | Total over mixed-distance list | `total(lengths)=>` | PASS |  | 48.028 km |
| 44 | Where filter over currency list | `costs where > $10=>` | PASS |  | $12, $15 |
| 45 | Typing order variable dependency | `x=>` | PASS | T-2026-02-23-25 | 6 |
| 46 | Typing order with deferred formula | `total=>` | PASS |  | 12 |
| 47 | Explicit solve with inline knowns | `solve v in distance = v * time =>` | PASS |  | 20 m/s |
| 48 | Store and convert unit result | `result to km=>` | PASS |  | 2.3 km |
| 49 | Locale-style date slash input | `06/05/2024=>` | PASS | T-2026-02-23-26 | 2024-06-05 |
| 50 | Thousands separator in assignment value | `b=2,000=>` | PASS | T-2026-02-23-27 | b = 2,000 => ⚠️ Thousands separators in input are not supported; use plain digits (e.g., 2000). |
