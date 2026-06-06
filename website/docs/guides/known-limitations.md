---
title: "Known Limitations"
sidebar_position: 7
description: "Understand what SmartPad supports today, what is planned, and how to protect important work."
---

# Known Limitations

SmartPad is ready to use as a local-first calculation workspace, but the public launch should be explicit about current boundaries.

## Storage and accounts

- SmartPad does not have accounts, cloud sync, team workspaces, or collaboration.
- Sheets are stored locally in the browser profile with IndexedDB.
- Browser profile resets, device migrations, private browsing, or storage cleanup tools can remove local data.
- Export important work with `Download All` before browser/profile/device migrations.

## Privacy and telemetry

- The app does not send sheet content to a SmartPad backend.
- There is no hidden in-app telemetry for sheet text, calculations, variables, or imported files.
- Any future website signup or analytics must be documented separately from app usage.

## Currency and external data

- Currency conversions can depend on external FX providers and cached rates.
- Offline/cached FX behavior is shown in the app when rates are unavailable.
- FX values are practical planning data, not financial advice or guaranteed market quotes.

## Desktop app status

- Desktop packaging is planned as a beta path, starting with Electron.
- Until a signed artifact exists, the public launch should not promise polished native installers.
- Unsigned beta builds may trigger operating-system warnings and should be labeled as beta.

## Features not shipped yet

These are roadmap or proposed ideas, not public-launch promises:

- Cloud sync, accounts, and collaboration
- Full structured tables
- AI-generated formulas
- Auto-suggested plots as a finished workflow
- Timezone and business-day date keywords
- Plugin marketplace or plugin system
- Signed desktop installers for every operating system

## Practical guardrails

- Keep important models in plain Markdown exports.
- Remove sensitive data before posting screenshots, videos, or issue examples.
- Check [Support](../support) when a calculation looks wrong, storage behaves unexpectedly, or import/export does not work.
