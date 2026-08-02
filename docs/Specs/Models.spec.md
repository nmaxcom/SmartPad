# SmartPad Reusable Models Spec

Status: implemented

Implemented in: `1.0.0-rc.16`

This spec defines readable multi-step callable models that remain ordinary SmartPad text.

## 1. Syntax

```smartpad
model Profit(revenue, costs, tax rate = 20%):
  gross = revenue - costs
  tax cost = gross * tax rate
  return gross - tax cost

profit = Profit(12000 EUR, 8900 EUR) =>
```

Rules:

1. The header starts with `model`, contains a callable name and at most 16 parameters, and ends with `:`.
2. Body lines are indented.
3. A body contains sequential local assignments and exactly one final calculation, `return expression`.
4. Blank and comment lines may appear inside the block.
5. A model contains at most 40 meaningful calculation lines.
6. Duplicate parameters, duplicate locals, shadowed parameters, a missing return, or a calculation after return produces a visible error at the model header.

## 2. Calls and scope

Models use the same positional, named, and default-argument syntax as one-line functions:

```smartpad
Profit(12000 EUR, 8900 EUR)
Profit(costs: 8900 EUR, revenue: 12000 EUR, tax rate: 15%)
```

Arguments are checked for missing, unknown, duplicate, and extra values. A model reads the current global sheet values at call time, then evaluates parameters and locals in an isolated scope. Locals never appear as global variables or in the Variables panel.

Models can call functions and other models. Calls are capped at 20 nested levels. If a one-line function and a model share a name, the latest definition in document order is the active callable.

## 3. Type behavior

Every step uses the existing semantic engine. Numbers, percentages, currencies, units, durations, lists where supported by their operations, and uncertain values keep their type through the model. Errors name the failing model/local step where possible.

An uncertain literal should currently be assigned outside the model and passed as a value; a local `centre ± tolerance` constructor is not supported until nested uncertainty syntax exists.

## 4. UX and discovery

- The model is styled as one restrained block with an accent rule; it is not a second editor or visual node graph.
- The header and every body line remain directly editable.
- Model signatures participate in normal autocomplete.
- Result chips, plots, scrubbers, and substitution lenses work with model calls.
- The `Uncertainty & Models` template is the runnable introduction.

## 5. Acceptance gate

The feature requires document-level parser tests, isolated-scope/default/named/error tests, typed and uncertain return tests, browser rendering and plotting tests, documentation/spec-trust checks, and a production build.
