# Result Chips and References

- Status: `implemented`
- Source spec: `docs/Specs/ResultChipsAndValueGraph.spec.md`
- Mapped group: `Editor And Result Chips`
- Verification tests:
  - `tests/e2e/result-reference-drag-only.spec.ts`
  - `tests/e2e/result-reference.spec.ts`
  - `tests/e2e/results-decorator-regression.spec.ts`
  - `tests/e2e/user-issues-fixed.spec.ts`
  - `tests/unit/semanticHighlightTokenization.test.ts`

This card is the trust declaration for shipped result chip and reference behavior.

Implemented interaction contract:

- Live and explicit trigger result chips expose the same interaction model.
- The whole result chip is draggable; there is no separate drag handle.
- Hover actions are limited to copy/value actions and the action menu.
- Drag/drop reuse creates live result references, preserving source dependency updates.
- Inline reference chips render as lightweight text-value references without visible fill, border, padding, or hover ring; hovering a reference highlights the source line with background only.
- Internal reference placeholder ids are evaluation-only and must not appear in visible result chips, warnings, or copied readable reference text.
- Dragged references carry their current rendered value as a fallback so dependent expressions can evaluate cleanly while source-line identity is being resolved.
