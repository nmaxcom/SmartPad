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
| T-2026-02-13-06 | project | Fix docs-link behavior in local dev and production parity | Assistant | done | p1 | 2026-02-14 | Header now uses normalized base-path URL to `docs/index.html` with unit coverage |
| T-2026-02-14-01 | project | Fix docs UI polish and visual bugs to professional quality | Assistant | todo | p0 | 2026-02-16 | Apply structured docs design system pass (typography, spacing, cards, code blocks, mobile nav) |
| T-2026-02-14-02 | project | Implement docs information architecture with landing + feature pages | Assistant | todo | p0 | 2026-02-16 | Split generated single page into organized sections/pages with persistent sidebar nav |
| T-2026-02-14-03 | project | Add docs UX quality gates (responsive, accessibility, broken links, visual smoke) | Assistant | todo | p1 | 2026-02-16 | Add automated checks and manual checklist for docs release readiness |
| T-2026-02-14-04 | project | Evaluate and prototype ready-made docs framework migration | Assistant | todo | p0 | 2026-02-15 | Build short spike comparing Docusaurus/Nextra/Fumadocs on SmartPad content and deploy path |
| T-2026-02-14-05 | project | Backfill missing runnable examples and edge cases in all specs surfaced on docs site | Assistant | in_progress | p0 | 2026-02-16 | Fill placeholders with positive + edge-case examples for each feature page |
