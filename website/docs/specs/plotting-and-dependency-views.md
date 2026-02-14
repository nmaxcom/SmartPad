---
title: "Plotting and Dependency Views"
description: "Specifies exploratory plotting, detached views, and dependency-driven visualization flows."
---

> Source: `docs/Specs/Plotting.spec.md`

## At a glance

Specifies exploratory plotting, detached views, and dependency-driven visualization flows.

## Quick examples

### Happy path
```smartpad
a + b => 20%
```

## What this covers

- 0. Purpose
- 1. Core Philosophy & Non-Negotiables
- 2. Mental Model
- 3. High-Level UX Flow
- 4. Persistent Views (Detached Views)
- 5. Mini-Grammar for `@view`
- 6. Binding Rules
- 7. View Lifecycle States
- 8. Domain Inference Rules
- 9. Pan & Zoom

## Full specification

<details>
<summary>Open full spec: Smartpad — Interactive Dependency Views (Plotting & Exploration)</summary>

Alright. Below is a **complete, self-contained specification** for the feature, written as if it were the **only document an engineer/designer will ever see**.
It includes philosophy, UX, syntax, states, rules, edge cases, and implementation notes.
No open questions, no “ask later”. This is *the* source of truth.

---

# Smartpad — Interactive Dependency Views (Plotting & Exploration)

## 0. Purpose

This feature enables **direct, playful exploration of quantitative relationships** inside Smartpad documents.

It allows users to:

* Visually explore how a computed result depends on its inputs
* Scrub existing variables and see immediate visual feedback
* Persist exploratory visualizations as **detached views** in the document
* Recover gracefully from document edits, errors, and re-wiring

This is **not a charting feature**.
It is a **relationship inspection system** designed to preserve Smartpad’s core philosophy:

> *Write how you think. Explore without friction. Commit insight only when useful.*

---

## 1. Core Philosophy & Non-Negotiables

### 1.1 Results are first-class, even if unnamed

Any computed result (including inline results after `=>`) is a valid exploration target.

```smartpad
a + b => 20%
```

This result is:

* clickable
* explorable
* attachable to a persistent view

There is **no requirement** to assign results to variables.

---

### 1.2 Everything after `=>` is flowy and brittle — and that’s OK

Smartpad embraces impermanence.

Plots and views:

* must tolerate breakage
* must never silently disappear
* must offer explicit recovery paths

Brittleness is not a bug — **losing user intent is**.

---

### 1.3 Text is the source of truth

* Variables are scrubbed in text (already existing behavior)
* Plots never become the primary control surface
* Plots are *views*, not controllers

---

## 2. Mental Model

### 2.1 What the user is doing

The user is not “plotting a function”.

They are answering:

> “How does **this result** depend on **that value**?”

This is called **dependency exploration**.

---

### 2.2 What a View Is

A **View** is:

* a declarative, persistent visualization
* bound to a computed expression node
* showing the relationship between that expression and one independent variable

A View:

* survives edits
* can disconnect
* can be reconnected
* is serialized in text

---

## 3. High-Level UX Flow

### 3.1 Entry point — clicking a result

Clickable targets:

* any derived variable
* any inline result after `=>`

Hover affordance:

* subtle underline or glow
* tooltip: **“Explore dependencies”**

---

### 3.2 Selection Mode (relationship picking)

Clicking a result enters **Selection Mode**:

* All valid candidates highlight:

  * numeric variables
  * dates
  * percentages
  * compatible results

User flow:

1. Click **result** (Y)
2. Click **independent variable** (X)
3. Plot appears immediately

No menus. No config dialogs.

---

### 3.3 Transient exploration plot

When X is selected:

* A plot appears inline, below the expression
* X = selected variable
* Y = selected result
* Domain inferred automatically
* A dot marks the current value

This plot is **temporary** unless explicitly persisted.

---

### 3.4 Scrubbing (already existing behavior)

All variables are already scrubbable by dragging their unit/value.

During scrubbing:

* plot updates live
* dot moves
* dependent results update

Plots never introduce new scrubbing mechanics.

---

## 4. Persistent Views (Detached Views)

### 4.1 Why detached views exist

Exploration often yields insight worth keeping.

Detached Views:

* persist independently of exploration state
* survive document edits
* are explicit, textual artifacts

---

### 4.2 View syntax

A persistent View is declared by an @view **annotation line** immediately following an expression:

```smartpad
estimated value = principal * (1 + annual return)^years => $29,507.27
@view plot x=years
```

This syntax:

* binds to the computed node of the line above
* does **not** use `=>`
* produces no scalar result
* renders a plot block below it

---

## 5. Mini-Grammar for `@view`

### 5.1 General form

```
@view <kind> <params>
```

Where:

* `@view` is a reserved directive
* `<kind>` defaults to `plot` if omitted
* `<params>` are key=value pairs (space-separated)

---

### 5.2 Supported fields (v1)

| Field     | Required | Description                              |
| --------- | -------- | ---------------------------------------- |
| `kind`    | no       | `plot`, `scatter`, `hist`, `box`, `auto` |
| `x`       | no       | Independent variable (symbol name)       |
| `domain`  | no       | Semantic domain of X                     |
| `view`    | no       | X viewport (pan/zoom state)              |
| `ydomain` | no       | Semantic domain of Y                     |
| `yview`   | no       | Y viewport (pan/zoom state)              |
| `size`    | no       | `sm`, `md`, `lg`, `xl`                   |

---

### 5.3 Examples

Basic:

```smartpad
@view plot x=years
```

Multiple series (comma-separated):

```smartpad
f = 2*x + 1
g = x^2
@view plot x=x y=f,g
```

Multiple series with spaces (quote the value or rely on space-tolerant parsing):

```smartpad
f = 2*x + 1
g = x^2
@view plot x=x y=f, g
@view plot x=x y="2*x + 1, x^2"
```

With explicit domain:

```smartpad
@view plot x=years domain=0..40
```

Frozen auto domain:

```smartpad
@view plot x=years domain=@auto(frozen)
```

With viewport:

```smartpad
@view plot x=years domain=0..40 view=5..25
```

`view=` only affects the X axis. Use `yview=` for Y.

With explicit Y domain:

```smartpad
@view plot x=years ydomain=0..100000
```

With explicit Y viewport:

```smartpad
@view plot x=years yview=1000..8000
```

Size:

```smartpad
@view plot x=years size=lg
```

Unnamed result:

```smartpad
a + b => 20%
@view plot x=a
```

---

## 6. Binding Rules

### 6.1 How a view binds

Internally, a view binds to:

* the **expression node ID** of the previous line
* not the textual line index

This ensures:

* moving lines does not break views
* edits preserve intent when possible

---

### 6.2 If the previous line changes

* If expression still exists → view updates
* If expression changes identity → view enters **Disconnected state**

---

## 7. View Lifecycle States

### 7.1 Connected

* Expression exists
* Variable exists
* Plot renders normally

---

### 7.2 Disconnected

Triggers:

* expression deleted
* expression errors
* variable missing or incompatible

UI:

* Plot area remains
* Curve hidden or faded
* Header shows:

  > ⚠ Disconnected — expression unavailable

Actions:

* Reconnect
* Change expression
* Change variable

---

### 7.3 Reconnection Mode

When user clicks a disconnected view:

* All valid expressions/results highlight
* User clicks new Y
* Then selects X

View reconnects and resumes live updates.

---

## 8. Domain Inference Rules

### 8.1 Explicit domain always wins

If `domain=` is specified, it is used verbatim.

---

### 8.2 Auto domain inference (deterministic)

Auto domains must be:

* predictable
* stable across reloads
* unit-aware

Rules:

* Numeric: centered around current value, symmetric, clamped
* Time (years, months): floor at 0 unless negative meaningful
* Percentages: clamped to sensible bounds (never cross invalid zones silently)
* Dates: calendar-aware window around current date

---

### 8.3 Invalid regions

* Curves break (no vertical jumps)
* Invalid areas are not interpolated
* Warnings are shown when necessary

---

## 9. Pan & Zoom

### 9.1 Conceptual separation

* **Domain** = semantic range of X
* **Viewport** = what the user is looking at

Pan/zoom only affects the **viewport**.

---

### 9.2 Interaction

* Scroll = zoom X
* Shift + scroll = pan
* Small “Reset view” control restores viewport to computed view (instead of the full domain)

---

### 9.3 Persistence rules

* Pan/zoom is transient unless user commits it
* If user commits:

  * viewport is serialized as `view=`
* Domain never silently changes

---

### 9.4 Freeze / Commit actions

Available in plot header:

* “Freeze domain”
* “Set domain from view”
* “Reset to auto”

These convert emergent state into declared text.

---

## 10. Chart Size

### 10.1 Sizes

Supported:

* `sm`
* `md` (default)
* `lg`
* `xl`

---

### 10.2 Resizing interaction

* Hover plot → subtle resize grip
* Drag vertically
* Snaps to nearest size

Size stored as:

```smartpad
size=md
```

---

## 11. Multiple Series & Lists

### 11.1 Lists

If X or Y is a list:

* `plot` → line or bar (auto)
* `hist` → histogram
* `box` → box plot

---

### 11.2 Multi-series (future-safe)

Multiple expressions may be supported later via block syntax, but **not required for v1**.

---


## 12. Performance & Reactivity

* Views update on any dependency change
* During scrubbing:

  * sampling density reduced
* After idle:

  * full fidelity recompute

Adaptive sampling is mandatory.

---

## 13. Non-Goals (Explicit)

This feature does **not**:

* introduce chart builders
* introduce sliders
* introduce dashboards
* replace numeric results
* hide ambiguity or invalid math

---

## 14. Success Criteria

This feature is successful if:

* users explore without planning
* insight appears faster than calculation
* plots feel like *extensions of thought*
* nothing breaks silently
* documents remain readable as plain text

---

## FAQ
### Possible Confusion: clicking vs @view syntax — do they both “declare a view”?
They serve different purposes:
Clicking creates a transient exploration view (think “inspection mode”).
@view creates a persistent document view (a saved lens).

Clicking does not declare a persistent view by default—because Smartpad shouldn’t litter the document just because you looked at something.
The missing link: “Pin/Detach” action
Clicking produces a transient plot; then the user can choose Detach View to insert the @view line.

So:
click result → transient plot appears
user likes it → click “Detach view”
Smartpad inserts @view ... line under the target expression
now it’s persistent
That keeps the notebook clean and still lets people “commit insight”.

## 15. Summary

**Interactive Dependency Views** turn Smartpad from a calculator into a *thinking surface*.

They:

* respect impermanence
* preserve intent
* keep text authoritative
* make exploration playful and fast
* allow insight to be captured declaratively

This spec is complete and sufficient for implementation.

---

If you want, next step (optional) would be:

* a reference implementation outline (data structures + AST hooks)
* or a designer-facing visual state diagram

But as requested: **this document stands on its own.**

</details>
