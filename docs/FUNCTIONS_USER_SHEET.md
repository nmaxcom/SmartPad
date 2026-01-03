# SmartPad Functions: What You Can Do (User Sheet)

Functions let you name a formula once and reuse it anywhere. Think of a function as a recipe: you give it inputs, it gives you a result.

## What This Unlocks
- Reusable formulas (no copy-paste mistakes).
- Cleaner documents (shorter, more readable).
- Easy “what if” changes (update one formula, all uses update).
- Unit- and currency-aware calculations inside functions.
- A foundation for future symbolic commands (simplify/solve/derive).

---

## 1) Define a Function (no `=>`)
```
area(r) = PI * r^2
```
ELI5: You are naming a recipe. You are not asking for a result yet.

## 2) Call a Function (use `=>` to see the result)
```
area(3 m) =>
```
ELI5: You give the recipe an input, and SmartPad shows the answer.

---

## 3) Default Values (optional inputs)
```
tip(bill, rate=15%) = bill * rate
tip(80) =>
```
ELI5: If you don’t provide a rate, SmartPad uses 15%.

## 4) Named Arguments (clearer calls)
```
tip(rate: 20%, bill: 60) =>
```
ELI5: You can label inputs so it’s obvious what each number means.

---

## 5) Reuse Anywhere
```
tax(amount, rate=8.5%) = amount * rate
total(amount) = amount + tax(amount)

total(1200) =>
```
ELI5: Define helpers once, use them everywhere.

---

## 6) Units and Conversions Work Inside Functions
```
speed(distance, time) = distance / time
speed(150 m, 12 s) =>
speed(1500 m, 2 min) =>
```
ELI5: Units move through the formula and give you the correct unit at the end.

## 7) Currency Stays Currency
```
with_tax(price, rate=8%) = price + price * rate
with_tax($100) =>
```
ELI5: If you start with money, the result stays money.

## 8) Percentages Work as You Expect
```
discount(price, rate=20%) = price * (1 - rate)
discount($80) =>
```
ELI5: Percent signs behave like real percentages, not just decimal numbers.

---

## 9) Live Formulas (Dynamic Context)
```
rate = 10%
tax(amount) = amount * rate

rate = 20%
tax(100) =>
```
ELI5: Functions use the current value of variables at the point you call them.
This keeps formulas “live” and responsive to changes in the document.

Note: SmartPad will show when a function depends on a global variable (e.g., `rate`)
so it’s easy to understand what affects the result.

---

## 10) Redefinition (Allowed, with a Warning)
```
fee(x) = x * 0.05
fee(100) =>

fee(x) = x * 0.07
fee(100) =>
```
ELI5: You can update a recipe later, but SmartPad will warn you that it changed.

---

## 11) Helpful Errors
Examples of errors you may see:
- `Undefined function: area`
- `Expected 2 arguments, got 1`
- `Error in tax(80): rate is not defined`

ELI5: SmartPad points to the function and the specific missing piece.

---

## 12) Docstrings (Comment Help)
```cpp
// Calculates total cost including tax
tax(amount, rate=8.5%) = amount * rate
```
ELI5: A comment right above a function becomes its hover help.

---

## Quick Mini-Template (All Together)
```
// Basic geometry
area(r) = PI * r^2

// Price math
tip(bill, rate=15%) = bill * rate
with_tip(bill) = bill + tip(bill)

// Use them
circle = area(4 m) =>
dinner = with_tip($80) =>
```

ELI5: Small, reusable recipes turn a messy sheet into a clean story.
