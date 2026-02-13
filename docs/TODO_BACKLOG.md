# SmartPad Todo Backlog

## Active Lane
`project`

## Items
| id | lane | scope | owner | status | priority | due | next |
|---|---|---|---|---|---|---|---|
| T-2026-02-12-01 | project | Build docs site linked from app | Assistant | done | p1 | 2026-02-13 | Docs page and header link delivered |
| T-2026-02-12-02 | project | Populate complete feature reference docs | Assistant | done | p1 | 2026-02-14 | Generated `public/docs/index.html` from all specs via pipeline |
| T-2026-02-12-03 | maintenance | Strengthen regression testing gates | Assistant | done | p0 | 2026-02-13 | CI now runs docs/spec/test sync checks |
| T-2026-02-13-01 | project | Add docs sections for every spec file | Assistant | done | p1 | 2026-02-15 | Auto-rendered per-spec coverage sections from `docs/Specs/*.spec.md` |
| T-2026-02-13-02 | project | Add examples catalog with runnable snippets | Assistant | in_progress | p1 | 2026-02-15 | Backfill missing fenced examples in specs that currently show placeholders |
| T-2026-02-13-03 | maintenance | Add PR template checks for spec/docs/test sync | Assistant | todo | p1 | 2026-02-15 | Add checklist fields to pull request template |
| T-2026-02-13-04 | project | Decide docs engine and architecture (Docusaurus vs static) | Assistant | done | p0 | 2026-02-14 | Decision memo added with static-now path and Docusaurus migration trigger |
| T-2026-02-13-05 | project | Implement generated docs pipeline for web output | Assistant | done | p0 | 2026-02-15 | Added `npm run docs:web:build` to generate `public/docs/index.html` |
| T-2026-02-13-06 | project | Fix docs-link behavior in local dev and production parity | Assistant | todo | p1 | 2026-02-14 | Add env-aware docs URL or direct hosted docs fallback |
