# Result Chips + Value Graph: Implementation Gaps (Saved Notes)

Saved on: 2026-02-09
Source spec: /Users/nm4/STUFF/Coding/SmartPad/docs/Specs/ResultChipsAndValueGraph.spec.md

## Active Gaps (Current Delivery Scope)
1. Structured reference remap on plain-text block paste/export is still limited.
- What it is: when only plain text is available, references preserve stable placeholder keys but do not yet remap source identity semantically across arbitrary external edits.
- Current status: rich SmartPad copy/paste preserves chips; plain-text round-trips preserve keys, but cross-document remap logic is still basic.

2. Broken-reference cause codes are still generic.
- What it is: precise reasons (`source_error`, `missing_source`, `type_mismatch`) for better UX.
- Current status: generic warning messaging is used.

3. Accessibility model is partial.
- What it is: keyboard-first reference insertion, focusable chips, keyboard jump-to-source semantics.
- Current status: mostly pointer-first interactions with limited keyboard support.

4. Several edge-case behaviors remain partial.
- What it is: invalid-drop handling polish, paste remap rules, cycle handling for references, etc.
- Current status: core flows exist, edge behaviors are partial.

5. Test coverage still has acceptance-criteria gaps.
- What it is: direct tests for reorder stability, cycle errors, keyboard/a11y flows, stronger visual assertions.
- Current status: core flows covered, some acceptance criteria not yet directly asserted.

6. Value-graph result-click coexistence is unresolved.
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
