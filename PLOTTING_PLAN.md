# Plotting Feature Plan

## Goal
Implement interactive dependency views described in `docs/Specs/Plotting.spec.md` with a lightweight v1: transient exploration, persistent `@view` plots, and basic rendering.

## Work Chunks
- [x] Extend parsing/eval to understand `@view` lines and produce plot render nodes tied to the prior expression.
- [x] Add plotting utilities for domain inference, sampling, and numeric extraction.
- [x] Build `PlotViewExtension` for result-click selection, variable picking, and detach-to-`@view` behavior.
- [x] Style plot blocks and wire the extension into the editor.

## Follow-ups (after v1)
- Add pan/zoom interactions and persist viewport (`view=`) updates.
- Implement resize grip snapping to `size=`.
- Tighten domain inference for dates/percentages and show axis labels.
