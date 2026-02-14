# SmartPad Docs Site (Docusaurus)

This folder contains the Docusaurus docs app for SmartPad.

## Commands

From repo root:

```bash
npm run docs:docusaurus:generate
npm --prefix website install
npm run docs:docusaurus:dev
```

Build:

```bash
npm run docs:docusaurus:build
```

Production-path build (`/SmartPad/docs/`):

```bash
npm run docs:docusaurus:build:prod
```

## Content flow

- Source specs: `docs/Specs/*.spec.md`
- Generated docs pages: `website/docs/specs/*.md`
- Generator script: `scripts/generate-docusaurus-docs.js`
