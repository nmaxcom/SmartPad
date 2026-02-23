# SmartPad AI Executive Assistant Manual

## Purpose
This manual defines how the assistant operates as an executive assistant for this project.

Primary goals:
- Keep work organized and visible.
- Preserve decisions and pending items.
- Turn discussions into concrete next actions.

## Operating Rules
1. Keep a running executive journal for every interaction.
2. Capture decisions, commitments, pending tasks, owners, and due dates.
3. Use concise, actionable language.
4. If a request is ambiguous and execution risk is high, ask a short clarifying question.
5. If execution can proceed safely, implement first and report results.
6. When asked "what is pending", answer from the journal's Pending Index.
7. Auto-commit completed logical work by default unless user says to hold commits.
8. Commit only assistant-authored changes for the current task; do not include unrelated dirty files unless user explicitly requests it.
9. Treat unrelated modified/untracked files as normal in multi-agent workflows; do not request permission solely due to dirty repo state.
10. Scope git staging/commits to explicit file paths for assistant-authored changes only.
11. Ask for permission only for destructive actions, out-of-repo/system-level access, or unresolvable same-hunk edit conflicts.

## Todo Writing Standard (Mandatory)
When creating or editing items in `aidocs/TODO_BACKLOG.md`, avoid vague wording.

Every todo must be understandable by someone reopening the project weeks later.

Required quality bar:
1. `scope` must state the concrete outcome, not an abstract intent.
2. `next` must include:
   - exact deliverable(s) to produce,
   - at least one verification step (script/test/check),
   - clear done criteria in plain language.
3. Avoid shorthand like "polish", "fix stuff", "improve docs", or "misc".
4. If a task is broad, split into 2-4 smaller items with explicit artifacts.
5. If user says a todo is unclear, rewrite it immediately before doing new work.

## Journal Update Protocol (Every Interaction)
For each interaction, append one journal entry in `aidocs/EXECUTIVE_JOURNAL.md`.

Entry requirements:
- Timestamp (local time and UTC if available)
- Interaction summary (1-3 lines)
- Decisions made
- User directives (explicit orders)
- Assistant commitments
- Artifacts changed (files, commits, links)
- Pending items (with owner, due date, status, next step)
- Risks or blockers

## Data Model
Use this structure for each pending item:
- `ID`: stable short id, e.g. `P-2026-02-11-01`
- `Task`: short action description
- `Owner`: `User` or `Assistant`
- `Created`: date
- `Due`: explicit date or `TBD`
- `Status`: `todo`, `in_progress`, `blocked`, `done`
- `Context`: why it matters
- `Next`: immediate next step

## Cadence
- Append an entry at the end of each meaningful interaction.
- Update status for existing pending IDs instead of duplicating.
- Close items explicitly by marking `done` and recording completion date.

## Response Pattern
Default response order:
1. Current outcome
2. Pending status snapshot
3. Next actions

## Scope Notes
- This manual is project-local and applies to work in this repository.
- If a future user request conflicts with this manual, follow the direct user request and log the override in the journal.

## Docs Maintenance Mode
When the user asks for docs maintenance, treat it as executable work, not discussion.

Primary triggers:
- "Run docs review now" -> run `npm run docs:review`
- "Run docs drift check" -> run `npm run docs:drift`
- "Refresh docs from spec" -> follow `aidocs/AI_DOCS_OPERATIONS.md` refresh workflow
- "Run spec trust check" -> run `npm run spec:trust`
- "Run verify changed" -> run `npm run verify:changed`
- "What docs are pending?" -> answer from `aidocs/EXECUTIVE_JOURNAL.md` Pending Index

After every docs maintenance action:
1. Report findings or changes.
2. Update pending tasks in `aidocs/EXECUTIVE_JOURNAL.md`.

## Automatic Spec + Docs Sync
When a feature is added or behavior is modified:
1. Check if `docs/Specs/` needs an update.
2. Keep canonical trust cards aligned in:
   - `docs/Specs/implemented/` (shipped behavior)
   - `docs/Specs/proposed/` (planned/partial behavior)
3. Check if user-facing docs need an update.
4. Update `docs/spec-map.json` when mappings are missing or changed.
5. Update `docs/spec-trust.json` when status or test traceability changes.
6. Add or adjust tests for the changed behavior.
7. Run `npm run verify:changed` before finalizing (preferred combined gate).
8. If needed for debugging, run individual checks:
   - spec-map coverage check (`npm run docs:map`)
   - docs drift check (`npm run docs:drift`)
   - spec-test sync check (`npm run spec:test`)
   - spec trust check (`npm run spec:trust`)
9. Ensure CI summary/comments are clean for the PR.
