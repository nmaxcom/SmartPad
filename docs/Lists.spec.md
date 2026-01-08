# Lists in Smartpad — single comprehensive document (markdown)

## Overview: what a “list” is and why it matters

A **list** is a single value that contains **many values** of the same semantic kind (numbers, currency amounts, lengths, durations, etc.). Lists let users do in one line what they’d otherwise do with:

* repetitive calculator usage,
* copy/paste into spreadsheets,
* or mental math errors.

Smartpad lists should feel like: **“do the same reasoning, but plural.”**

### Core principles

1. **Element-wise arithmetic by default**
   If one side is a list and the other is a scalar, apply the operation to each element.
2. **Aggregations reduce lists to scalars**
   `sum`, `mean`, `min`, etc.
3. **Unit safety**
   Operations must respect unit compatibility (or explain the error).
4. **Predictable formatting**
   Lists display as comma-separated values, preserving units/currency.

---

## What counts as a list

A value is a **list** only when it is constructed as a list literal (comma-separated values) or returned by a list-producing operation (e.g., slicing, filtering, sorting, element-wise arithmetic, etc.). A plain variable assignment preserves the original type.

A list-producing operation always returns a list, even if the resulting list has one element.
A scalar expression never becomes a list by assignment or by value alone.

So yes:

```text
xs = 10, 20, 30
ys = xs[2..2]
ys =>20
count(ys) => 1
```

ys is a list, even though it has one element.

But:

```text
x = 20
count(x) => ⚠️ Expected list
```

x is not a list.

## Limits

Create a setting option with the maximum allowed of members in a list. Do not allow the creation of lists bigger than that.  Error with: ⚠️ Can't create lists longer than [list max size]

### Tests

```text
one = $12
one => $12

single = one
single => $12

count(single) => ⚠️ count() expects a list, got a currency value
sum(single) => ⚠️ sum() expects a list, got a currency value
stddev(single) => ⚠️ sum() expects a list, got a currency value
```

---

## Creating lists

### What it’s useful for

* Finance: multiple expenses/incomes, allocations, category totals
* Science/engineering: repeated measurements, sensor samples
* Fitness: sets/reps/weights series
* Cooking: ingredient scaling across servings

### Syntax & test examples

#### Literal list of currency

```text
costs = $12, $15, $9
costs => $12, $15, $9
```

#### Literal list with units

```text
lengths = 3 m, 25 ft, 48 km
lengths => 3 m, 25 ft, 48 km
```

#### List of percentages

```text
rates = 5%, 8%, 21%
rates => 5%, 8%, 21%
```

#### List values can be expressions

```text
a = 10
b = 20
vals = a/2, b/4, (a+b)/10
vals => 5, 5, 3
```

#### List values can be variables (must be defined)

```text
rent = $1250
utilities = $185
internet = $75
expenses = rent, utilities, internet
expenses => $1250, $185, $75
```

## Display, formatting, and ambiguity rules

### What it’s useful for

If users don’t trust what a list “is”, they won’t use it. These rules prevent confusion.

### Rules & examples

#### A list prints as comma-separated values

```text
xs = 1, 2, 3
xs => 1, 2, 3
```

#### Ambiguity: “comma means list” vs “thousands separator”

To guard from separator `$1,250` formatting confusion, the user can't input comma as a thousand separator, these can only appear in the results.

**Recommended rule (simple and testable):**

* A list separator is **comma**, regardless of spaces or lack thereof: `","`

Examples:

```text
rent = $1,250
rent => ⚠️ Cannot create list: incompatible units
```

```text
xs = 1,250
xs => 1,250
```

```text
xs = 1, 250
xs => 1, 250
```

#### Unit consistency in display

```text
lengths = 3 m, 25 m, 48 km
lengths => 3 m, 25 m, 48 km
```

No auto-conversion just for printing (only convert on `to`).

---

## Aggregations (reduce list → scalar)

### What it’s useful for

* Finance: totals, average spend, largest expense
* Science: compute mean/stddev of measurements
* Ops: max latency, median response time

### Syntax & test examples

#### sum

```text
costs = $12, $15, $9
sum(costs) => $36
```

#### count

```text
costs = $12, $15, $9
count(costs) => 3
```

#### mean = avg

```text
costs = $12, $15, $9
mean(costs) => $12
avg(costs) => $12
```

#### min, max

```text
costs = $12, $15, $9
min(costs) => $9
max(costs) => $15
```

#### median (odd/even length edge cases)

```text
xs = 1, 3, 10
median(xs) => 3
```

```text
ys = 1, 3, 10, 11
median(ys) => 6.5
```

#### range = max - min

```text
costs = $12, $15, $9
range(costs) => $6
```

#### stddev (population)

Example assumes **population** stddev:

```text
xs = 2, 4, 4, 4, 5, 5, 7, 9
stddev(xs) => 2
```

#### sum, mean on unit lists

```text
lengths = 3 m, 25 m, 48 km
sum(lengths) => 48.028 km
mean(lengths) => 16.0093 km
```

---

## Indexing and slicing

### What it’s useful for

* Finance: “show the biggest item”, “take first 3 months”
* Science: inspect outliers, take windowed segments
* Debugging: check one element after transformations

### Syntax & test examples

#### Index access (1-based)

```text
costs = $12, $15, $9
costs[1] => $12
costs[2] => $15
costs[3] => $9

costs[0] => ⚠️ Indexing starts at 1
costs[4] => ⚠️ Index out of range (size 3)
costs[-1] => $9
costs[-2] => $15
```

#### Out-of-range index (edge case)

```text
costs = $12, $15, $9
costs[3] => ⚠️ Index out of range (size 3)
```

#### Negative indices


```text
costs = $12, $15, $9
costs[-1] => $9
costs[-2] => $15
```

#### Slicing (1-based, inclusive)

This spec uses **inclusive..inclusive**:

```text
costs = $12, $15, $9, $20
costs[1..2] => $12, $15
costs[2..3] => $15, $9
costs[3..3] => $9

```

#### Slice edge cases

```text
costs = $12, $15, $9, $20
costs[1..10] => $12, $15, $9, $20
```

```text
costs = $12, $15, $9, $20
costs[2..1] => ⚠️ Range can't go downwards
```

---

## Sorting and ordering

### What it’s useful for

* Finance: rank expenses
* Science: see distribution order, compute median manually
* Planning: sort durations, priorities

### Syntax & test examples

#### Ascending sort

```text
costs = $12, $15, $9
sort(costs) => $9, $12, $15
```

#### Descending sort

```text
costs = $12, $15, $9
sort(costs, desc) => $15, $12, $9
```

#### Finance: “top expense”
expenses = $1250, $185, $75
sort(expenses, desc)[1] => $1250

#### Sorting unit lists (by canonical magnitude)

```text
lengths = 3 m, 25 m, 48 km
sort(lengths) => 3 m, 25 m, 48 km
```

#### Sorting mixed incompatible units (edge case)

```text
weird = 3 m, 2 s
sort(weird) => ⚠️ Cannot sort: incompatible units
```

---

## Filtering

### What it’s useful for

* Finance: “expenses over $100”
* Science: “measurements above threshold”
* Fitness: “sets heavier than 80 kg”

### Syntax & test examples

#### Filter by scalar condition

```text
costs = $12, $15, $9, $100
costs where > $10 => $12, $15, $100
```

#### Filter by unit-aware threshold

```text
lengths = 3 m, 25 m, 48 km
lengths where > 10 km => 48 km
```

#### Filter result empty (edge case)

```text
costs = $12, $15, $9, $100
costs where > $200 => ()
```

#### Ambiguity: comparing incompatible units

```text
vals = 3 m, 2 s
vals where > 1 m => ⚠️ Cannot compare: incompatible units
```

---

## Mapping (element-wise transforms)

### What it’s useful for

This is the big one: “apply a rule to each item”.

* Finance: apply tax/discount to each line item
* Science: convert units, calibrate measurements
* Planning: convert durations, normalize values
* Data sanity: clamp, round, abs element-wise

### Syntax & test examples

#### Scalar op

```text
costs = $12, $15, $9
costs * 2 => $24, $30, $18
```

#### Element-wise function

```text
xs = -1, 4, -9
abs(xs) => 1, 4, 9
```

#### Unit conversion over list

```text
lengths = 3 m, 25 m, 48 km
lengths to m => 3 m, 25 m, 48000 m
```

#### Percent distribution (extremely useful)

```text
rent = $1250
utilities = $185
internet = $75
expenses = rent, utilities, internet
total = sum(expenses) => $1510
distribution = expenses / total as % => 82.7815%, 12.2517%, 4.9669%
```

#### Apply “tax on” to each item

```text
items = $10, $20, $30
tax = 8%
with tax = tax on items => $10.8, $21.6, $32.4
```

#### Apply “discount off” to each item

```text
prices = $120, $80, $50
discount = 15%
final = discount off prices => $102, $68, $42.5
```

---

## Pairwise operations (zip behavior)

### What it’s useful for

* Finance: price list × quantity list
* Science: force list × distance list → energy list
* Work: hours list × rate list → pay list

### Spec decision (important)

Define behavior when both operands are lists:

* **Same length**: element-wise zip
* **Different length**: error

### Syntax & test examples

#### Zip multiply

```text
prices = $10, $20, $30
qty = 2, 1, 3
line totals = prices * qty => $20, $20, $90
sum(line totals) => $130
```

#### Zip add

```text
a = 1, 2, 3
b = 10, 20, 30
a + b => 11, 22, 33
```

#### Length mismatch (edge case)

```text
a = 1, 2, 3
b = 10, 20
a + b => ⚠️ Cannot work with lists of different lengths (3 vs 2)
```

#### Broadcast scalar into list (allowed)

```text
a = 1, 2, 3
a + 10 => 11, 12, 13
```

---

## Robustness & error messaging (must-have edge cases)

### Incompatible units in aggregation

```text
mix = 3 m, 2 s
sum(mix) => ⚠️ Cannot sum incompatible units
```

### Incompatible currencies (This will fail until we support currency conversions)

Either force FX conversion or error.

```text
mix money = $10, €10
sum(mix money) => ⚠️ Cannot sum different currencies ($ vs €)
```

### Trailing comma 

Ignore trailing commas

```text
xs = 1, 2, 3,
xs => 1, 2, 3
```

---

## A few “user-centric mini-recipes” (so lists feel obviously useful)

### Finance: “what are my biggest expenses?”

```text
rent = $1250
utilities = $185
internet = $75
subscriptions = $49.99
expenses = rent, utilities, internet, subscriptions
sort(expenses, desc) => $1250, $185, $75, $49.99
max(expenses) => $1250
```

### Finance: “what % of my spending is rent vs others?”

```text
rent = $1250
utilities = $185
internet = $75
subscriptions = $49.99
expenses = rent, utilities, internet, subscriptions
total = sum(expenses) => $1559.99
expenses / total as % => 80.1295%, 11.8597%, 4.8079%, 3.2028%
```

### Science: “average + spread of repeated measurements”

```text
measurements = 9.8 m/s^2, 9.7 m/s^2, 9.81 m/s^2, 9.79 m/s^2
mean(measurements) => 9.775 m/s^2
stddev(measurements) => 0.0430 m/s^2
```

### Fitness: “total volume per set”

```text
weights = 80 kg, 85 kg, 90 kg
reps = 5, 5, 3
volume = weights * reps => 400 kg, 425 kg, 270 kg
sum(volume) => 1095 kg
```
