---
sidebar_position: 1
slug: /
---

# SmartPad Documentation

SmartPad docs are generated from specs, then organized into feature guides.

## Start here

- Read the guide index: [Feature Guides](/specs)
- Learn core editor behavior first:
  - [Live Results](./specs/live-results)
  - [Result Chips and References](./specs/result-chips-and-references)
- Then move to domain guides:
  - [Currency and FX](./specs/currency-and-fx)
  - [Lists](./specs/lists)
  - [Ranges](./specs/ranges)

## Local workflow

1. Generate docs pages from specs:

```bash
npm run docs:docusaurus:generate
```

2. Install docs dependencies:

```bash
npm --prefix website install
```

3. Run docs site:

```bash
npm run docs:docusaurus:dev
```

## Source of truth

- Feature contracts live in `docs/Specs/*.spec.md`.
- Docusaurus pages in `website/docs/specs/` are generated from those specs.
