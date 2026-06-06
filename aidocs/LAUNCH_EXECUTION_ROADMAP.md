# SmartPad Launch Execution Roadmap

## Purpose

This is the single execution view for the SmartPad launch thread. It orders the launch work across product polish, stability, public website, docs/support, desktop beta, release operations, and post-launch development.

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
2. **Public website/docs/support launch**
3. **Desktop beta after product first-run polish is stable**
4. **Continuous post-launch feature/reliability loop**

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

Status: next implementation priority.

Primary task:

- `T-2026-06-06-03`

Why first:

- It blocks screenshots, homepage assets, desktop wrapper QA, and first-user credibility.

Inputs:

- `aidocs/SETTINGS_ONBOARDING_LAUNCH_BRIEF.md`
- Existing settings and quick-tour tests.

Actions:

1. Reorganize settings around user intent.
2. Make advanced controls visually subordinate.
3. Add lightweight first-run guidance without blocking typing.
4. Verify settings persistence/reset/date locale/reuse controls.
5. Capture first-run and settings screenshots after implementation.

Exit criteria:

- Targeted settings/quick-tour tests pass.
- Build and relevant docs/spec gates pass.
- Desktop/mobile screenshots are reviewed.

## Phase 2: Launch Stability Candidate

Status: checklist drafted, not executed.

Primary task:

- `T-2026-06-06-02`

Inputs:

- `aidocs/LAUNCH_STABILITY_AUDIT.md`

Actions:

1. Run P0 release-candidate checks from the audit.
2. Convert failures into scoped bug tasks.
3. Resolve or explicitly document p0 limitations.
4. Keep user-visible completion gate open until visible behavior is reviewed.

Exit criteria:

- No unresolved p0 stability blocker.
- Release-candidate checks and gates pass for touched behavior.

## Phase 3: Public Docs And Support

Status: first public docs/support pass patched; pending user review, homepage links, and journey verification.

Primary task:

- `T-2026-06-06-07`

Inputs:

- `aidocs/DOCS_SUPPORT_LAUNCH_AUDIT.md`

Completed so far:

1. Add Known Limitations page.
2. Add Support page or support section.
3. Expand Privacy and Portability with FX, signup/analytics, and desktop beta status.

Remaining actions:

1. Review public docs/support wording with the user.
2. Link support, known limitations, and privacy pages from the future launch homepage.
3. Add or update journey verification after homepage exists.
4. Keep local docs generated with `/docs/` base URL; use `/SmartPad/docs/` only for production deploy builds.

Exit criteria:

- Public docs expose limitations, support, privacy, and beginner journey.
- Docs build/drift/spec gates pass.

## Phase 4: Web Launch Site And Assets

Status: brief drafted, implementation missing.

Primary tasks:

- `T-2026-06-06-04`
- `T-2026-06-06-08`

Inputs:

- `aidocs/WEB_LAUNCH_BRIEF.md`
- Product screenshots from Phase 1 and Phase 2.

Actions:

1. Decide signup provider or link-out path.
2. Build Docusaurus-first launch homepage unless constrained.
3. Add real screenshots/video from verified build.
4. Add Open Graph metadata and launch assets.
5. Verify homepage CTAs, docs/app/support/release links, responsive layout, and privacy copy.

Exit criteria:

- Homepage builds and deploy path is verified.
- Signup/update path works or is intentionally link-out.
- Assets render correctly at desktop/mobile widths.
- App remains free of hidden telemetry.

## Phase 5: Release Candidate Dry Run

Status: checklist exists, no dry run yet.

Primary task:

- `T-2026-06-06-06`

Inputs:

- `RELEASE_CHECKLIST.md`
- `CHANGELOG.md`
- Phase 1-4 verification results.

Actions:

1. Update changelog for release candidate.
2. Run checklist commands.
3. Confirm Pages build/deploy path.
4. Confirm public app/docs/homepage/support/signup links.
5. Record known limitations.

Exit criteria:

- Release checklist can be followed without relying on memory.
- Changelog and release notes are current.
- Candidate can be tagged or explicitly held with reasons.

## Phase 6: Desktop Beta

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
2. Implement settings/onboarding polish.
3. Run launch stability checks.
4. Patch docs/support/known limitations.
5. Build homepage and capture assets.
6. Dry-run release checklist.
7. Implement desktop beta shell.

## Current Blockers

P0:

- Launch scope lacks explicit user confirmation.
- Settings/onboarding polish is not implemented.
- Launch stability checks have not been executed.
- Homepage/signup/assets are not implemented.
- Desktop packaging is not implemented.

P1:

- Release checklist has not been dry-run.
- Support/known limitations/privacy docs need user review and homepage links.
- Signup/analytics policy is documented as not wired yet; final provider decision is still pending.
- Autocomplete remains pending user confirmation/spec-status reconciliation before headline use.

## What Not To Do Yet

- Do not capture final marketing screenshots before settings/onboarding polish.
- Do not promise desktop downloads before an artifact exists.
- Do not add hidden app telemetry.
- Do not market proposed features as shipped.
- Do not start cloud sync/accounts/collaboration for this launch path.
