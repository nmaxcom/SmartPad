# Temporary Edge Exploration Report

- Generated at: 2026-02-23T04:44:51.074Z
- Total cases: 50
- Passed: 43
- Failed: 7

## Failing Cases

### Case 3: Implicit multiplication number-parentheses
- Setup: (none)
- Input: `2(3+4)=>`
- Reason: Invalid expression
- Output: 2(3+4)=> ⚠️ Invalid expression

### Case 4: Implicit multiplication between grouped expressions
- Setup: (none)
- Input: `(2+3)(4+5)=>`
- Reason: Invalid expression
- Output: (2+3)(4+5)=> ⚠️ Invalid expression

### Case 9: Max helper without function parentheses
- Setup: (none)
- Input: `max 3,7=>`
- Reason: Cannot create list: incompatible units
- Output: max 3,7=> ⚠️ Cannot create list: incompatible units

### Case 23: Rate multiplied by duration compact
- Setup: (none)
- Input: `9L/min*18min=>`
- Reason: Unexpected token: /
- Output: 9L/min*18min => ⚠️ Unexpected token: /

### Case 40: Time range explicit duration step
- Setup: (none)
- Input: `09:00..11:00 step 30 min=>`
- Reason: range endpoints must be integers (got 09:00)
- Output: 09:00..11:00 step 30 min => ⚠️ range endpoints must be integers (got 09:00)

### Case 45: Typing order variable dependency
- Setup: x = 2*y | y=3
- Input: `x=>`
- Reason: unexpected output: x => 2 years
- Output: x => 2 years

### Case 49: Locale-style date slash input
- Setup: (none)
- Input: `06/05/2024=>`
- Reason: Unsupported date format "06/05/2024". Use ISO "YYYY-MM-DD".
- Output: 06/05/2024 => ⚠️ Unsupported date format "06/05/2024". Use ISO "YYYY-MM-DD".

## All Cases

| # | Case | Input | Status | Output |
|---|---|---|---|---|
| 1 | Constant multiplication without spaces | `23*PI=>` | PASS | 23*PI => 72.256631 |
| 2 | Constant multiplication reversed order | `PI*23=>` | PASS | PI*23 => 72.256631 |
| 3 | Implicit multiplication number-parentheses | `2(3+4)=>` | FAIL | 2(3+4)=> ⚠️ Invalid expression |
| 4 | Implicit multiplication between grouped expressions | `(2+3)(4+5)=>` | FAIL | (2+3)(4+5)=> ⚠️ Invalid expression |
| 5 | Unary minus with exponent precedence | `-2^2=>` | PASS | -2^2 => 4 |
| 6 | Parenthesized negative base exponent | `(-2)^2=>` | PASS | (-2)^2 => 4 |
| 7 | Function call without parentheses style | `abs -4=>` | PASS | abs -4 => abs - 4 |
| 8 | PI rounding helper | `round(PI,2)=>` | PASS | round(PI,2) => 3.14 |
| 9 | Max helper without function parentheses | `max 3,7=>` | FAIL | max 3,7=> ⚠️ Cannot create list: incompatible units |
| 10 | Chained function and decimal | `sqrt(16)+2.5=>` | PASS | sqrt(16)+2.5 => 6.5 |
| 11 | Phrase percentage with spaced variable name | `discount off base price =>` | PASS | discount off base price => $102.425 |
| 12 | Tax on phrase-result variable | `tax on final price =>` | PASS | tax on final price => $110.619 |
| 13 | As-percent without spaces | `20/80 as %=>` | PASS | 20/80 as % => 25% |
| 14 | Part-of-base is percent compact form | `20 of 80 is %=>` | PASS | 20 of 80 is % => 25% |
| 15 | Percent of unit value no spaces around of | `10% of 155N=>` | PASS | 10% of 155N => 15.5 N |
| 16 | Percent on scalar | `5% on 100=>` | PASS | 5% on 100 => 105 |
| 17 | Percent off scalar | `5% off 100=>` | PASS | 5% off 100 => 95 |
| 18 | Variable ratio as percent compact | `numerator/denominator as %=>` | PASS | numerator/denominator as % => 25% |
| 19 | Add percentage shorthand | `80+20%=>` | PASS | 80+20% => 96 |
| 20 | Sequential percentage subtraction | `500-10%-5%=>` | PASS | 500-10%-5% => 427.5 |
| 21 | Unit arithmetic no spaces | `2km+300m=>` | PASS | 2km+300m => 2.3 km |
| 22 | Mixed imperial-metric add | `1ft+1m=>` | PASS | 1ft+1m => 1.3048 m |
| 23 | Rate multiplied by duration compact | `9L/min*18min=>` | FAIL | 9L/min*18min => ⚠️ Unexpected token: / |
| 24 | Speed conversion mph to m/s | `60mph to m/s=>` | PASS | 60mph to m/s => 26.8224 m/s |
| 25 | Data throughput conversion | `24Mbit/s to MB/s=>` | PASS | 24Mbit/s to MB/s => 3 MB/s |
| 26 | Squared unit conversion | `100 cm^2 to m^2=>` | PASS | 100 cm^2 to m^2 => 0.01 m^2 |
| 27 | Exponent suffix form | `4^2m=>` | PASS | 4^2m => 16 m |
| 28 | Derived unit conversion to N | `1kg*m/s^2 to N=>` | PASS | 1kg*m/s^2 to N => 1 N |
| 29 | RPM to Hz conversion | `1200rpm to Hz=>` | PASS | 1200rpm to Hz => 20 Hz |
| 30 | US gallon to liter conversion compact | `2gal to L=>` | PASS | 2gal to L => 7.570824 L |
| 31 | Date month carry no spaces | `2024-01-31+1 month=>` | PASS | 2024-01-31+1 month => 2024-02-29 |
| 32 | Date plus exact days no spaces | `2024-01-31+30 days=>` | PASS | 2024-01-31+30 days => 2024-03-01 |
| 33 | Business-day addition compact | `2024-11-25+5 business days=>` | PASS | 2024-11-25+5 business days => 2024-12-02 |
| 34 | Business-day subtraction compact | `2024-12-02-1 business day=>` | PASS | 2024-12-02-1 business day => 2024-11-29 |
| 35 | Time plus duration compact | `19:30+5h20min3s=>` | PASS | 19:30+5h20min3s => 00:50:03 (+1 day) |
| 36 | Time minus duration compact | `00:10-45min=>` | PASS | 00:10-45min => 23:25 (-1 day) |
| 37 | Today keyword compact spacing | `today+10 days=>` | PASS | today+10 days => 2026-03-05 |
| 38 | Relative weekday lowercase | `next monday+2 weeks=>` | PASS | next monday+2 weeks => 2026-03-16 |
| 39 | Date range explicit duration step | `2026-01-01..2026-01-05 step 1 day=>` | PASS | 2026-01-01..2026-01-05 step 1 day => 2026-01-01, 2026-01-02, 2026-01-03, 2026-01-04, 2026-01-05 |
| 40 | Time range explicit duration step | `09:00..11:00 step 30 min=>` | FAIL | 09:00..11:00 step 30 min => ⚠️ range endpoints must be integers (got 09:00) |
| 41 | List sum with compact assignment | `sum(costs)=>` | PASS | sum(costs) => $36 |
| 42 | Average with direct list args | `avg($12,$15,$9)=>` | PASS | avg($12,$15,$9) => $12 |
| 43 | Total over mixed-distance list | `total(lengths)=>` | PASS | total(lengths) => 48.028 km |
| 44 | Where filter over currency list | `costs where > $10=>` | PASS | costs where > $10 => $12, $15 |
| 45 | Typing order variable dependency | `x=>` | FAIL | x => 2 years |
| 46 | Typing order with deferred formula | `total=>` | PASS | total => 12 |
| 47 | Explicit solve with inline knowns | `solve v in distance = v * time =>` | PASS | solve v in distance = v * time => 20 m/s |
| 48 | Store and convert unit result | `result to km=>` | PASS | result to km => 2.3 km |
| 49 | Locale-style date slash input | `06/05/2024=>` | FAIL | 06/05/2024 => ⚠️ Unsupported date format "06/05/2024". Use ISO "YYYY-MM-DD". |
| 50 | Thousands separator in assignment value | `b=2,000=>` | PASS | b = 2,000 => 2, 0 |
