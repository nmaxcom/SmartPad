# SmartPad Solve (Planned)

This document is both a **developer reference** and **user documentation** for solve/unknown features.
It captures the proposed syntax, expected behavior, and UX goals. This feature is **not implemented yet**.

---

## Scope and Intent
Solve lets users declare equations and ask SmartPad to find unknowns directly in the document.
It should feel like "math in text", not a separate tool.

---

## Planned Syntax (Human)
These are the intended forms. All examples show expected results.

### Solve a Single Equation (Explicit)
```
solve x in 2x + 6 = 18 => x = 6
solve rate in total = price * (1 + rate) => rate = 0.08
solve c in f = (9/5)*c + 32 => c = 0
```

### Solve with a Variable on Both Sides
```
solve x in 3x - 4 = 2x + 10 => x = 14
```

### Solve with Units
```
solve v in distance = v * time => v = 25 m/s
solve t in 10 km = v * t, v = 2 m/s => t = 5000 s
```

### Solve with Percentages
```
solve price in total = price + price * 8% => price = 50
solve rate in total = base + base * rate => rate = 0.15
```

### Solve with Functions
```
solve r in area = PI * r^2 => r = 3.568
solve x in sqrt(x) = 7 => x = 49
```

---

## Implicit Solve (Preferred, No `solve` Keyword)
The idea is to treat a bare variable line as an implicit "solve for this."

```
distance = v * time
time = 2 s
distance = 40 m
v => 20 m/s

distance = v * time
v => distance / time
```

This allows both numeric solving (when enough data exists) and symbolic rearrangement
when it doesn’t.

---

## Planned Syntax (Formal API - Not Implemented Yet)
These mirror the explicit syntax but make the structure explicit.

```
solve("2x + 6 = 18", for: "x") => x = 6
solve("f = (9/5)*c + 32", for: "c") => c = 0
solve("distance = v * time", for: "v") => v = 25 m/s
```

---

## In-document Context
Solve should use known variables by default.

```
tax = 8%
total = 108
solve base in total = base + base * tax => base = 100
```

Users can override with explicit assumptions:
```
solve base in total = base + base * tax, tax = 5% => base = 102.86
```

---

## Symbolic Rearrangement (When Data Is Missing)
If there isn't enough information, return a **rearranged formula** instead of a number.

```
price = z * (rate + 1)
rate => price / z - 1

total = base + base * tax
tax => total / base - 1

area = PI * r^2
r => sqrt(area / PI)
```

---

## Non-linear and No-solution Cases
```
solve x in x^2 + 1 = 0 => no real solution
solve x in x = x + 1 => no solution
```

---

## Error Messaging (Planned)
- `Cannot solve: unknown variable "x"` (if no target specified)
- `Cannot solve: equation is not valid`
- `Cannot solve: no real solution`
- `Cannot solve: multiple solutions, add a constraint`

---

## UX Ideas (Non-code)
- Results for implicit solves should prefer the value only: `v => 20 m/s`
- If multiple solutions exist, show a small "±" or "2" badge next to the result.
  Clicking allows the user to choose which solution propagates.
- If assumptions were used, show them on hover.

---

## Open Decisions
- Prefer implicit `x =>` solve whenever possible.
- Real solutions only (no complex).
- Enforce unit constraints (solving for time must output time units).

### Risks With Implicit Solve
- **Ambiguity:** `v =>` could mean "read variable" or "solve for v" if equations exist.
- **Circular dependencies:** `v =>` may depend on `v` through other equations.
- **Multiple candidates:** If multiple equations define `v`, which one is used?
- **Hidden assumptions:** Implicit solving could choose a default path that surprises users.
- **Performance:** Auto-solving on every change could be expensive in large documents.
