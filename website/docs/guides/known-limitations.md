---
title: "Known Limitations"
sidebar_position: 7
description: "A plain-language view of what works today, where SmartPad is careful, and how to protect important work."
---

# Known Limitations

SmartPad is useful today, but it is better to be clear about its edges. This page is here so you know what to trust, what to double-check, and what is not part of the app yet.

## Your sheets live in this browser

- SmartPad does not currently have accounts, cloud sync, team workspaces, or collaboration.
- Sheets are stored locally in the browser profile with IndexedDB.
- Browser profile resets, device migrations, private browsing, or storage cleanup tools can remove local data.
- Use `Download All` before changing browsers, devices, or profiles.

## Privacy boundaries

- The app does not send sheet content to a SmartPad backend.
- There is no hidden in-app telemetry for sheet text, calculations, variables, or imported files.
- If the website later offers update signup or analytics, that should be explained separately from app usage.

## Currency and external data

- Currency conversions can depend on external FX providers and cached rates.
- If rates are unavailable, SmartPad should make that visible instead of pretending nothing happened.
- Treat FX values as planning data, not financial advice or guaranteed market quotes.

## Desktop app

- Desktop packaging is expected to start as a beta path.
- Until signed installers exist, use the web app as the main version.
- Unsigned beta builds may trigger operating-system warnings and should be labeled clearly.

## Not in the app yet

These are common things people may expect, but they are not part of SmartPad today:

- Cloud sync, accounts, and collaboration
- Full structured tables
- AI-generated formulas
- Auto-suggested plots as a finished workflow
- Timezone and business-day date keywords
- Plugin marketplace or plugin system
- Signed desktop installers for every operating system

## Good habits

- Keep important models backed up as plain Markdown exports.
- Remove sensitive data before posting screenshots, videos, or issue examples.
- Check [Support](../support) when a calculation looks wrong, storage behaves unexpectedly, or import/export does not work.
