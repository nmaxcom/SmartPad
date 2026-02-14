---
sidebar_position: 1
slug: /
---

# SmartPad Documentation

SmartPad turns plain text into a live computational workspace for planning, analysis, and decision making.

<div className="hero-panel">

## Why teams use it

- Write formulas in natural, notebook-style lines.
- Mix numbers, units, dates, ranges, and lists in one flow.
- Keep results live while editing, not after running a script.

</div>

## Start here

- Get productive fast: [Getting Started](/docs/guides/getting-started)
- Learn reusable patterns: [Syntax Playbook](/docs/guides/syntax-playbook)
- Browse practical workflows: [Examples Gallery](/docs/guides/examples-gallery)
- Dive into full feature coverage: [Feature Guides](/docs/specs)

## Local docs workflow

1. Regenerate docs from specs:

```bash
npm run docs:docusaurus:generate
```

2. Build + sync docs into app public assets:

```bash
npm run docs:docusaurus:publish-local
```

3. Run SmartPad app (includes docs route):

```bash
npm run dev
```

## Source of truth

- Feature contracts: `docs/Specs/*.spec.md`
- Generated docs pages: `website/docs/specs/`
- Docs generator: `scripts/generate-docusaurus-docs.js`
