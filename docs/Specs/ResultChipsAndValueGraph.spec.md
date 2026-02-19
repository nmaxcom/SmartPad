# SmartPad Result Chips + Value Graph Spec (V2)

This spec extends Live Result into a full interaction model where results are:

1. always readable and aligned,
2. directly manipulable in the editor,
3. reusable as dependencies without exposing raw reference syntax to end users.

Core principle:
Result chips are first-class computational objects, not second-class preview badges.

---

## 0) Product Intent

SmartPad should feel like a playable simulation of math, not a static text editor.

Users should be able to:

1. read sheets quickly (clear alignment),
2. build formulas by touching values directly (click/drag/paste chips),
3. trust dependency behavior when source values change or break.

Plain explanation:
Instead of typing abstract references like `@L12`, people work with visible chips. SmartPad handles hidden linking internally.

Technical explanation:
References are stored as structured inline reference nodes tied to stable source line IDs and evaluated via dependency graph edges.

---

## 1) Scope

### In scope

1. Result lane alignment and spacing system.
2. Chip interaction model (click insert, drag/drop, copy/paste as reference).
3. Hidden internal references (no visible `@L12` in SmartPad UI).
4. Broken-source states and dependency error UX.
5. Parser/evaluator/dependency graph integration for reference nodes.
6. Export/import strategy for preserving references.

### Out of scope (this version)

1. Multiplayer conflict-resolution UX polish.
2. Formula debugger timeline/replay UI.
3. AI-assisted formula suggestions.

---

## 2) UX Pillars

1. Legibility at speed.
2. Direct manipulation over symbolic syntax.
3. Safe failure states with clear recovery.
4. Equal visual weight for live and explicit results.

---

## 3) Feature Overview

| Feature | Plain explanation | Technical explanation |
|---|---|---|
| Result Lane | Results line up in one clean vertical lane, so scanning is instant. | Desktop editor computes a lane anchor and positions result widgets at a shared x-offset; narrow viewports collapse to inline mode. |
| Chip as Value | You can click/drag/copy a chip into another expression to reuse it. | Interaction inserts a `resultReference` inline node with `sourceLineId`/`sourceResultId` attrs, not plain text. |
| Hidden References | Users never see raw `@L12` tokens while editing. | Internal serialization can use reference keys, but runtime editor view renders only chip nodes. |
| Broken Source UX | If source value breaks, dependent chips show clear "broken link" state. | Resolver marks reference unresolved with cause code (`source_error`, `missing_source`, `type_mismatch`), and decorator renders stateful chip + inline warning. |
| Type-Safe Chaining | Units/currency/list/number semantics propagate through references. | Evaluator resolves referenced semantic value before expression evaluation; no lossy string interpolation. |

---

## 4) Visual System

### 4.1 Result Lane (Desktop)

Rules:

1. Input content flows naturally on the left.
2. Results align to a fixed lane on the right (same x for each line).
3. If a line is too long, expression wraps before colliding with lane.
4. Live and explicit outputs render in the same lane style.

ASCII mock:

```text
monthly rent = 2500                              [2,500]
phone bill   = 45                                   [45]
food = 50/day * 30 days                          [1,500]
total cost per month                             [4,045]
```

Spacing/alignment targets:

1. 4px baseline rhythm.
2. Chip height fixed per typography size.
3. Minimum 12px gutter between expression end and first chip edge.
4. Vertical optical alignment anchored to expression baseline midpoint.

### 4.2 Responsive Behavior

On narrow widths, result lane collapses to inline mode:

```text
food = 50/day * 30 days [1,500]
```

No behavior change, layout only.

### 4.3 Chip States (Game-feel inspired)

1. Idle: normal chip.
2. Hover: subtle glow/elevation.
3. Grabbed: chip follows pointer with ghost origin.
4. Valid drop target: caret highlight.
5. Invalid drop target: shake + reject pulse.
6. Broken reference: warning border + warning icon.

Plain explanation:
These micro-states make the feature feel intentional and tactile.

---

## 5) Interaction Model

### 5.1 Click to insert reference

Flow:

1. User places caret in expression.
2. User clicks a source result chip.
3. SmartPad inserts a reference chip token at caret.
4. If caret is on the same source line as the clicked live result, SmartPad creates a new line and inserts the chip there (prevents self-reference loops).

User sees:

```text
tax = [monthly rent] * 0.15
```

User does not see:

```text
tax = @L12 * 0.15
```

### 5.2 Drag chip into expression

Flow:

1. Drag source result chip.
2. Drop into target line.
3. Reference token inserted at drop position.

### 5.3 Copy/paste chip as reference

Flow:

1. Copy selected chip.
2. Paste into expression.
3. Insert linked chip reference (not literal text) when destination supports rich format.
4. For SmartPad text round-trip, serialize as SmartPad reference token (not literal value).
5. For external plain-text export, behavior follows `referenceTextExportMode`.

Guardrails:

1. Copy interception must apply only when a reference chip node itself is selected.
2. Normal line/multi-line copy must keep native editor behavior (no single-chip clipboard hijack).
3. Pasting rich SmartPad content with chips should preserve chips and linked behavior.

---

## 6) Broken Dependency UX (Requested "tax" case)

Desired appearance:

```text
subtotal = 120                                      [120]
tax = [subtotal] * 0.15                              [18]

# source line later breaks:
subtotal = 12 / 0                                    [⚠ Division by zero]
tax = [subtotal ⚠] * 0.15                            ⚠ source line has error
```

Behavior:

1. Reference chip turns warning state immediately.
2. Line result suppression follows current live policy (no noisy cascading stack traces by default).
3. Inline helper appears: `source line has error`.
4. Clicking warning chip jumps to source line.
5. When live preview is blocked on a source line, the result-lane blocked chip renders the reason text inline (not `...` with hover-only tooltip).
6. Blocked chips use the same error typography treatment as inline error results (15px size, normal weight, pink error text).

Plain explanation:
If an upstream value breaks, downstream formulas tell you exactly why and where.

Technical explanation:
Dependency graph propagates invalidation status with source node metadata; renderer maps it to reference-chip state and contextual message.

---

## 7) Internal Data Model

### 7.1 Stable IDs

Each line has stable `lineId` (UUID-like) independent of visual line number.

Why:

1. Reordering lines must not break references.
2. Insertions/deletions should preserve links.

### 7.2 Reference Node

New inline AST/editor node:

```ts
type ResultReferenceNode = {
  type: "resultReference";
  sourceLineId: string;
  sourceResultSlot: "primary";
  fallbackLiteral?: string;
  displayLabel?: string; // user-facing chip label
};
```

`displayLabel` is rendered UI text. `sourceLineId` is the authority.

### 7.3 Serialization

1. SmartPad JSON (save/load): preserve structured node attributes.
2. Clipboard rich format (SmartPad-aware destinations): preserve structured node.
3. Text serialization for SmartPad round-trip: preserve references in a SmartPad-readable token syntax.
4. External plain-text export: user-selectable mode:
   - `preserve` (emit SmartPad-readable reference tokens)
   - `readable` (emit flattened visible values)

Note:
Raw symbolic refs are for export/debug tooling, not normal SmartPad editing UI.

Plain explanation:
When you save or copy inside SmartPad, links should stay links.  
When you export for humans outside SmartPad, you can choose readable text instead.

Reference token format policy:

1. Authority is stable source identity (`lineId`/result slot) only.
2. Relative-position syntax (e.g. `line-4`) is not used as reference authority.

Example:

```text
@ref[lineId=line_mlfrrlf1_a6j5m3;slot=primary]
```

Meaning:
- `lineId` is what SmartPad trusts.
- References remain stable across insert/delete/reorder because identity is line-based, not position-based.

---

## 8) System Integration

### 8.1 Parser / AST

1. Parse reference tokens as `resultReference` components.
2. Keep existing expression parsing semantics unchanged for non-reference content.

### 8.2 Evaluator

1. Resolve each `resultReference` to semantic value from source line result cache.
2. Preserve value type (number/unit/currency/date/list/etc).
3. If source unresolved, emit typed dependency error reason.

### 8.3 Dependency Graph

1. Add/maintain reference dependency awareness so target lines re-evaluate when source lines change.
2. On source failure, propagate invalidation metadata.
3. Formal explicit edge graph + strict subgraph scheduling are planned for scale stage (see Section 11 policy).

### 8.4 Decorator / Rendering

1. Render line result chips in lane or inline mode.
2. Render inserted reference nodes as inline chips in expression text flow.
3. Render warning state and helper text for broken references.

### 8.5 Undo/Redo

Reference insertion/removal must be atomic editor transactions.

### 8.6 Settings

Add:

1. `resultLaneEnabled` (default: true desktop, auto-collapse on narrow widths).
2. `chipInsertMode` (default: click inserts reference).
3. `referenceTextExportMode` with values:
   - `preserve` (default): keep SmartPad stable-ID reference tokens in text copy/export.
   - `readable`: flatten references to current visible values.

Plain explanation:
By default SmartPad keeps references alive when copying/exporting text, so pasted content can come back as real chips later.

### 8.7 Live Result Expansion Rules

1. Live result should render for non-trivial assignment RHS values even without `=>`.
2. Non-trivial means: includes math operators, conversion keywords, percentage phrase operators (`of/on/off/as/is/per`), known variables, or function calls.
3. Simple literal assignments (e.g. `x = 42`, `tax = 8%`, `price = $120`) do not render live chips by default.
4. While user is in incomplete comparator/trigger states (e.g. trailing `=` before typing `>`), live result is suppressed to avoid placeholder gibberish/noise.
5. Phrase-based percentage expressions (e.g. `discount off base price`, `tax on final price`) bypass unresolved-identifier pre-check and are evaluated directly.

### 8.8 Current SmartPad Touchpoints (Implementation map)

Expected primary touchpoints in current codebase:

1. `src/components/Editor.tsx`
   Evaluates lines, builds render nodes, dispatches `evaluationDone`.
2. `src/components/ResultsDecoratorExtension.ts`
   Renders result widgets and warning/broken states; candidate home for lane placement logic.
3. `src/eval/renderNodes.ts`
   Extend render node contracts for reference metadata and broken-reference hints.
4. `src/parsing/*` and AST component types
   Add `resultReference` component parsing/serialization.
5. `src/state/dependencyGraph.ts`
   Add explicit edges for reference-node dependencies.
6. `src/state/settingsStore.ts` + `src/state/types.ts`
   Add lane/reference interaction settings.
7. Export/import pipeline (sheet serialization and clipboard handlers)
   Preserve structured reference nodes in rich format and deterministic fallback in plain text.

### 8.9 Runtime Trace Diagnostics (for flaky field bugs)

SmartPad exposes a bounded in-browser trace buffer for result/reference interaction debugging.

Runtime controls:

1. `window.__SP_REF_TRACE_ENABLE(true|false)`
   Enables/disables tracing and persists preference in `localStorage` key `smartpad-debug-ref-trace`.
2. `window.__SP_REF_TRACE_DUMP()`
   Returns the current trace entries array.
3. `window.__SP_REF_TRACE_CLEAR()`
   Clears trace entries.

Trace scope (non-exhaustive):

1. Result-chip mousedown insertion path (`resultMouseDown`, `insertReferenceAt`).
2. Reference typing interception (`handleTextInputOverReference`).
3. Post-insert click selection restore (`consumeResultClickRestore`).
4. Duplicate-literal cleanup and reference metadata updates in decorator pass.

Trace behavior:

1. Buffer is bounded (oldest entries are dropped).
2. Intended for diagnosing timing/state mismatches on user machines.
3. Default is disabled unless manually enabled or persisted in local storage.

---

## 9) Interaction Rules and Edge Cases

1. Dragging chip into comments/plain text inserts literal text, not reference node.
2. Dropping onto invalid syntax position shows reject animation and no insert.
3. Deleting source line marks dependent refs as missing source.
4. Copying sheet section with both source and dependents should remap links within pasted block when possible.
5. If remap impossible, keep external link or downgrade to literal based on paste option.
6. Cycles are detected and shown as cycle errors on participating lines.
7. Typing intermediate trigger text (e.g. `=` while building `=>`) must never surface internal reference placeholders in live UI output.

---

## 10) Accessibility

1. Keyboard command for "insert last result reference" at caret.
2. Reference chips are focusable and announce source label/value.
3. Broken chips announce error cause and provide keyboard jump-to-source action.

---

## 11) Performance Targets

Current delivery policy:

1. Maintain acceptable typing responsiveness and correctness for current sheet sizes.
2. Allow broader reevaluation paths while feature behavior stabilizes.
3. Defer strict subgraph-only scheduling and hard P95 budgets to scale stage.

Scale-stage targets (activated when scale signals appear):

1. Incremental re-eval only for changed line + dependent subgraph.
2. No full-document re-evaluation on each keypress.
3. P95 extra UI latency from chip rendering under 8ms for 500-line sheets.

---

## 12) Telemetry / Product Success Metrics

Current delivery policy:

1. Telemetry wiring is optional during stabilization.
2. Functional correctness and UX clarity are prioritized first.

Scale-stage telemetry package:

1. `result_lane_enabled_rate`
2. `chip_reference_insert_total`
3. `chip_reference_drag_total`
4. `chip_reference_paste_total`
5. `dependency_broken_total`
6. `broken_ref_recovery_click_total`
7. `avg_formula_build_time_ms` (session-level derived)

Interpretation goals:

1. Higher chip insert/drag usage = direct-manipulation adoption.
2. Lower manual retyping events = less friction.
3. Faster formula build time = real productivity gain.

---

## 13) Rollout Plan

### Phase 1: Visual foundation

1. Result lane + spacing/alignment system.
2. Unified chip prominence for live and explicit results.

### Phase 2: Reference insertion

1. Click/drag/paste creates hidden reference nodes.
2. Basic dependency graph links.

### Phase 3: Broken-link resilience

1. Broken reference states.
2. Jump-to-source and recovery actions.

### Phase 4: Export/interop polish

1. Rich clipboard round-trip.
2. Export mode options (readable vs symbolic).

---

## 14) Acceptance Criteria

1. Users never see raw `@Lxx` syntax while editing in SmartPad.
2. Clicking a result chip at a valid caret inserts a reference chip node.
3. Drag/drop and copy/paste chip references work in rich editor mode.
4. Reordering lines does not break existing references.
5. Source error produces broken-state reference chips and clear helper message on dependents.
6. Result lane aligns chips consistently across long sheets on desktop.
7. Narrow layout auto-collapses gracefully to inline chips.
8. Unit/currency references preserve semantic types in downstream calculations.
9. Undo/redo correctly replays chip insertion/removal.
10. Performance targets are met on representative large sheets.

---

## 15) Example End-to-End Sheet

```text
monthly rent = 2500                               [2,500]
phone bill = 45                                      [45]
food/day = 50                                         [50]
food total = [food/day] * 30                       [1,500]
monthly total = [monthly rent] + [phone bill] + [food total]    [4,045]

# later, source breaks:
food/day = unknownVar + 2                            [⚠ unresolved]
food total = [food/day ⚠] * 30                       ⚠ source line has error
monthly total = [monthly rent] + [phone bill] + [food total ⚠]  ⚠ source line has error
```

This is the intended "it just makes sense" behavior:

1. readable,
2. composable,
3. resilient.
