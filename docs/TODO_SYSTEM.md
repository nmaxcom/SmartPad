# SmartPad Todo System

## Goal
Keep todos organized by level without mixing contexts.

## Single Backlog, Multiple Lanes
Use one registry file: `docs/TODO_BACKLOG.md`.
Each item belongs to one lane:
- `feature`: current major implementation and validation
- `project`: docs, website, community, release operations
- `experiment`: ideas and prototypes
- `maintenance`: bugs, regression hardening, refactors

## Focus Rule
At any moment, one lane is active.

Default active lane:
- `feature`

The assistant should:
1. report only active lane items by default
2. keep other lanes silent unless asked
3. surface cross-lane blockers when they impact active work

## Item Template
Every todo item should include:
- `id`: stable id, e.g. `T-2026-02-12-01`
- `lane`: feature | project | experiment | maintenance
- `scope`: short title
- `owner`: User | Assistant
- `status`: todo | in_progress | blocked | done
- `priority`: p0 | p1 | p2 | p3
- `due`: YYYY-MM-DD or TBD
- `next`: immediate next action

## Commands You Can Use
- "focus on feature todos"
- "focus on project todos"
- "show pending in active lane"
- "show all pending across lanes"
- "move this item to maintenance lane"

## Review Cadence
No automatic schedule is required.
Reviews are user-triggered by command.
