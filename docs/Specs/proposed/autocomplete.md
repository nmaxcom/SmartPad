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

1. Suggestions may appear while typing inside expression-like contexts only after the user has
   typed at least one non-whitespace character in the current token.
2. `ArrowUp` and `ArrowDown` move the active suggestion.
3. `Enter` or `Tab` applies the active suggestion.
4. `Escape` closes suggestions without changing text.
5. Clicking a suggestion applies it.
6. Applying a suggestion replaces only the current query range, not the whole line.
7. When keyboard navigation moves through a long suggestion list, the menu scroll position follows
   the highlighted option so the active item remains visible.
8. The manual autocomplete command opens contextual suggestions even when the current token is
   empty, for cases such as a blank expression line, `roi ` phrase continuations, `x=`, or
   `30kg to `.
9. The manual autocomplete shortcut is configurable in Settings by recording a key combination.
   The default is `Ctrl + Shift + K`, avoiding common OS-reserved space shortcuts.
10. Settings must not record shortcuts that are likely to be intercepted by the OS before the
    browser receives them, such as `Ctrl + Space` or `Cmd + Space`.
11. For blank-line manual suggestions, existing variables appear first, user-defined functions
    appear after variables, and SmartPad built-in functions such as `sqrt`, `ceil`, and `avg`
    appear last.
12. Autocomplete should not truncate matching suggestions by default; the menu should scroll and
    keyboard navigation should keep the active item visible.

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

After conversion keywords, autocomplete should prefer targets compatible with the source value.
Unit and duration sources should prefer unit symbols and aliases; currency sources should prefer
currency codes and currency symbols.
When the source value already has a concrete unit dimension, the target list must stay within
that compatible dimension. For example `30kg to ` may suggest `g`, `kg`, and `lb`, but must not
suggest temperature, distance, currency, or unrelated units.

Examples:

```smartpad
distance = 1200 m
distance to k
```

Typing `k` after `to` should suggest `km`.

```smartpad
seed = 35430 EUR
seed in U
```

Typing `U` after `in` should suggest currency targets such as `USD` and `USDT`, not unrelated
units such as kilos or Celsius.

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
6. Do not open the menu only because the user clicks a variable or moves the caret.
7. If the query ends with whitespace, do not keep suggesting the exact completed variable; only
   suggest longer phrase continuations such as `roi tax` for `roi ` when the user invokes the
   manual autocomplete command.
8. If the query exactly matches a completed variable or function name, do not keep showing that
   exact item while the user continues editing the same token.
9. Automatic autocomplete must not open only because the user types a space after a variable.

## Acceptance tests

1. Phrase variable query `monthly sub` suggests and inserts `monthly subscription revenue`.
2. Acronym query `msr` suggests `monthly subscription revenue`.
3. Function query `comp` suggests `compound(principal, rate, years)` and inserts `compound(`.
4. `@view hist values=ye` suggests list variable `years`.
5. `@view plot x=pr` suggests scalar variable `price`, not list variable `years`.
6. `distance to k` suggests `km`.
7. `seed in U` where `seed` is currency suggests currency targets and not unit targets.
8. `win = roi ` does not keep suggesting exact variable `roi` when no longer phrase match exists.
9. Moving the caret onto an existing variable does not open suggestions.
10. `# tax` returns no suggestions.
11. Editing `tax r = 21%` with the cursor before `=` returns no suggestions.
12. `30kg to ` suggests only mass-compatible targets such as `g`, `kg`, and `lb`.
13. Completing `platformfee` exactly hides the exact `platformfee` suggestion.
14. `win = roi ` does not auto-open suggestions, but the manual autocomplete command can show
    compatible phrase continuations such as `roi tax`.
15. Recording a new manual autocomplete shortcut in Settings changes the editor command without
    requiring a page refresh.
16. Reserved shortcuts such as `Ctrl + Space` and `Cmd + Space` are ignored by the recorder.
17. On a blank line, the manual autocomplete command opens complete contextual suggestions for
    available variables and functions instead of silently doing nothing.
18. Blank-line manual autocomplete includes built-in SmartPad functions, but ranks them after
    existing variables and user-defined functions.
19. Manual autocomplete returns the full ranked suggestion set by default, rather than hiding
    lower-ranked items behind an arbitrary cap.
