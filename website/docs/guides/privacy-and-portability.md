---
title: "Privacy and Portability"
sidebar_position: 5
description: "How SmartPad stores your work, what stays local, and how to keep important sheets portable."
---

# Privacy and Portability

SmartPad is built around a simple idea: your notes and calculations should still belong to you after the tool is closed.

- **Local-first storage**: sheets are saved in your browser using IndexedDB.
- **Readable exports**: your content remains plain Markdown text.
- **Easy escape hatch**: download one sheet as `.md`, or export everything as a zip.
- **Recoverable deletes**: trash/restore flows help prevent accidental permanent loss.
- **No hidden sheet telemetry**: SmartPad does not send sheet text, calculations, variables, or imported files to a SmartPad backend.

## How saving works

SmartPad autosaves after you pause typing, keeps the same sheet identity when a title changes, and coordinates updates across tabs. The main thing to remember is that browser storage belongs to the browser profile, so profile resets, private browsing, or cleanup tools can remove local data.

## Signup and analytics

A future update signup belongs to the website, not to your sheets.

- You should not need to sign up just to use SmartPad.
- Website analytics, if enabled, should measure the website only.
- Analytics should not collect sheet content, calculation text, imported files, or local sheet metadata.
- Any provider used for updates or analytics should be disclosed where people sign up.

## Currency and external rates

Currency conversion may use external FX providers and cached data:

- Fiat and crypto rate availability depends on provider uptime and network access.
- When offline or unavailable, SmartPad can use cached rates when present.
- FX rates are useful for planning, but they are not guaranteed market quotes.
- Do not use SmartPad FX output as financial, tax, legal, or investment advice.

## Desktop beta status

Desktop builds are still a beta path. Use the web app as the dependable default until packaged builds are clearly marked and tested.

- Early desktop builds may be unsigned and may show operating-system warnings.
- Release notes should say exactly which platforms were built and smoke-tested.

## What to do before sharing publicly

- Export a `.md` copy of critical sheets.
- Use `Download All` before browser/profile migrations.
- Confirm sensitive notes are removed from examples before posting screenshots.

## Make sheets easier to keep

- Give important models clear Markdown headings.
- Keep units and currencies explicit so values make sense outside the UI.
- Archive long-lived work as exported `.md` files in storage you control.

## When to ask for help

Use [Support](../support) for wrong calculations, storage/import/export problems, settings bugs, docs errors, or beta feedback.

## Related details

- [File Management](../../specs/file-management)
