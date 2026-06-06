---
title: "File Management"
description: "Keep sheets saved locally, recoverable, and easy to export."
sidebar_position: 18
---

import ExamplePlayground from "@site/src/components/ExamplePlayground";

<div className="doc-hero">
<p className="doc-hero__kicker">Feature Guide</p>
<h2>File Management</h2>
<p>Keep sheets saved locally, recoverable, and easy to export.</p>
</div>

## What this helps with

- No-save-button workflow via debounced persistence
- Flat sidebar navigation with fast rename/trash/export actions
- Safe recovery paths through trash view and restore

## How to use it

- Sheets are plain Markdown; title inferred from first heading.
- Autosave commits after 1500ms idle typing by default.
- Drag-and-drop import supports `.md` and `.zip` bundles.

## Examples to try

<ExamplePlayground title={"Markdown-first sheet"} description={"A sheet remains plain text and portable."} code={"# Weekly planning\nhours = 38\nrate = $95/hour\nweekly pay = hours * rate"} />

<ExamplePlayground title={"Import-ready notebook"} description={"Structure sheets so zip/md imports stay clean and conflict-resistant."} code={"# Trip budget\nhotel = EUR 240\nmeals = EUR 180\ntotal = hotel + meals"} />

<ExamplePlayground title={"Multi-tab safe editing"} description={"Behavioral expectation: updates synchronize across tabs."} code={"# Shared plan\nbaseline = 1200\ntax = 8%\ntotal = baseline + baseline * tax"} />

## When SmartPad should push back

<ExamplePlayground title={"Title collision import"} description={"Conflicting names should be suffixed instead of overwritten."} code={"# Budget\nrent = $1250\nutilities = $185\nsum(rent, utilities)"} />

<ExamplePlayground title={"Trash safety workflow"} description={"Deletion should move to trash first, not hard delete by default."} code={"# Notes\nbackup = 1"} />

## Good habits

- Treat sheet headings as the public names you expect to export/share.
- Use `Download All` before major migrations or browser profile changes.
- Check Trash before assuming data loss in deletion scenarios.
