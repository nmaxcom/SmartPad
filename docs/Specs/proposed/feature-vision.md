# SmartPad Feature Vision and Integration Plan

The SmartPad is a text-based web application that combines the simplicity of a plain text editor with the power of real-time mathematical interpretation and calculation. It allows users to write regular notes, define variables, and perform calculations seamlessly within a single text document. It's meant to work like an advanced version of a "back-of-the-envelope calculation".

This document is a bold, user-first vision for SmartPad. It expands the next major features into a complete experience, with clear syntax proposals and rich examples. Every syntax block includes results so you can see the output shape, formatting, and units.

Everything here is a proposal. We will adjust details as we prototype.

---

## Guiding Principles
- Text-first, fast, and editable. No forced panels to compute.
- Semantic values: units, currency, dates, arrays, and tables flow through math.
- Results can be numbers or widgets (charts, tables, calendars).
- Live updates: results refresh when inputs or variables change.

---

## How to Read Syntax Blocks
- Each feature shows two blocks back-to-back:
  - **Syntax (formal)**: the initial, more technical version.
  - **Syntax (human)**: the natural, readable version.
- `=>` means "compute now".
- Results are shown as the app would render them.

---

## Calendar and Time Math
**Best version:** natural language parsing, ISO support, time zones, business days, holidays, and recurring schedules. Dates are semantic values.

### Syntax (formal)
```
launch = date("2004-06-05")
add(launch, months: 2, years: 1) => 2005-08-05

invoice = date("2024-02-01")
add(invoice, months: 1) => 2024-03-01
add(invoice, days: 30) => 2024-03-02

deadline = datetime("2024-06-05 17:00", tz: "PST")
add(deadline, hours: 2) => 2024-06-05 19:00 PST
to_timezone(deadline, "UTC") => 2024-06-06 02:00 UTC

ship = date("2024-11-25")
add_business_days(ship, 5, calendar: "US") => 2024-12-02
```

### Syntax (human)
```
launch = 5 June 2004
launch + 2 months + 1 year => 2005-08-05

invoice = 2024-02-01
invoice + 1 month => 2024-03-01
invoice + 30 days => 2024-03-02

deadline = 2024-06-05 17:00 PST
deadline + 2h => 2024-06-05 19:00 PST
deadline in UTC => 2024-06-06 02:00 UTC

ship = 2024-11-25
ship + 5 business days (US) => 2024-12-02
```

### Holidays, regions, and business days
- **Calendar profiles**: use region IDs like `US`, `US-CA`, `UK`, or custom lists.
- **Custom calendars**: define a list of holiday dates in the document.
- **Weekend rules**: allow region-specific weekends (e.g., Fri/Sat).

```
my_holidays = 2024-12-24, 2024-12-25
ship = 2024-12-20
ship + 3 business days (custom: my_holidays) => 2024-12-27
```

### Date format UX
- **Default**: use user locale for input and display.
- **Unambiguous option**: allow ISO `YYYY-MM-DD` and show both formats if enabled.
- **Per-document overrides**: allow a format line or preference.

```
set date format = ISO
2024-06-05 + 2 months => 2024-08-05

set date format = locale
06/05/2024 + 2 months => Aug 5, 2024
```

### Creative uses (with results)
```
// Plan a sprint
sprint_start = next Monday 9am
sprint_end = sprint_start + 2 weeks
sprint_end => 2024-10-21 09:00

// Event countdown
event = 2024-12-31 23:59
now to event => 92 days
```

---

## Equation Solving (Find a Variable)
**Best version:** symbolic where possible, numeric fallback, unit-aware, multi-variable systems, constraints, and natural phrasing.

### Syntax (formal)
```
solve(x, 2*x + 3 = 11) => x = 4

solve(c, f = (9/5) * c + 32, f = 98) => c = 36.7

solve([x,y], [x + y = 10, x - y = 2]) => x = 6, y = 4

solve(t, s = 0.5 * g * t^2, s = 120 m, g = 9.8 m/s^2) => t = 4.95 s
```

### Syntax (human)
```
solve x: 2x + 3 = 11 => x = 4

solve for c when f = (9/5) * c + 32 and f = 98 => c = 36.7

solve x and y where:
  x + y = 10
  x - y = 2
=> x = 6, y = 4

s = 0.5 * g * t^2
solve t when s = 120 m, g = 9.8 m/s^2 => t = 4.95 s
```

### More natural system syntax options
```
solve these:
  x + y = 10
  x - y = 2
for x, y => x = 6, y = 4
```

### Creative uses
```
// Reverse a recipe
tip = bill * 20%
solve bill when tip = $18 => bill = $90

// Solve geometry
area = PI * r^2
solve r when area = 50 m^2 => r = 3.99 m
```

---

## Arrays and Lists
**Best version:** lists can be written naturally without brackets, but bracket style remains available for power users. Arrays feed stats, tables, and charts.

### Syntax (formal)
```
values = [3, 36, 60, 12]
mean(values) => 27.75

b = range(1, 10)
sum(b) => 55

c = range(1, 10, step: 2)
sum(c) => 25

xs = linspace(0, 1, 10)
xs => 0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9
```

### Syntax (human)
```
values = 3, 36, 60, 12
mean(values) => 27.75

values =
  3
  36
  60
  12
stddev(values) => 22.4

b = 1 to 10
sum(b) => 55

c = 1 to 10 by 2
sum(c) => 25

xs = 10 points from 0 to 1
xs => 0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9
```

### Generated and mapped lists
```
// Formal
squares = map(values, x => x^2)
squares => 9, 1296, 3600, 144

// Human
squares = map values with x^2
squares => 9, 1296, 3600, 144

// Human
odds = filter 1 to 10 where x is odd
odds => 1, 3, 5, 7, 9
```

### Creative uses
```
// Grade normalization
scores = 62, 75, 81, 90, 55, 88
z = map scores with (x - mean(scores)) / stddev(scores)
z => -0.9, -0.1, 0.3, 1.1, -1.3, 0.8

// Growth curve
years = 0 to 10
growth = map years with 1000 * 1.07^y
growth => 1000, 1070, 1144.9, ...
```

---

## Tables
**Best version:** tables read like a tiny sheet but stay text-first. Columns are named, computed, and chartable.

### Syntax (formal)
```
sales = table(
  item: ["A", "B", "C"],
  qty: [10, 6, 12],
  price: [$12, $9, $15]
)

sales.total = sales.qty * sales.price
sum(sales.total) => $318
```

### Syntax (human)
```
Sales table:
  item | qty | price
  A    | 10  | $12
  B    | 6   | $9
  C    | 12  | $15

Sales table.total = Sales table.qty * Sales table.price
sum(Sales table.total) => $318
```

### Another human style (form-like)
```
Budget:
  Venue: $1400
  Food: $900
  Decor: $250
  Staff: $600

sum(Budget) => $3150
```

### Creative uses
```
Commute log:
  day | distance | time
  Mon | 18 km    | 25 min
  Tue | 22 km    | 30 min

Commute log.speed = distance / time
avg(Commute log.speed) => 0.7 km/min
```

---

## Comparisons and Logic
**Best version:** booleans, chained comparisons, membership, and readable logic.

### Syntax (formal)
```
speed = 12 m/s
speed > 10 m/s => true
speed >= 12 m/s => true

state = "CA"
state in ["CA", "NY", "TX"] => true

not (speed > 20 m/s and wet_road) => true
```

### Syntax (human)
```
speed = 12 m/s
speed is greater than 10 m/s => true
speed is at least 12 m/s => true

state = "CA"
state in "CA", "NY", "TX" => true

not (speed > 20 m/s and wet_road) => true
```

---

## Conditionals
**Best version:** readable rules with `if/then/else`, plus `case` for clean choices.

### Syntax (formal)
```
abs(v) = if (v < 0) then -v else v
abs(-4) => 4

shipping(total) = if (total > $50) then $0 else $5
shipping($42) => $5
```

### Syntax (human)
```
abs(v) =
  if v < 0 then -v
  else v

abs(-4) => 4

shipping(total) =
  if total > $50 then $0
  else $5

shipping($42) => $5
```

### Case-style
```
category(score) =
  case
    score >= 90 => "A"
    score >= 80 => "B"
    score >= 70 => "C"
    else => "D"

category(84) => "B"
```

---

## Multiline Functions
**Best version:** function bodies can be multiple lines, with local variables and a final line as the return value.

### Syntax (formal)
```
paint_cost(width, height, price_per_m2) = {
  area = width * height
  cost = area * price_per_m2
  return cost
}

paint_cost(3 m, 2.5 m, $8 per m^2) => $60
```

### Syntax (human)
```
paint_cost(width, height, price_per_m2) =
  area = width * height
  cost = area * price_per_m2
  cost

paint_cost(3 m, 2.5 m, $8 per m^2) => $60
```

---

## Statistics and Probability
**Best version:** descriptive stats, distributions, sampling, and charts.

### Syntax (formal)
```
values = [3, 36, 60, 12, 18, 27]
mean(values) => 26
median(values) => 22.5
stddev(values) => 19.4
percentile(values, 90) => 58.2

rolls = sample(range(1, 6), 1000)
hist(rolls, bins: 6) => [widget: histogram]
```

### Syntax (human)
```
values = 3, 36, 60, 12, 18, 27
mean(values) => 26
median(values) => 22.5
stddev(values) => 19.4
percentile(values, 90) => 58.2

rolls = sample 1 to 6, 1000 times
hist(rolls, bins: 6) => [widget: histogram]
```

### Creative uses
```
// Compare two samples
a = 12, 14, 15, 10, 11
b = 16, 18, 20, 19, 17
mean(a) - mean(b) => -5
```

---

## Calculus (Derivatives and Integrals)
**Best version:** symbolic where possible, numeric fallback, clean output.

### Syntax (formal)
```
f(x) = x^3 + 2x
derive(f(x)) => 3x^2 + 2

derive(f(x), x: 2) => 14

integrate(f(x), from: 0, to: 10) => 2600
```

### Syntax (human)
```
f(x) = x^3 + 2x
derive f(x) => 3x^2 + 2

derive f(x) at x=2 => 14

integrate f(x) from 0 to 10 => 2600
```

### Creative uses
```
// Velocity from position
pos(t) = 4t^2 + 3t
vel(t) = derive pos(t)
vel(5 s) => 43 m/s
```

---

## Logarithms and Exponentials
**Best version:** base awareness, readable functions, standard shorthands.

### Syntax (formal)
```
ln(100) => 4.605
log(1000, 10) => 3
log2(1024) => 10
exp(1) => 2.718
```

### Syntax (human)
```
log base 10 of 1000 => 3
natural log of 100 => 4.605
2 to the power of 10 => 1024
```

---

## Units and Dimensional Analysis
**Best version:** composite units simplify, derived units appear, and conversion is natural.

### Syntax (formal)
```
force = 10 kg * 9.8 m/s^2
force => 98 N

pressure = force / 2 m^2
pressure => 49 Pa

convert(100 kg + 30 lb, kg) => 113.6 kg
convert(60 km / 2 h, m/s) => 8.33 m/s
```

### Syntax (human)
```
force = 10 kg * 9.8 m/s^2
force => 98 N

pressure = force / 2 m^2
pressure => 49 Pa

(100 kg + 30 lb) to kg => 113.6 kg
(60 km / 2 h) to m/s => 8.33 m/s
```

Rates:
```
rate = $8 per m^2
cost = 12 m^2 * rate
cost => $96
```

---

## Financial Math
**Best version:** built-in financial functions and easy timeline math.

### Syntax (formal)
```
principal = $5000
rate = 4.5%
time = 3 years
simple_interest(principal, rate, time) => $5675
compound_interest(principal, rate, time, periods: 12) => $5714
```

### Syntax (human)
```
principal = $5000
rate = 4.5%
time = 3 years
principal * (1 + rate * time) => $5675
principal * (1 + rate/12)^(12*time) => $5714
```

Creative uses:
```
// Rent comparison
rent_now = $2200
rent_in_3y = rent_now * (1.05)^3
rent_in_3y => $2548
```

---

## Linear Algebra and Vectors
**Best version:** simple vectors and matrices for engineering work.

### Syntax (formal)
```
v = [3, 4]
norm(v) => 5

A = [[1,2],[3,4]]
det(A) => -2
```

### Syntax (human)
```
v = 3, 4
norm(v) => 5

A =
  1 2
  3 4

det(A) => -2
```

---

## Charts and Graphs (Widgets)
**Best version:** widgets appear inline and expand on demand. Live refresh with scrubbing.

### Syntax (formal)
```
plot(x: xs, y: ys) => [widget: line plot]
scatter(x: times, y: temps) => [widget: scatter]
hist(values, bins: 12) => [widget: histogram]
bar(labels: items, values: totals) => [widget: bar chart]
```

### Syntax (human)
```
plot y = sin(x), x: -6.28..6.28 => [widget: line plot]
scatter x: times, y: temps => [widget: scatter]
hist(values, bins: 12) => [widget: histogram]
bar(Sales table.item, Sales table.total) => [widget: bar chart]
```

### What the widgets look like in-line
```
scatter x: times, y: temps => [widget: scatter, 40 points, trendline]
hist(values, bins: 12) => [widget: histogram, 12 bars, mean shown]
bar(Sales table.item, Sales table.total) => [widget: bar chart, currency axis]
```

### Live behavior
- Inline mini chart appears by default.
- Click expands to a larger panel.
- Dragging a number updates the chart live.
- Chart type toggles available when data allows.

---

## Widgets Beyond Charts
Widgets are structured visual outputs tied to semantic values.

Planned widget types:
- Chart widget (line, bar, scatter, hist, box).
- Calendar widget (edit dates and ranges).
- Table widget (editable columns + formulas).
- Slider widget (bind a variable to range/step).
- Unit converter widget (quick conversions).
- Timeline widget (sequence of dates).
- Gauge widget (percentage or threshold).
- Heatmap widget (matrix values shown as color).
- KPI card widget (single value with delta and sparkline).
- Distribution widget (mean, variance, quartiles with mini plot).
- Solver steps widget (show solve path on demand).
- Geometry widget (area/volume visual hint).

Example:
```
launch = 2024-06-05
launch => [widget: calendar]
```

---

## Simulation and Monte Carlo
**Best version:** block-style simulations with clear outputs and charts.

### Syntax (formal)
```
simulate(10000) {
  tip = bill * random(0.10..0.25)
  total = bill + tip
}

mean(total) => $112.4
stddev(total) => $4.3
hist(total, bins: 20) => [widget: histogram]
```

### Syntax (human)
```
simulate 10000:
  tip = bill * random(10%..25%)
  total = bill + tip

mean(total) => $112.4
stddev(total) => $4.3
hist(total, bins: 20) => [widget: histogram]
```

Another:
```
simulate 5000:
  roll = random(1..6)
  sum = roll + random(1..6)

mean(sum) => 7.0
hist(sum, bins: 11) => [widget: histogram]
```

---

## Optimization
**Best version:** maximize/minimize with constraints, returns best value + inputs.

### Syntax (formal)
```
maximize(profit(x), x in [0, 500]) => x = 200, profit = $4000

maximize(area(w, h), 2w + 2h = 100) => w = 25, h = 25, area = 625
```

### Syntax (human)
```
profit(x) = 40x - 0.1x^2
maximize profit(x) where 0 <= x <= 500 => x = 200, profit = $4000

area(w, h) = w * h
maximize area(w, h) where 2w + 2h = 100 => w = 25, h = 25, area = 625
```

---

## Additional Bold Features (If We Go Big)
These are optional, but fit SmartPad's DNA.

### Data import
```
import "sales.csv" as sales
mean(sales.revenue) => $1842
```

### Scenarios
```
scenario "low":
  rate = 3%
  payment = pmt(rate/12, 360, -250000)
  payment => $1054

scenario "high":
  rate = 6%
  payment = pmt(rate/12, 360, -250000)
  payment => $1499
```

### Simplify and explain
```
simplify (10 m + 2 ft) * 5 => 54.48 m
explain simplify (10 m + 2 ft) * 5 => [widget: steps]
```

---

## Library Choices and Rationale
We can stay lightweight by choosing the right tool for each domain.

Math and Symbolic:
- math.js: broad numeric + symbolic support, strong expression parsing.
- nerdamer: focused symbolic solve/simplify.
- algebrite: deeper symbolic features, heavier.
Recommendation: math.js for core; add nerdamer or algebrite for advanced solve/derive.

Dates:
- Luxon: robust time zones and formatting.
- chrono: best for natural language date parsing.
- date-holidays: regional holiday calendars.
Recommendation: Luxon + chrono + date-holidays, with user-configurable calendar profiles.

Stats:
- simple-statistics: compact and reliable.
Recommendation: use simple-statistics for breadth, wrap outputs in SmartPad types.

Charts:
- uPlot: fast and tiny for inline charts.
- Chart.js: easy defaults, heavier.
- Plotly: powerful but large.
Recommendation: uPlot for inline and a minimal custom renderer for sparklines.

Units:
- unitsnet-js: already integrated and strong.
Recommendation: keep and extend its adapter.

---

## Integration Plan (High Level)
We integrate by extending the existing AST and semantic value pipeline.

1. Parsing and AST
- Extend `astParser` to detect new constructs: arrays, tables, if/then/else, solve, plot, simulate, optimize.
- Keep text-first parsing; new constructs are still just lines.

2. Semantic Types
- Add `DateValue`, `ArrayValue`, `TableValue`, `BooleanValue`, `DistributionValue`.
- Each type knows how to render itself and interact with units/currency.

3. Evaluators
- Add evaluators (date math, stats, solve, plot, simulate, optimize).
- Keep `ExpressionEvaluatorV2` as core numeric/semantic arithmetic.
- Symbolic evaluator calls math.js/nerdamer and returns SemanticValues or Widget nodes.

4. Render Nodes and Widgets
- Extend render nodes with `chart`, `table`, `calendar`, `solverResult`.
- UI renders widget nodes inline; click expands a panel.

5. Settings
- Date locale, timezone, holiday profile.
- Chart theme, default ranges, precision.

6. Testing
- Unit tests for parsing and semantic results.
- E2E tests for widget rendering + live refresh.

---

## Summary
SmartPad becomes a living math document with semantic values, powerful calculations, and live visual outputs. The syntax stays human and readable, while the capabilities expand far beyond a normal calculator.
