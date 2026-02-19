# SmartPad Live Result Spec

This spec defines `Live result`, a mode where evaluable lines show their result while the user types, without requiring `=>`.

The intent is to reduce repetitive `=>` usage for common calculations while preserving explicit-trigger behavior for workflows that rely on `=>` (for example, explicit error surfacing and solve/equation flows).

---

## 0) Goals

1. Show results for common evaluable lines without needing `=>`.
2. Keep `=>` behavior fully intact and authoritative.
3. Avoid noisy UX while typing by suppressing live errors.
4. Keep performance and rendering stable by reusing existing debounce behavior.
5. Add counters so we can observe how often Live result helps vs gets suppressed.

---

## 1) Setting

- Add a boolean setting: `liveResultEnabled`.
- Default: `true`.
- Scope: user/app setting (same level as other evaluation display settings).

Plain meaning:
- Users get Live result out of the box.
- If they prefer current behavior, they can turn it off.

---

## 2) Core Behavior

### 2.1 Trigger rule

Technical:
- Live result is considered only for lines **without** `=>`.

Plain:
- If the user already typed `=>`, that line is handled the normal way only.

Example:
- `3*4` -> Live result can show `12`.
- `3*4 =>` -> only explicit result is shown.

### 2.2 Success-only rendering

Technical:
- Render live output only when evaluation returns a concrete successful result.
- Do not render live output for parse/runtime/unresolved/incomplete states.

Plain:
- Show answers, hide problems while typing.

Examples:
- `4lb to kg` -> show converted result.
- `cost per friend = pizza total cost / number of friends` -> show computed result on that line when referenced variables are already defined.
- `4lb to` -> show nothing (not yet complete).
- `unknownVar + 2` -> show nothing (not resolvable yet).

### 2.3 Keep explicit `=>` semantics

Technical:
- Explicit trigger path remains unchanged (including current error/solve behaviors).

Plain:
- `=>` still behaves exactly like today and still shows errors when explicitly requested.

---

## 3) Line Eligibility (What Live Result Should Ignore)

Technical:
- Exclude lines that are clearly non-expression content (plain text/comments/directives).
- Exclude lines where adding live output would create duplicate rendering on the same line.

Plain:
- Do not compute notes.
- Do not show two answers on one line.

Examples:
- `buy milk` -> no live result.
- `# todo` -> no live result.
- `2+2 =>` -> no extra live result layered on top.

---

## 4) State and Side-Effect Safety

Technical:
- Live result evaluation must not introduce new state mutations outside existing behavior.
- Preserve current assignment semantics exactly; do not change write timing because of live preview.

Plain:
- Live result is for display, not for secretly changing app data.
- If assignment behavior already exists in current pipeline, keep it as-is; Live result must not make it earlier/later/different.

Examples:
- Typing `2+3` should only show `5`, not create/update variables.
- If current non-`=>` assignment flow already stores `x = 5`, keep that behavior; Live result must not alter that contract.

---

## 5) Debounce and Timing

Technical:
- Reuse the same debounce mechanism and timing used by current result updates during typing.

Plain:
- Live result should feel like existing edit-to-result responsiveness users already know.

---

## 6) Visual Treatment

Technical:
- Live result uses a distinct color token from explicit result output.
- No extra badge/label in V1.

Plain:
- Same answer area, slightly different color so users can tell "preview while typing" from explicit `=>`.

---

## 7) Unknown Variables and Incomplete Input

Technical:
- Unknown/unresolved identifiers in live mode should suppress output (not show error).
- Incomplete syntax should suppress output.

Plain:
- If the line is unfinished or missing definitions, stay quiet until it becomes valid.

Examples:
- `a+b` when `a` is undefined -> no live result.
- `(3+` -> no live result.
- `9L/min * 18 min` -> show `162 L` when complete.

---

## 8) Counters / Observability

Add counters for behavior and tuning:

1. `live_result_evaluated_total`
2. `live_result_rendered_total`
3. `live_result_suppressed_plaintext_total`
4. `live_result_suppressed_incomplete_total`
5. `live_result_suppressed_error_total`
6. `live_result_suppressed_unresolved_total`
7. `live_result_eval_ms` (timer/histogram/avg)

Plain:
- These tell us if the feature is helpful, too strict, noisy, or slow.

---

## 9) Acceptance Criteria

1. With `liveResultEnabled = true`, `3` shows a live result `3`.
2. With `liveResultEnabled = true`, `3*4` shows `12` without `=>`.
3. With `liveResultEnabled = true`, `4lb to kg` shows live converted value.
4. `3*` shows no live output and no live error.
5. `unknownVar + 1` shows no live output and no live error.
6. `2+2 =>` shows only explicit result style/output (no double render).
7. Turning setting off disables all live previews.
8. Live result color differs from explicit result color.
9. Debounce behavior matches existing typing/result cadence.
10. Counters increment on expected paths (rendered vs suppression reasons).

---

## 10) Test Plan

### 10.1 Unit tests

1. Eligibility classification (expression vs plaintext/comment/directive).
2. Suppression reasons:
   - incomplete input
   - unresolved identifier
   - evaluation error
3. Success-path rendering for plain math and unit conversion expressions.

### 10.2 Integration tests

1. End-to-end typing flow with debounce.
2. No double-render on lines with explicit `=>`.
3. Toggle on/off behavior.
4. Visual token application for live-result color.
5. Counter increments for render and suppression reasons.

---

## 11) Out of Scope (V1)

1. Live error visualization.
2. Additional preview badges/tooltips.
3. Changes to explicit `=>` semantics.
4. Behavior changes to assignment persistence model.
