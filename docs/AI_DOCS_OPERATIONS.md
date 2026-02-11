# AI Docs Operations Guide

## Goal
Keep SmartPad documentation continuously accurate using AI-only maintenance (no human ownership model).

## Command Triggers (what you can tell the assistant)
- "Run docs review now"
- "Run docs drift check"
- "Refresh docs from spec"
- "Prepare docs update plan"
- "What docs are pending?"

When these commands are used, the assistant should execute the matching workflow below and update `docs/EXECUTIVE_JOURNAL.md`.

## Workflows

### 1) Docs Review Workflow
Use when asked to review current docs health.

Steps:
1. Run `npm run docs:review`.
2. Summarize:
   - changed spec/code files
   - changed docs files
   - likely documentation gaps
3. Propose concrete doc edits.
4. Update pending tasks in the executive journal.

### 2) Docs Drift Check Workflow
Use when asked to verify spec-doc alignment.

Steps:
1. Run `npm run docs:drift`.
2. If it fails:
   - report exactly which mapped groups are out of sync
   - create a docs update task list
3. If it passes:
   - report no critical drift detected
4. Record result in the executive journal.

### 3) Refresh Docs from Spec Workflow
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
- Executive memory and pending tasks: `docs/EXECUTIVE_JOURNAL.md`
- Assistant operating rules: `docs/AI_EXECUTIVE_ASSISTANT_MANUAL.md`

## Standards for Every Docs Update
- Use exact feature names used in the app.
- Include at least one positive and one edge-case example.
- Note behavior changes with dates.
- Keep language user-facing and concrete.
