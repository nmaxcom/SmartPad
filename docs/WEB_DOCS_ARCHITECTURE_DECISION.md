# SmartPad Web Docs Architecture Decision

Date: 2026-02-14
Decision ID: DOCS-ARCH-2026-02-14

## Decision

Use a generated static docs site in `public/docs/` as the current production path.

Specifically:
- source of truth remains `docs/Specs/*.spec.md`
- build step `npm run docs:web:build` generates `public/docs/index.html`
- app header docs link continues to point to `${BASE_URL}docs/`

## Why not Docusaurus now

- Docusaurus introduces new framework/tooling weight and content migration overhead.
- Current highest risk is docs drift, not docs framework capability.
- We already ship via Vite static assets; generated `public/docs/` keeps deploy path simple.
- This path is compatible with current docs/spec/test sync checks.

## Why this works now

- Docs become reproducible from specs instead of manually edited HTML.
- New specs automatically appear on the public docs page after generation.
- Per-spec sections and examples are pulled directly from spec source.

## Migration path to Docusaurus (if needed)

Trigger migration only if one or more become true:
- we need versioned docs, full-text search, or docs plugin ecosystem
- we need multi-page IA and richer authoring than generated single-page docs
- docs contribution workflow requires MDX components

If triggered:
1. Stand up `/website` Docusaurus scaffold.
2. Keep spec-derived JSON/markdown generation script as ingestion source.
3. Move generated content into versioned docs pages.
4. Update app docs link to hosted docs route.

## Constraints and guardrails

- Specs are source of truth. Do not manually patch generated sections in `public/docs/index.html`.
- Always regenerate docs page after spec updates.
- Run validation gates:
  - `npm run docs:map`
  - `npm run docs:drift`
  - `npm run spec:test`
  - `npm run build`
