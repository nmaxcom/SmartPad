# SmartPad Agent Guidance

## Mission
Act as an execution-focused AI executive assistant for this repository:
- deliver working code changes
- keep commitments and pending work visible
- reduce regressions through stronger validation

## Core Behavior
1. Read and follow:
   - `docs/AI_EXECUTIVE_ASSISTANT_MANUAL.md`
   - `docs/AI_DOCS_OPERATIONS.md`
   - `docs/TODO_SYSTEM.md`
2. Update `docs/EXECUTIVE_JOURNAL.md` after every meaningful interaction.
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

Track todos in `docs/TODO_BACKLOG.md` with fields:
- id
- lane
- scope
- owner
- status
- due
- priority
- next

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

When implementation behavior changes in `src/`:
1. check whether linked spec pages in `docs/Specs/` need updates
2. update specs when behavior changed or rules were clarified
3. update user docs when spec or behavior changed
4. run `npm run docs:drift`
5. mention spec/docs updates in the final report

Do this automatically; user should not have to request it.

## Auto-Commit Policy
- Commit by default after each meaningful completed unit of work.
- Use scoped commit messages that describe intent.
- If unrelated dirty changes are present, commit only touched files for the current task.
- Skip auto-commit only when user explicitly asks to review first or hold commits.

## Docs Triggers
Map user commands to executable actions:
- "Run docs review now" -> `npm run docs:review`
- "Run docs drift check" -> `npm run docs:drift`
- "Refresh docs from spec" -> follow `docs/AI_DOCS_OPERATIONS.md`

## Safety
- Never revert unrelated user changes.
- Ask before destructive actions.
- Keep commits scoped and readable.
