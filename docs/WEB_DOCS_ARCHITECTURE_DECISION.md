# SmartPad Web Docs Architecture Decision

Date: 2026-02-14
Decision ID: DOCS-ARCH-2026-02-14

## Decision

Use Docusaurus as the docs UI framework, generated from SmartPad specs.

Specifically:
- source of truth remains `docs/Specs/*.spec.md`
- build step `npm run docs:docusaurus:publish-local` generates docs pages and syncs them into `public/docs/`
- app header docs link continues to point to `${BASE_URL}docs/index.html` (now Docusaurus output)

## Why we moved now

- Docs quality and UI consistency became the top user pain point.
- Docusaurus gives production-grade docs UI, navigation, and layout defaults.
- We can still keep specs as source-of-truth by generating Docusaurus pages from spec markdown.
- We can deploy docs through the existing app pipeline by syncing Docusaurus build output into `public/docs/`.

## Migration status

Completed:
1. Created `/website` Docusaurus scaffold.
2. Added generator `scripts/generate-docusaurus-docs.js` from specs to `website/docs/specs/`.
3. Added sync script `scripts/sync-docusaurus-build.js` to copy Docusaurus build into `public/docs/`.
4. Added root commands for generate/build/sync workflow.

Remaining:
1. Expand docs IA beyond raw spec pages into user-focused guides.
2. Backfill missing runnable examples and edge cases.

## Status Update (2026-02-14)

Docusaurus install/build has been validated and local sync to `public/docs/` is working.

## Constraints and guardrails

- Specs are source of truth. Do not manually patch generated sections in `public/docs/index.html`.
- Always regenerate docs page after spec updates.
- Run validation gates:
  - `npm run docs:map`
  - `npm run docs:drift`
  - `npm run spec:test`
  - `npm run build`
