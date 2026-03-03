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

## Durability model

1. Typing is autosaved after idle debounce (default spec target: 1500ms).
2. Multi-tab synchronization uses broadcast events to prevent stale tab overwrite.
3. Sheet identity is stable even when titles change.

## What to do before sharing publicly

- Export a `.md` copy of critical sheets.
- Use `Download All` before browser/profile migrations.
- Confirm sensitive notes are removed from examples before posting screenshots.

## Future-proofing checklist

- Keep important models in descriptive Markdown headings.
- Prefer explicit units/currencies so values retain meaning outside SmartPad UI.
- Store long-term archives as exported `.md` files in your own versioned storage.

## Related deep contract

- [File Management](../../specs/file-management)
