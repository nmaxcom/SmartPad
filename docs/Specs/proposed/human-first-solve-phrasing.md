# Human-First Solve Phrasing

Status: proposed

This document defines a controlled natural-language layer for solve in SmartPad.

The objective is not free-form NLP. The objective is a small, solid grammar that feels natural while lowering to the existing solve engine.

## 1. Purpose

Users often think in phrases like:

- "what base price gives me EUR 85 after discount"
- "5% of what is EUR 12"
- "how many months until the fund reaches EUR 20,000"

The current solve form is deterministic and good:

```smartpad
solve x in ... =>
```

This proposal keeps that deterministic core and adds friendlier surface forms.

## 2. Core principles

1. Every accepted human-style solve must lower to a deterministic internal solve form.
2. `=>` is required in v1 for all human-style solve phrases.
3. The grammar must be narrow, explicit, and heavily unit-tested.
4. Unsupported phrasing must fail clearly rather than half-parse.

## 3. Accepted forms

### 3.1 What-is form

```smartpad
what is <target> if <condition> =>
```

Example:

```smartpad
what is gross if take home = EUR 4000 and tax = 22% =>
```

### 3.2 What-makes form

```smartpad
what <target> makes <equation> =>
```

Example:

```smartpad
what hourly rate makes monthly income = EUR 3200 if hours per week = 28 =>
```

### 3.3 How-many form

```smartpad
how many <target> if <condition> =>
```

Example:

```smartpad
how many months if goal fund = EUR 20000 and current savings = EUR 3200 and monthly saving = EUR 900 =>
```

### 3.4 Reverse percentage forms

```smartpad
5% of what is EUR 12 =>
8% on what is EUR 12 =>
15% off what is EUR 85 =>
```

## 4. Lowering rules

Examples:

```smartpad
5% of what is EUR 12 =>
```

lowers to:

```smartpad
solve x in 5% of x = EUR 12 =>
```

```smartpad
what is gross if take home = gross - tax on gross and take home = EUR 4000 and tax = 22% =>
```

lowers to:

```smartpad
solve gross in take home = gross - tax on gross, take home = EUR 4000, tax = 22% =>
```

## 5. Examples

### 5.1 Reverse discount

```smartpad
15% off what is EUR 85 =>
```

Expected:

```smartpad
EUR 100
```

### 5.2 Travel time

```smartpad
what time makes distance = 42 km if speed = 5.5 km/h =>
```

Expected:

```smartpad
7.636 h
```

### 5.3 Physics

```smartpad
what angle makes range = 40 m if speed = 22 m/s and g = 9.81 m/s^2 =>
```

### 5.4 Practical budgeting

```smartpad
what grocery budget makes monthly savings = EUR 1000 if income = EUR 3200 and rent = EUR 1250 and transport = EUR 260 =>
```

## 6. Guardrails

1. No free-form question answering.
2. No omission of the target in ambiguous phrases.
3. No live-mode execution without `=>` in v1.
4. If the phrase parses but the solve engine cannot isolate the variable, show a solve error, not a language error.
5. If the phrase itself is outside the supported grammar, show `Unsupported solve phrasing`.

## 7. Edge cases

### 7.1 Ambiguous target

Reject:

```smartpad
what is needed if profit = EUR 3000 =>
```

Reason:

- target variable is not explicit

### 7.2 Multiple possible interpretations

Reject:

```smartpad
what makes 15% off EUR 85 =>
```

Reason:

- grammar does not clearly identify target

## 8. Acceptance examples

```smartpad
5% of what is EUR 12 => EUR 240
8% on what is EUR 12 => EUR 11.111...
12% off what is EUR 88 => EUR 100
```

```smartpad
what distance makes travel time = 2.5 h if speed = 90 km/h => 225 km
```

## 9. Implementation gate

Promotion requires:

1. extensive Jest coverage for accepted phrases, rejected phrases, lowering behavior, and parser non-interference
2. targeted Playwright coverage for editor behavior and error messaging
3. full Jest suite
4. full Playwright suite
5. all general regression checks green
6. iteration until the feature does not derail any other interpretation path in SmartPad
