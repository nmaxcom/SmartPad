# Public Docs Writing Standard

This document defines the required quality bar for SmartPad public docs.

The audience is the general public, not only technical users.

## 1. Audience and tone

Docs must assume the reader:

- understands everyday math
- may not understand programming terms
- wants to know what SmartPad is good for
- needs examples that feel like real life

Write:

- plainly
- concretely
- without internal jargon
- without fake or contrived examples

## 2. Page structure

Every public feature page should include:

1. what this feature is
2. when to use it
3. one short example first
4. a few realistic examples
5. one common mistake
6. one guardrail or limitation section

## 3. Example rules

Every public example must be:

1. valid SmartPad syntax
2. meaningful to a human reader
3. consistent with the actual current product
4. explicit about dates when date-sensitive

Avoid:

- placeholder nonsense
- examples that only show `2 + 3`
- invalid syntax presented as normal usage
- fake solve forms that do not actually parse

## 4. Human-example standard

Prefer examples like:

- rent, salary, groceries, savings
- trip cost, fuel, speed, time
- study hours vs test score
- delivery routes, stops, revenue
- home loan, deposit, monthly payment
- recipe scaling, protein mix, concentration

## 5. Result explanation

When a result might surprise a general reader, explain why.

Examples:

- why a percentage result is larger or smaller than expected
- why unit conversion changes magnitude
- why a date moved to month-end

## 6. Feature honesty

Public docs must distinguish clearly between:

- shipped behavior
- proposed behavior
- guarded or partial behavior

If a feature is not shipped, do not write as if it is.

## 7. Validation standard

Docs are not complete until:

1. example syntax has been validated
2. linked specs are aligned
3. docs/spec trust checks are green
4. changed examples have been reviewed for readability

When behavior changes in a way users will notice:

1. update the source spec
2. update public docs
3. update generated docs if applicable
4. rerun the relevant validation gates

## 8. Required implementation note for future doc refresh

The public-docs refresh is only complete when:

1. examples are trustworthy
2. explanations are understandable by non-programmers
3. pages help a reader choose when to use the feature
4. edge cases are shown without overwhelming the page
