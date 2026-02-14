---
sidebar_position: 1
slug: /
---

# SmartPad Documentation

This docs site is powered by Docusaurus and generated from SmartPad specs.

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
