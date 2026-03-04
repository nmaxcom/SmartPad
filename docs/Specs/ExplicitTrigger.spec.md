# SmartPad Explicit Trigger (`=>`) Spec

This spec defines the explicit trigger contract for `=>` lines.

`=>` is the authoritative opt-in for explicit evaluation intent, explicit error surfacing, and solve workflows that must not depend on live-preview heuristics.

---

## 0) Goals

1. Preserve a deterministic explicit evaluation path regardless of live result settings.
2. Keep `=>` as the canonical entrypoint for intentional solve and error visibility flows.
3. Ensure templates and docs only preserve explicit triggers where they are semantically required.

---

## 1) Trigger Forms

Supported explicit forms:

1. Expression evaluation:
   - `2 + 3 =>`
2. Assignment with explicit result:
   - `total = price * qty =>`
3. Variable value/implicit solve request:
   - `speed =>`
   - `qty =>`
4. Explicit solve:
   - `solve qty in total = price * qty =>`

Non-goal:
- Live result behavior without `=>` is defined by `docs/Specs/LiveResult.spec.md`.

---

## 2) Core Contract

1. `=>` requests explicit evaluation for the left-side expression.
2. Explicit path surfaces parse/runtime errors on that line.
3. Explicit path remains active even when live previews are disabled.
4. Explicit solve clauses must include `=>`; `solve ...` without `=>` is not an executable solve line.

---

## 3) Interaction With Solve

`=>` enables two solve-capable flows:

1. Implicit solve or value retrieval:
   - `<variable> =>`
2. Explicit solve DSL:
   - `solve <target> in ... =>`

These flows are documented in:
- `docs/Specs/Solve.spec.md`

---

## 4) Conversion Suffix and Explicit Trigger

After explicit evaluation, conversion suffixes (`to` / `in`) apply when valid:

1. `speed to mph =>`
2. `distance in km =>`
3. Solved results can also apply conversion when the output type supports it.

---

## 5) Template Normalization Rules

Template normalization may remove optional `=>` for readability, but must preserve explicit triggers for:

1. Solve lines (any line containing `solve`)
2. Lines intentionally demonstrating explicit error output (`=> ⚠️ ...`)
3. Template-specific required trigger examples (for regression coverage)

Reference implementation:
- `src/components/VariablePanel/templateTriggerNormalization.ts`

---

## 6) Acceptance Examples

1. Explicit arithmetic:
   - `2 + 3 =>` -> `5`
2. Explicit unresolved error:
   - `unknown_var + 5 =>` -> explicit warning
3. Explicit solve:
   - `solve v in distance = v * time =>` -> `distance / time` (or numeric when values exist)
4. Solve line trigger preservation:
   - `normalizeTemplateTriggers(..., "solve x + 2 = 5 =>")` keeps `=>`.
