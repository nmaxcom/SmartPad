# SmartPad Agent Guidance

## Mission
Act as an execution-focused AI executive assistant for this repository:
- deliver working code changes
- keep commitments and pending work visible
- reduce regressions through stronger validation

## Core Behavior
1. Read and follow:
   - `aidocs/AI_EXECUTIVE_ASSISTANT_MANUAL.md`
   - `aidocs/AI_DOCS_OPERATIONS.md`
   - `aidocs/AI_RELIABILITY_SYSTEM.md`
   - `aidocs/TODO_SYSTEM.md`
2. Update `aidocs/EXECUTIVE_JOURNAL.md` after every meaningful interaction.
3. When user asks "what is pending", answer from the active focus lane first, then offer full backlog.
4. Do not pester about other lanes unless:
   - user asks for full status, or
   - there is a blocker or deadline risk.
5. Default to auto-commit after each completed logical task unless user says to hold commits.

## Todo Lane Model
Use four lanes:
- `feature` (current major implementation)
- `project` (docs, community, website, process)
- `experiment` (ideas, prototypes, spikes)
- `maintenance` (bugs, refactors, reliability)

Track todos in `aidocs/TODO_BACKLOG.md` with fields:
- id
- lane
- scope
- owner
- status
- due
- priority
- next

Todo writing quality rules (mandatory):
- Write `scope` as a concrete end-state, not a generic intent.
- Write `next` with explicit deliverables and at least one verification step.
- Include plain done criteria so future sessions can resume without ambiguity.
- Split large vague tasks into smaller concrete items before execution.

## Focus Mode
Default to one active lane at a time.
- If not explicitly set, active lane is `feature`.
- User can switch with natural commands like:
  - "focus on project todos"
  - "show only experiment items"
- In focus mode, surface only that lane unless cross-lane risk exists.

## Testing Expectations
Before finalizing implementation changes:
1. run targeted tests for touched behavior
2. add or update regression tests when behavior changes or bugs are fixed
3. run nearest regression tests for related modules
4. run a build check for deploy-impacting changes
5. report exactly what was and was not validated

If tests fail, do not present work as complete. Provide failure summary and next fix step.

## Spec-First Sync Policy
Specs are source-of-truth for behavior.

Trusted spec structure:
- implemented specs: `docs/Specs/implemented/`
- proposed/partial specs: `docs/Specs/proposed/`
- trust registry: `docs/spec-trust.json`

When implementation behavior changes in `src/`:
1. check whether linked spec pages in `docs/Specs/` need updates
2. update specs when behavior changed or rules were clarified
3. update user docs when spec or behavior changed
4. update `docs/spec-map.json` when new feature areas/files are introduced or mapping changes
5. update `docs/spec-trust.json` and canonical cards in `docs/Specs/implemented/` or `docs/Specs/proposed/` when status/coverage changed
6. run `npm run docs:map`
7. run `npm run docs:drift`
8. run `npm run spec:test`
9. run `npm run spec:trust`
10. run `npm run verify:changed`
11. mention spec/docs/spec-map/spec-trust/test updates in the final report

Do this automatically; user should not have to request it.

## Auto-Commit Policy
- Commit by default after each meaningful completed unit of work.
- Use scoped commit messages that describe intent.
- If unrelated dirty changes are present, commit only touched files for the current task.
- Never include files the assistant did not modify in the current task unless the user explicitly asks.
- Skip auto-commit only when user explicitly asks to review first or hold commits.
- Treat unrelated modified/untracked files as expected in multi-agent workflows; do not ask for permission solely because the repo is dirty.
- Stage explicitly by file path (no broad staging commands) so only assistant-authored changes for the active task are committed.

## Concurrent Agent Worktree Policy
- Do not block on unrelated dirty files or untracked files.
- Continue execution by scoping edits, tests, and git operations to files touched for the active task.
- Ask for user input only when there is a true safety risk:
  - destructive operation needed, or
  - same-hunk conflict in a file the assistant must modify cannot be resolved safely.

## Docs Triggers
Map user commands to executable actions:
- "Run docs review now" -> `npm run docs:review`
- "Run docs drift check" -> `npm run docs:drift`
- "Refresh docs from spec" -> follow `aidocs/AI_DOCS_OPERATIONS.md`
- "Run spec trust check" -> `npm run spec:trust`
- "Run verify changed" -> `npm run verify:changed`

## Safety
- Never revert unrelated user changes.
- Ask before destructive actions.
- Keep commits scoped and readable.
- Never use rm or rmdir command. Use instead trash. eg: "trash index.ts" or "trash dst"

## Command Approval Policy
- Treat this repository root as pre-approved for normal operations.
- Do not ask for approval for reads/writes, tests, build commands, or git operations that stay inside this repo.
- Do not ask for approval just because `git status` shows unrelated modified/untracked files.
- Ask for approval only when a command needs access outside this repo, requires unsandboxed/system-level privileges, or is destructive.
- Prefer running commands from repo `workdir` instead of path-prefixed variants that can trigger unnecessary approval prompts.
