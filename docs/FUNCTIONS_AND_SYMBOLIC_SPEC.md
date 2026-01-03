# SmartPad Functions + Symbolic Foundations (Spec Draft)

## SmartPad Context (for reviewers)
SmartPad is a text-first calculator. Users type plain lines of text; any line that ends
with `=>` is evaluated, and the result is rendered inline. SmartPad keeps the original
text intact and renders results as decorations (not by editing the user’s input).
It understands variables, units, currency, percentages, and scientific notation.
Brief example:

```
radius = 4 m
area = PI * radius^2 => 50.27 m^2
volume = area * 2 m => 100.53 m^3
volume to cm^3 => 1.01e+8 cm^3
```

Key traits that matter for this spec:
- **Text-first syntax**: human-readable math in a document-like editor.
- **Inline results**: evaluation happens without mutating user text.
- **Semantic values**: numbers can carry units, currency, and percentages.
- **Document order**: variables are resolved in the order they appear.
- **UI assumptions**: features should remain predictable under undo/redo.

This spec introduces user-defined functions while keeping SmartPad’s core principles,
and it adds foundations for future symbolic math without replacing current evaluation.

## Decisions (Locked for V1)
- **Dynamic scope**, with explicit UI hints for external dependencies.
- **Definitions use `=` only** (no `=>` output for definitions).
- **Named arguments use `:`** in calls, defaults use `=`.
- **No forward references** (definitions must appear above calls).
- **Redefinition allowed with warning** (shadowing indicator).
- **Units: permissive in V1**, with warnings for nonsensical combinations.
- **Mixed unit/unitless** allowed with a warning (future: constraints).
- **Symbolic roadmap order**: `simplify` → `solve` → `derive/integrate`.
- **Errors include function context** (e.g., `Error in tax(80): rate undefined`).
- **Functions live in a dedicated panel section**, with jump-to-definition.
- **Docstrings supported** via comments directly above a function definition.

## Goals
- Users can define functions once and reuse them across the document.
- Functions participate in units/currency/percent semantics.
- Evaluation remains deterministic and consistent with current behavior.
- Provide clear extension points for symbolic math later.

## Non-Goals (Phase 1)
- Full CAS features (simplify/solve/derive) in production.
- Multi-line function bodies or control flow.
- Unbounded recursion without safeguards.

## Syntax

### Function Definition
```
area(r) = PI * r^2
tip(bill, rate=15%) = bill * rate
```

### Function Call
```
area(3 m) =>
tip(80) =>
```

### Named Arguments
```
tip(rate: 20%, bill: 60) =>
```

### Defaults
```
tax(amount, rate=8.5%) = amount * rate
tax(1200) =>
```

### Identifier Rules
- Function names follow the same identifier rules as variables.
- Parentheses always denote a function call or definition (never a variable).

**Rationale:** Parentheses are the clearest disambiguator in a text-first syntax.
Keeping them reserved avoids subtle parsing ambiguity and improves readability.
Named arguments use `:` in calls to distinguish mapping from assignment.

## Semantics

### Evaluation Order
- Functions are registered in document order (like variables).
- Calls resolve using the most recent definition above the call site.

**Rationale:** This mirrors current variable behavior and feels natural in a document.

### Scope
- Functions are evaluated with the **current** variable context at call time.
- Parameters shadow variables with the same name.

**Rationale:** Dynamic context makes functions act like reusable formulas that
react to live document state, which is consistent with SmartPad’s live recalculation.
UI will surface external dependencies (e.g., hover shows global variables used).

### Argument Passing
- Arguments are passed by value (semantic values with units/currency).
- Named arguments override position and allow readability.

### Recursion
- Allowed only with a maximum call depth to prevent lockups.
- Error when depth exceeds limit.

**Rationale:** We want recursion for power users, but must prevent UI freezes.

## Units / Currency / Percent
- Units and currency flow through function arguments and results.
- Unit algebra remains unchanged inside function bodies.
- Currency is preserved when appropriate (e.g., multiplying currency by a scalar).

**Rationale:** Functions should not be a special case; they are syntax for reuse,
not a new evaluation model.
In V1, unit mismatches are allowed but warn. A future phase adds optional
unit constraints like `area(r: distance)` for strict validation.

## Error Handling
- Undefined function: `Undefined function: name`
- Wrong arity: `Expected 2 arguments, got 1`
- Invalid default expression: `Invalid default for rate`
- Recursive overflow: `Maximum call depth exceeded`

Errors render inline just like existing evaluation errors.
Errors include function context to reduce debugging time.

## Parsing / AST Representation
New AST nodes:
- `FunctionDefinition(name, params, defaults, body)`
- `FunctionCall(name, args)`

**Rationale:** Keeping explicit nodes makes it easier to attach symbolic operations
later without re-parsing user text.

## Evaluation Model
Add a function registry to the evaluation context:
```
functionStore: Map<string, { params, defaults, bodyAst }>
```

The evaluator:
1) Registers function definitions in document order.
2) Resolves calls by name and binds arguments.
3) Evaluates the body AST in a scoped context.

## Symbolic Foundations (Future)
Reserve commands for symbolic math:
```
simplify expr =>
solve expr for x =>
derive expr with respect to x =>
```

Introduce a pluggable symbolic interface (future):
```
interface SymbolicEngine {
  simplify(ast, ctx): SymbolicResult
  solve(ast, ctx, target): SymbolicResult
  derive(ast, ctx, target): SymbolicResult
}
```

**Rationale:** We keep the numeric engine as the default, but provide a clean hook
for advanced symbolic operations without changing existing evaluation rules. Symbolic
commands are explicit to avoid surprising changes in everyday calculations.
Priority order for symbolic commands: `simplify`, then `solve`, then `derive/integrate`.

## Non-Obvious Decisions (Explained)
- **Document-order definitions**: mirrors how variables work today and preserves “read top to bottom”.
- **Dynamic context**: functions respond to current document values, matching SmartPad’s live updates.
- **No `=>` for definitions**: definitions should not render results; they are declarations.
- **Parentheses as function markers**: avoids ambiguity with multi-word variables.
- **Redefinition with warning**: supports iterative work while avoiding silent changes.
- **Named args with `:`**: avoids confusion with assignment and defaults.

## Compatibility
- Existing documents remain valid.
- Functions are additive; no breaking changes to current syntax.

## UI / UX Notes
- Variable panel gains a "Functions" section (name + signature).
- Hovering a function shows its signature and defaults.
- Inline results behave like normal results (copyable, selectable).
- Hover/inspect indicates external dependencies (e.g., uses global `rate`).
- Docstring comments above a function become hover help.
- Redefinition shows a subtle shadowing warning.

## Testing Plan
Unit tests:
- Parsing: function definitions, named args, defaults.
- Evaluation: units/currency inside functions.
- Errors: undefined function, wrong arity, recursion.

E2E tests:
- Define + call, then undo/redo stability.
- Function use inside templates.

## Open Questions (Deferred)
- Should we allow forward references in a future phase?
- Should we introduce unit constraints in V2 (`area(r: distance)`)?

---
If needed, we can split this into implementation phases and add a companion doc
that enumerates the exact parser and evaluator changes.
