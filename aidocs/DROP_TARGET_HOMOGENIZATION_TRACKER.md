# Drop Target Homogenization Tracker

Owner: Codex
Status: Completed
Scope: Make result-chip drag/drop boundary targeting deterministic, homogeneous, and reliable.

## Checklist

- [x] Define root causes and implementation architecture.
- [x] Introduce one canonical boundary resolver for result-chip drags.
- [x] Remove mixed visual/behavior paths that could disagree (indicator vs insertion target).
- [x] Make boundary hit zones broader and consistent across all lines.
- [x] Ensure last-line / end-of-document boundary has a generous newline-drop zone.
- [x] Ensure drop destination follows resolved boundary (no silent fallback to doc-end when boundary is active).
- [x] Use a high-contrast white drop indicator tied to resolved boundary.
- [x] Add regression test: stale value path remains correct.
- [x] Add regression test: drag survives dragleave and still inserts.
- [x] Add regression test: last-line bottom-edge drop inserts newline.
- [x] Add regression test: boundary drop between middle lines inserts at boundary (not end-of-doc).
- [x] Run targeted Playwright validation for drag/reference behavior.
- [x] Run build validation.
- [x] Run spec/doc sync checks (`docs:map`, `docs:drift`, `spec:test`, `spec:trust`, `verify:changed`).
- [x] Commit implementation with scoped message.
- [x] Mark tracker complete.

## Done Criteria

- Boundary indicator appears consistently for all line boundaries.
- Any shown boundary indicator corresponds 1:1 with final insertion boundary.
- Last-line boundary drop is easy and reliable without pixel-perfect positioning.
- Targeted drag/reference Playwright suite passes.
