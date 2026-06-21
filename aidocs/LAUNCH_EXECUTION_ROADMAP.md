# SmartPad Launch Execution Roadmap

## Purpose

This is the single execution view for the SmartPad launch thread. It orders the launch work across product polish, stability, docs/support, desktop beta, release operations, a final standalone promotional website, and post-launch development.

Detailed source artifacts:

- Scope: `aidocs/LAUNCH_SCOPE_MATRIX.md`
- Stability: `aidocs/LAUNCH_STABILITY_AUDIT.md`
- Settings/onboarding: `aidocs/SETTINGS_ONBOARDING_LAUNCH_BRIEF.md`
- Web/homepage/assets/signup: `aidocs/WEB_LAUNCH_BRIEF.md`
- Docs/support: `aidocs/DOCS_SUPPORT_LAUNCH_AUDIT.md`
- Desktop: `aidocs/DESKTOP_PACKAGING_DECISION.md`
- Release operations: `RELEASE_CHECKLIST.md`, `CHANGELOG.md`

## Launch Strategy

Ship in this order:

1. **Web-first public launch candidate**
2. **Public docs/support and release operations**
3. **Desktop beta after product first-run polish is stable**
4. **Standalone promotional product website as the final launch step**
5. **Continuous post-launch feature/reliability loop**

The desktop beta is important, but it should not block the web-first launch unless the user explicitly decides that standalone apps are mandatory for day one.

## Phase 0: Confirm Scope

Status: ready for user confirmation, not complete.

Primary task:

- `T-2026-06-06-01`

Inputs:

- `aidocs/LAUNCH_PLAN.md`
- `aidocs/LAUNCH_SCOPE_MATRIX.md`

Actions:

1. Review `ready`, `audit`, `gap`, and `defer` rows with the user.
2. Confirm whether launch means:
   - web public beta first,
   - web plus desktop beta,
   - or desktop-ready public release.
3. Confirm that proposed features are not marketed as shipped behavior.

Exit criteria:

- User explicitly confirms scope.
- Any disagreement becomes a specific TODO.

## Phase 1: Product First-Run Polish

Status: accepted for launch-candidate work. Settings is approved; no additional visual onboarding will be added now.

Primary task:

- `T-2026-06-06-03`

Why first:

- It blocked screenshots, homepage assets, desktop wrapper QA, and first-user credibility. The user chose to avoid new onboarding UI and move to stability instead.

Inputs:

- `aidocs/SETTINGS_ONBOARDING_LAUNCH_BRIEF.md`
- Existing settings and quick-tour tests.

Actions:

1. Completed: Settings was reorganized into a professional app preferences surface with section navigation, responsive layout, and existing behavior preserved in commit `ed5511db`.
2. Completed: Settings desktop/mobile screenshots were reviewed and approved by the user.
3. Decision: do not add a new visual onboarding layer now; keep Quick Tour/template behavior as the first-run baseline.
4. Carry Quick Tour/template checks into the release-candidate stability pass.
5. Capture final launch screenshots after the release-candidate pass, not before.

Exit criteria:

- Settings approval is recorded.
- No new onboarding UI is pending.
- Quick Tour/template behavior is covered in the stability pass.

## Phase 2: Launch Stability Candidate

Status: partially executed. Core editor, live results, units/dates, result chips/references, lists/ranges, plotting, settings, autocomplete, docs IA, current sheets/persistence/import-export, FX failure visibility, and the production app/docs path now have green launch-candidate checks. Browser FX can ship through the browser-safe `fawazahmed0` fallback. Historical migration formats are not a launch-critical gate for this first public launch unless a concrete user data case appears.

Primary task:

- `T-2026-06-06-02`

Inputs:

- `aidocs/LAUNCH_STABILITY_AUDIT.md`

Actions:

1. Completed: Quick Tour, core expression/result units, temporary edge cases, basic editing, live-result, units/date, result-chip/reference, lists/ranges, plotting, settings, autocomplete, docs local build, and docs IA checks have been run and recorded in `aidocs/LAUNCH_STABILITY_AUDIT.md`.
2. Completed: replaced obsolete sheets/persistence coverage that targeted removed `.save-button` / `.load-button` UI with current sidebar, auto-persistence, download all, markdown import, zip import, trash, restore, and mobile drawer checks.
3. Keep live FX copy honest: SmartPad can offer live FX through the browser-safe `fawazahmed0` fallback, while Frankfurter and ECB are opportunistic because they currently fail browser CORS.
4. Treat the current export/import/persistence gate as sufficient for the first public launch; defer historical migration formats unless a concrete user data case appears.
5. Convert any remaining failures into scoped bug tasks.
6. Resolve or explicitly document p0 limitations.
7. Keep user-visible completion gate open until visible behavior is reviewed.

Exit criteria:

- No unresolved p0 stability blocker.
- Release-candidate checks and gates pass for touched behavior.

## Phase 3: Public Docs And Support

Status: public docs copy and IA are user-approved; pending future homepage links and end-to-end journey verification.

Primary task:

- `T-2026-06-06-07`

Inputs:

- `aidocs/DOCS_SUPPORT_LAUNCH_AUDIT.md`

Completed so far:

1. Reworked public docs into the approved user-facing IA: Start Here, First Sheet, Core Interactions, Everyday Examples, Syntax Reference, Files & Privacy, Troubleshooting, Support.
2. Removed public Feature Guides/spec pages from Docusaurus output.
3. Expanded Syntax Reference with lists, ranges, dates, `where`, `as %`, `make`, views, units, derived units, SI prefixes, and compound unit examples.
4. Added Support path and merged privacy, portability, backups, limitations, FX caveats, and current desktop status into Files & Privacy.
5. Added docs example validation so public `ExamplePlayground` snippets run through the SmartPad evaluator.

Remaining actions:

1. Link docs/support/privacy from the future launch homepage.
2. Add or update homepage -> docs -> app journey verification after homepage exists.
3. Keep local docs generated with `/docs/` base URL; use `/SmartPad/docs/` only for production deploy builds.

Exit criteria:

- Public docs expose limitations, support, privacy, and beginner journey.
- Docs build/drift/spec gates pass.

## Phase 4: Release Candidate Dry Run

Status: checklist exists; production app/docs path has been smoke-tested locally against the GitHub Pages base path, but no full release dry run has been done yet.

Primary task:

- `T-2026-06-06-06`

Inputs:

- `RELEASE_CHECKLIST.md`
- `CHANGELOG.md`
- Phase 1-3 verification results.

Actions:

1. Update changelog for release candidate.
2. Run checklist commands.
3. Confirm Pages build/deploy path against the real published URL after the next deploy.
4. Confirm public app/docs/support links.
5. Record known limitations.

Exit criteria:

- Release checklist can be followed without relying on memory.
- Changelog and release notes are current.
- Candidate can be tagged or explicitly held with reasons.

## Phase 5: Desktop Beta

Status: decision made, implementation missing.

Primary task:

- `T-2026-06-06-05`

Inputs:

- `aidocs/DESKTOP_PACKAGING_DECISION.md`
- Product polish and release candidate assets.

Actions:

1. Implement minimal Electron shell.
2. Load production Vite build from disk.
3. Verify storage, import/export, docs links, FX behavior, and settings persistence.
4. Produce unsigned macOS beta artifact first.
5. Document Windows/Linux artifact generation path.

Exit criteria:

- Packaged app launches and passes smoke checks.
- Unsigned warnings are documented.
- Website desktop CTA is accurate for actual artifact status.

## Phase 6: Standalone Promotional Product Website

Status: direction corrected; implementation intentionally last.

Primary tasks:

- `T-2026-06-06-04`
- `T-2026-06-06-08`

Inputs:

- `aidocs/WEB_LAUNCH_BRIEF.md`
- Finalized product UI from Phase 1.
- Verified launch candidate and desktop artifact status from Phases 4-5.

Actions:

1. Decide signup provider or link-out path.
2. Build a separate promotional product website from scratch; it must not be a Docusaurus page and must not share the docs IA.
3. Make the site aesthetically modern and product-led, with real videos using the app and interactive examples.
4. Add real screenshots/video from verified build.
5. Add Open Graph metadata and launch assets.
6. Verify CTAs, app/docs/support/download/signup links, responsive layout, privacy copy, and media loading.

Exit criteria:

- Promotional site builds and deploy path is verified.
- Signup/update path works or is intentionally link-out.
- Assets render correctly at desktop/mobile widths.
- App remains free of hidden telemetry.

## Phase 7: Continuous Development After Launch

Status: policy exists, operational discipline required.

Inputs:

- `RELEASE_CHECKLIST.md`
- `aidocs/AI_RELIABILITY_SYSTEM.md`
- `aidocs/TODO_BACKLOG.md`

Rules:

1. Keep launch lane in `project` until public launch is complete.
2. New features during launch hardening must strengthen the launch promise or move to post-launch.
3. Every behavior change updates specs/docs/tests as required.
4. Release candidates use `verify:changed`, targeted tests, build, and docs/spec gates.
5. Keep proposed features out of public launch copy unless marked roadmap.

## Current Critical Path

1. Confirm scope with user.
2. Finish launch stability checks with the current persistence/import/export gate accepted for launch; historical migration formats are deferred unless a concrete old-data case appears.
3. Dry-run release checklist.
4. Implement desktop beta shell.
5. Build standalone promotional website and capture final assets.
6. Link approved docs/support/privacy pages from the promotional site and verify the full journey.

## Current Blockers

P0:

- Launch scope lacks explicit user confirmation.
- Historical migration coverage is deferred unless a concrete old-data case appears.
- SmartPad-owned FX endpoint is not required for launch, but should be planned as future hardening if external provider reliability becomes a problem.
- Desktop packaging is not implemented.
- Standalone promotional website/signup/assets are not implemented and intentionally come last.

P1:

- Release checklist has not been dry-run.
- Docs/support/privacy pages are approved but still need eventual promotional-site links and homepage journey verification.
- Signup/analytics policy is documented as not wired yet; final provider decision is still pending.
- Autocomplete remains pending user confirmation/spec-status reconciliation before headline use.

## What Not To Do Yet

- Do not capture final marketing screenshots before the launch candidate is stable.
- Do not promise desktop downloads before an artifact exists.
- Do not add hidden app telemetry.
- Do not market proposed features as shipped.
- Do not start cloud sync/accounts/collaboration for this launch path.
