# AI Docs Operations Guide

## Goal
Keep SmartPad documentation continuously accurate using AI-only maintenance (no human ownership model).

## Command Triggers (what you can tell the assistant)
- "Run docs review now"
- "Run docs drift check"
- "Refresh docs from spec"
- "Run verify changed"
- "Prepare docs update plan"
- "What docs are pending?"

When these commands are used, the assistant should execute the matching workflow below and update `aidocs/EXECUTIVE_JOURNAL.md`.

## Workflows

### 0) Automatic Change-Sync Workflow (default)
Run this whenever code behavior changes, even if user did not explicitly ask for docs.

Steps:
1. Identify impacted feature groups from `docs/spec-map.json`.
2. Update `docs/spec-map.json` if new files/areas are introduced or mapping changed.
3. Update `docs/Specs/` when behavior/rules changed.
4. Update user docs for changed feature behavior.
5. Run `npm run verify:changed` (primary gate).
6. If verify fails, use sub-checks for diagnosis:
   - `npm run docs:map`
   - `npm run docs:drift`
   - `npm run spec:test`
7. Record updates in `aidocs/EXECUTIVE_JOURNAL.md`.

### 1) Verify Changed Workflow (new default CI-compatible gate)
Use when asked to validate a change set end-to-end.

Steps:
1. Run `npm run verify:changed -- <diff-range>` when a range is known, or `npm run verify:changed` locally.
2. Review impacted groups and missing artifact hints from the summary.
3. Fix missing docs/spec/tests/build issues and rerun until passing.
4. In CI, ensure the PR summary/comment output is clean (no failed checks).

### 2) Docs Review Workflow
Use when asked to review current docs health.

Steps:
1. Run `npm run docs:review`.
2. Summarize:
   - changed spec/code files
   - changed docs files
   - likely documentation gaps
3. Propose concrete doc edits.
4. Update pending tasks in the executive journal.

### 3) Docs Drift Check Workflow
Use when asked to verify spec-doc alignment.

Steps:
1. Run `npm run docs:drift`.
2. If it fails:
   - report exactly which mapped groups are out of sync
   - create a docs update task list
3. If it passes:
   - report no critical drift detected
4. Record result in the executive journal.

### 4) Refresh Docs from Spec Workflow
Use when asked to perform an actual docs update.

Steps:
1. Run `npm run docs:review`.
2. Open impacted spec files and linked docs pages from `docs/spec-map.json`.
3. Patch docs with:
   - behavior summary
   - syntax and edge cases
   - at least one runnable example
4. Run `npm run docs:drift` again.
5. Log outcome and remaining follow-ups in the executive journal.

## Source of Truth
- Spec mapping file: `docs/spec-map.json`
- Executive memory and pending tasks: `aidocs/EXECUTIVE_JOURNAL.md`
- Assistant operating rules: `aidocs/AI_EXECUTIVE_ASSISTANT_MANUAL.md`
- Reliability enforcement workflow: `aidocs/AI_RELIABILITY_SYSTEM.md`

## Standards for Every Docs Update
- Use exact feature names used in the app.
- Include at least one positive and one edge-case example.
- Note behavior changes with dates.
- Keep language user-facing and concrete.
