# Proposed / Partial Specs

These entries are intentionally **not treated as fully shipped contracts**.

| Feature | Canonical card | Source spec | Status |
|---|---|---|---|
| Plotting and Dependency Views | `docs/Specs/proposed/plotting-and-dependency-views.md` | `docs/Specs/Plotting.spec.md` | `proposed` |
| Feature Vision | `docs/Specs/proposed/feature-vision.md` | `docs/FEATURE_VISION.md` (shim) | `proposed` |
| Unit Alias and Ratio | `docs/Specs/proposed/unit-aliases-and-ratio.md` | `docs/Unit.spec.md` (shim) | `proposed` |
| Unit Decision Forks | `docs/Specs/proposed/unit-decision-forks.md` | `docs/UnitDecisionForks.md` (shim) | `proposed` |

To promote an item to implemented:
1. Add/expand test coverage.
2. Move the canonical card to `docs/Specs/implemented/`.
3. Update `docs/spec-trust.json` status to `implemented`.
4. Run `npm run spec:trust` and `npm run verify:changed`.
