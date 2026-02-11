# Result Chips + Value Graph: Implementation Gaps (Saved Notes)

Saved on: 2026-02-09
Source spec: /Users/nm4/STUFF/Coding/SmartPad/docs/Specs/ResultChipsAndValueGraph.spec.md

## Active Gaps (Current Delivery Scope)
1. Missing settings for chip/ref behavior.
- What it is:
  - `chipInsertMode` (how click-insert behaves)
  - `referenceTextExportMode` (how text copy/export serializes references)
- Current status: not present in settings types/store/UI.
- Required default: `referenceTextExportMode = preserve`.

2. Structured reference persistence/export modes are incomplete.
- What it is: preserving reference nodes cleanly in sheet save/export with readable and symbolic modes.
- Current status: reference placeholders are flattened to plain text; no export mode switch like readable vs stable-ID token (e.g. `@ref[lineId=...;slot=primary]`).

3. Broken-reference cause codes are missing.
- What it is: precise reasons (`source_error`, `missing_source`, `type_mismatch`) for better UX.
- Current status: generic warning messaging is used.

4. Accessibility model is partial.
- What it is: keyboard-first reference insertion, focusable chips, keyboard jump-to-source semantics.
- Current status: mostly pointer-first interactions with limited keyboard support.

5. Several edge-case behaviors are incomplete.
- What it is: invalid-drop handling polish, paste remap rules, cycle handling for references, etc.
- Current status: core flows exist, edge behaviors are partial.

6. Test coverage still has acceptance-criteria gaps.
- What it is: direct tests for reorder stability, cycle errors, keyboard/a11y flows, stronger visual assertions.
- Current status: core flows covered, some acceptance criteria not yet directly asserted.

7. Value-graph result-click coexistence is unresolved.
- What it is: old click-to-plot behavior and new click-to-insert reference behavior need conflict-safe coexistence.
- Current status: result-click plotting path is currently disabled.

## Deferred Until Scale Signals (Not Blocking Current Scope)
- Formal line-level dependency graph for result references.
  - Decision: keep current document-order + existing propagation for now.
  - Trigger to revisit: repeated propagation correctness bugs or large-sheet instability.
- Incremental reevaluation (changed-line + dependent-subgraph) replacing broad/full pass.
  - Decision: defer optimization while current UX/perf remains acceptable.
  - Trigger to revisit: measurable typing latency or reevaluation regressions on bigger sheets.
- Full telemetry metrics package from spec section 12.
  - Decision: defer instrumentation until feature behavior is stable enough for meaningful metrics.
  - Trigger to revisit: rollout stage where adoption/quality tracking is required.
