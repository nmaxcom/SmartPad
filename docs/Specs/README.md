# Spec Trust Layout

This folder is the canonical trust surface for SmartPad specs.

## Goals
- Keep a 1:1 mapping between implemented behavior and trusted specs.
- Separate shipped behavior from ideas that are not yet guaranteed.
- Make CI enforce spec/test traceability.

## Folders
- `docs/Specs/implemented/`: trusted specs for behavior shipped in SmartPad.
- `docs/Specs/proposed/`: planned or partially implemented behavior.

## Source + Registry
- Legacy source specs remain in `docs/Specs/` during migration.
- Trust registry is `docs/spec-trust.json`.
- CI gate is `npm run spec:trust`.
- Relocated proposal docs may keep compatibility shims in `docs/` to avoid breaking inbound links.

## Rules
1. Every `docs/Specs/*.spec.md` file must exist in `docs/spec-trust.json`.
2. `implemented` entries must include at least one existing test reference.
3. `implemented` canonical specs must live under `docs/Specs/implemented/`.
4. `proposed`/`partial` canonical specs must live under `docs/Specs/proposed/`.
