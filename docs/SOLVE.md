# SmartPad Solve (Planned)

This document is both a **developer reference** and **user documentation** for solve/unknown features.
It captures the proposed syntax, expected behavior, and UX goals. This feature is **not implemented yet**.

---

## Scope and Intent
Solve lets users declare equations and ask SmartPad to find unknowns directly in the document.
It should feel like "math in text", not a separate tool.

---

## Implicit Solve (Natural)
The idea is to treat a bare variable line as "give me the most concrete, specific value of this."

```
distance = v * time
time = 2 s
distance = 40 m
v => 20 m/s

distance = v * time
v => distance / time
```

If a concrete numeric value exists, return it.
If not, return a symbolic rearrangement of the best available equation.

---

## Explicit Solve (Pro Layer)
The `solve` keyword is an explicit layer for power users where constraints, limits, and
future options can live without overloading the natural syntax.

```
solve v in distance = v * time => distance / time
solve v in distance = v * time, time = 2 s => 20 m/s
solve r in area = PI * r^2 => sqrt(area / PI)
```

### Constraints and Domains (Planned)
```
solve x in x^2 = 9 where x > 0 => 3
solve r in area = PI * r^2 where r > 0 => 3.568
```

---

## In-document Context
Implicit and explicit solve both use known variables by default.

```
total = base + base * tax
tax = 8%
total = 108
base => 100
```

Users can override with explicit assumptions:
```
total = base + base * tax
tax = 5%
base => 102.86
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
x^2 + 1 = 0
x => no real solution

x = x + 1
x => no solution
```

---

## Error Messaging (Planned)
- `Cannot solve: no equation found for "x"`
- `Cannot solve: equation is not valid`
- `Cannot solve: no real solution`
- `Cannot solve: multiple solutions, add a constraint`

---

## UX Ideas (Non-code)
- Results for implicit solves should prefer the value only: `v => 20 m/s`
- Explicit solve should return the solution directly (value or expression), not `v = ...`.

---

## Decisions
- Prefer implicit `x =>` solve whenever possible.
- Real solutions only (no complex).
- Do not enforce unit constraints; allow unit algebra to carry through.

### Risks With Implicit Solve
Below are the major pitfalls with implicit solve, with examples and proposed safeguards.

#### 1) Ambiguity: read vs solve
**Problem:** `v =>` might mean "show the current value of v" or "derive v from equations."
If both are possible, users may get a surprising symbolic formula when they expected a number.

Example:
```
v = 5 m/s
distance = v * time
v =>
```
Should it return `5 m/s` or attempt to derive `v` from the equation?

**Decision:** If a concrete value for `v` exists, return it.
Only fall back to symbolic solving when no concrete value is available.
This keeps `x =>` feeling like "what is x right now?" first.

---

#### 2) Circular dependencies
**Problem:** Solving for `v` might depend on `v` through another equation.
This happens easily when users define related formulas in multiple ways.

Example:
```
v = distance / time
distance = v * time
v =>
```
Both equations reference `v`, creating a loop. A naive solver could recurse forever.

**Decision:** Build a dependency graph and detect cycles. If any cycle is found,
return a clear error: `Cannot solve: circular dependency (v -> distance -> v)`.

**What "cycle path" means:** list the chain of variables that loops, so the user
can see exactly which equations are involved.

---

#### 3) Multiple candidate equations
**Problem:** If multiple equations define the same variable, which one should be used?
Picking the "wrong" one can feel random and break the story of the document.

Example:
```
v = distance / time
v = 2 * radius * rpm / 60
v =>
```
These are both valid definitions of `v`, but may produce different results.

**Decision:** Use document order: pick the closest equation **above** the `v =>` line.
This keeps the meaning local to the user's current line.

---

#### 4) Hidden assumptions and substitutions
**Problem:** Implicit solving can substitute values without the user noticing.
The result might look "definitive" even if it depends on a value far above.

Example:
```
distance = v * time
time = 2 s
v =>
```
Result should be numeric because there is enough data.

**Decision:** Prefer numeric output when enough data exists.
If not, return a symbolic rearrangement.
Explicit `solve` can also return a numeric value when fully determined.

---

#### 5) Dimensional / unit mismatch
**Problem:** Solving may produce results that look "weird" because units are mixed.
Users can name variables anything, so enforcing constraints can block valid intent.

Example:
```
force = mass * acceleration
mass = $200
acceleration = 3 m/s^2
force =>
```
This produces a composite unit.

**Decision:** Allow the algebra and carry units through: `$200 * 3 m/s^2 => $*m/s^2`.
No unit constraints are enforced at solve time.

---

#### 6) Under-determined equations
**Problem:** Some equations cannot be solved to a single value, only to a rearranged form.
Users should see a meaningful formula, not a vague error.

Example:
```
price = z * (rate + 1)
rate =>
```
Without values for `price` or `z`, return a symbolic rearrangement.

**Decision:** Return the rearranged formula: `rate = price / z - 1`.

---

#### 7) Performance in large documents
**Problem:** Solving for many variables on every keystroke could be expensive.
Slowdowns would make SmartPad feel sluggish or "laggy."

Example:
```
// 200+ lines of equations and variables
```

**Decision:** Cache solutions and only re-solve when dependencies change.
