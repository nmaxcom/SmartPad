---
title: "Privacy and Portability"
sidebar_position: 5
description: "Understand SmartPad’s local-first storage model and plain-text portability."
---

# Privacy and Portability

SmartPad is designed so your work remains yours:

- **Local-first persistence**: sheets are stored in your browser via IndexedDB.
- **No proprietary lock-in format**: content remains plain Markdown text.
- **Import/export flexibility**: individual `.md` download plus bulk zip workflows.
- **Recoverability**: trash/restore flows prevent accidental hard deletion.
- **No hidden sheet telemetry**: the app does not send sheet text, calculations, variables, or imported files to a SmartPad backend.

## Durability model

1. Typing is autosaved after idle debounce (default spec target: 1500ms).
2. Multi-tab synchronization uses broadcast events to prevent stale tab overwrite.
3. Sheet identity is stable even when titles change.
4. Browser storage durability depends on the browser profile, device, and storage cleanup settings.

## Website signup and analytics

SmartPad can have a public website, docs, and update signup separate from the app itself.

- Signing up for updates should not be required to use the app.
- Website analytics, if enabled, should measure website usage only.
- Website analytics must not collect sheet content, calculation text, imported files, or local sheet metadata.
- Any signup provider or analytics provider should be documented on the launch website before it is enabled.

## Currency and external rates

Currency conversion may use external FX providers and cached data:

- Fiat and crypto rate availability depends on provider uptime and network access.
- When offline or unavailable, SmartPad can use cached rates when present.
- FX rates are useful for planning, but they are not guaranteed market quotes.
- Do not use SmartPad FX output as financial, tax, legal, or investment advice.

## Desktop beta status

The desktop app is planned as a beta distribution path, not a current launch guarantee.

- Web launch remains the primary distribution path until packaged builds exist.
- Early desktop builds may be unsigned and may show operating-system warnings.
- Desktop release notes should state which platforms were actually built and smoke-tested.

## What to do before sharing publicly

- Export a `.md` copy of critical sheets.
- Use `Download All` before browser/profile migrations.
- Confirm sensitive notes are removed from examples before posting screenshots.

## Future-proofing checklist

- Keep important models in descriptive Markdown headings.
- Prefer explicit units/currencies so values retain meaning outside SmartPad UI.
- Store long-term archives as exported `.md` files in your own versioned storage.

## When to ask for help

Use [Support](../support) for wrong calculations, storage/import/export problems, settings bugs, docs errors, or launch beta feedback.

## Related deep contract

- [File Management](../../specs/file-management)
