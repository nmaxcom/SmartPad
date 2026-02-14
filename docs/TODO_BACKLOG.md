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
| T-2026-02-13-02 | project | Replace every docs-site placeholder with real runnable examples from specs | Assistant | in_progress | p1 | 2026-02-15 | For each feature section rendered on the docs site, add at least 1 positive and 1 edge-case fenced block and re-run `npm run docs:web:build` |
| T-2026-02-13-03 | maintenance | Add PR template checks for spec/docs/test sync | Assistant | todo | p1 | 2026-02-15 | Add checklist fields to pull request template |
| T-2026-02-13-04 | project | Decide docs engine and architecture (Docusaurus vs static) | Assistant | done | p0 | 2026-02-14 | Decision memo added with static-now path and Docusaurus migration trigger |
| T-2026-02-13-05 | project | Implement generated docs pipeline for web output | Assistant | done | p0 | 2026-02-15 | Added `npm run docs:web:build` to generate `public/docs/index.html` |
| T-2026-02-13-06 | project | Fix docs-link behavior in local dev and production parity | Assistant | done | p1 | 2026-02-14 | Header now uses normalized base-path URL to `docs/index.html` with unit coverage |
| T-2026-02-14-01 | project | Ship professional docs UI baseline (desktop + mobile) without manual bug triage | Assistant | in_progress | p0 | 2026-02-16 | Docusaurus baseline is live in `public/docs/`; next apply SmartPad brand polish pass and resolve remaining visual rough edges |
| T-2026-02-14-02 | project | Rebuild docs IA into clear user journeys (Start, Syntax, Features, Troubleshooting) | Assistant | todo | p0 | 2026-02-16 | Deliver a docs structure with landing page + category pages + per-feature pages and persistent left nav so users can find topics in <=3 clicks |
| T-2026-02-14-03 | project | Add docs release quality gate so UI/UX regressions are caught before merge | Assistant | todo | p1 | 2026-02-16 | Enforce checks for broken links, mobile layout sanity, accessibility basics, and docs build success in CI + local workflow |
| T-2026-02-14-04 | project | Migrate docs delivery from hand-styled static page to Docusaurus | Assistant | done | p0 | 2026-02-15 | Implemented `website/` Docusaurus app + spec generator + build sync to `public/docs/`; docs button target now resolves Docusaurus output |
| T-2026-02-14-05 | project | Complete docs content backfill so every public page has practical examples | Assistant | in_progress | p0 | 2026-02-16 | For every docs page, include at least one copy-paste-ready happy-path example and one edge-case/error example with expected output |
