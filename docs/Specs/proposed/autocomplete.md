# Autocomplete

Status: Proposed

Autocomplete should reduce repetitive typing without turning SmartPad into a noisy code editor.
The first version focuses on reusing names and syntax that already exist in the current sheet.

## Goals

1. Suggest existing variable names, including phrase variables with spaces.
2. Suggest user-defined functions with signatures.
3. Suggest compatible variables inside `@view` directives.
4. Suggest units and currencies after conversion keywords such as `to` and `in`.
5. Keep suggestions keyboard-first and dismissible.

## Non-goals for v1

1. No AI-generated formulas.
2. No cross-sheet symbol search.
3. No automatic correction of user text.
4. No large tutorial-style snippets in the normal expression dropdown.
5. No suggestions inside comments, headings, or prose-only lines.

## Interaction contract

1. Suggestions may appear while typing inside expression-like contexts.
2. `ArrowUp` and `ArrowDown` move the active suggestion.
3. `Enter` or `Tab` applies the active suggestion.
4. `Escape` closes suggestions without changing text.
5. Clicking a suggestion applies it.
6. Applying a suggestion replaces only the current query range, not the whole line.

## Source types

### Variables

Variables come from the active `ReactiveVariableStore` after normalization.

Examples:

```smartpad
tax rate = 21%
take home = gross pay - tax =>
tax r
```

Typing `tax r` should suggest `tax rate`.

### Functions

Functions come from the current evaluation `functionStore`.

Examples:

```smartpad
compound(principal, rate, years) = principal * (1 + rate)^years
comp
```

Typing `comp` should suggest `compound(principal, rate, years)` and insert `compound(`.

### Units and conversions

After conversion keywords, autocomplete should prefer unit symbols and aliases.

Examples:

```smartpad
distance = 1200 m
distance to k
```

Typing `k` after `to` should suggest `km`.

### View directives

Inside `@view`, suggestions should be parameter-aware.

Examples:

```smartpad
years = 1, 2, 3
revenue = 100, 150, 230
@view hist values=ye
```

`values=` should prefer list variables such as `years`.

```smartpad
price = $10
@view plot x=pr
```

`x=` should prefer scalar-compatible variables such as `price`.

## Matching and ranking

Autocomplete should rank suggestions in this order:

1. exact prefix match
2. token prefix match for phrase names
3. acronym match
4. substring match
5. stable alphabetical tie-break

Examples:

```smartpad
monthly subscription revenue = $1200
monthly sub
msr
revenue
```

All three queries should be able to find `monthly subscription revenue`, with `monthly sub`
ranking above `msr`, and `msr` ranking above generic substring matches.

## Guardrails

1. Do not trigger inside lines beginning with `#` or `//`.
2. Do not suggest variables while the cursor is on the left side of an existing assignment.
3. Do not insert `=>` automatically.
4. Do not rewrite variable names unless the user explicitly accepts a suggestion.
5. Do not block normal typing when no useful suggestion exists.

## Acceptance tests

1. Phrase variable query `monthly sub` suggests and inserts `monthly subscription revenue`.
2. Acronym query `msr` suggests `monthly subscription revenue`.
3. Function query `comp` suggests `compound(principal, rate, years)` and inserts `compound(`.
4. `@view hist values=ye` suggests list variable `years`.
5. `@view plot x=pr` suggests scalar variable `price`, not list variable `years`.
6. `distance to k` suggests `km`.
7. `# tax` returns no suggestions.
8. Editing `tax r = 21%` with the cursor before `=` returns no suggestions.
