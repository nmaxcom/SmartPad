# SmartPad Launch Plan

## Goal

Publish SmartPad as a credible public product while preserving a healthy development loop for continued feature work.

Launch should prove three things:

1. A new user understands the product in less than one minute.
2. The app is stable enough for real notes, calculations, sheets, imports, exports, docs examples, and desktop use.
3. The project can keep shipping after launch without weakening specs, docs, tests, or user trust.

## Launch Positioning

### Product Promise

SmartPad is a local-first text calculation workspace for people who think in notes, variables, units, dates, and quick models.

The public launch should emphasize:

- Write calculations like notes, not spreadsheet formulas.
- See live answers while keeping the working context visible.
- Use variables, units, currencies, dates, ranges, lists, functions, plots, and sheets in one text surface.
- Keep work portable and understandable without account setup.

### Primary Audience

- Builders, engineers, analysts, freelancers, and technically curious users who frequently do back-of-the-envelope calculations.
- People who outgrow a normal calculator but do not want to open a spreadsheet for every scenario.
- Users who value local-first tools and transparent export/import.

### First Launch Channel

Start with a public web app plus a beta desktop build.

Reasoning:

- The web app gives the lowest-friction acquisition path.
- Desktop packaging is important for credibility, offline use, and retention, but it should not block validating the public message.
- A beta desktop label is acceptable if packaging, signing, auto-update, and cross-platform QA are still maturing.

## Scope Rules

Detailed scope evidence lives in `aidocs/LAUNCH_SCOPE_MATRIX.md`.

### Must Ship For Public Launch

- Stable editor typing, selection, paste, undo/redo, and sheet persistence.
- Live results and explicit `=>` results for core arithmetic, variables, percentages, units, currency literals, dates, ranges, lists, and functions.
- Result chips that support copying and deliberate reuse without surprising edits.
- Import/export for user-owned data with clear privacy expectations.
- Settings baseline that feels organized and explains riskier advanced controls.
- First-run content that demonstrates realistic workflows and does not break parser/runtime rules.
- Public docs with a beginner path, syntax guide, examples, troubleshooting, and privacy/portability notes.
- Marketing homepage with real screenshots or short clips, docs link, app link/download link, and update signup.
- Release checklist, changelog/versioning policy, and issue/bug intake.
- Machine gates green for changed launch work.

### Should Ship If Low Risk

- Desktop beta builds for macOS, Windows, and Linux.
- A polished app icon, Open Graph image, short demo video, and screenshot set.
- Privacy-respecting website analytics and subscriber event tracking.
- Searchable docs and one scripted beginner journey from homepage to a working app example.
- A compact in-app "what changed" or release notes link.

### Defer Until After Launch

- Accounts, cloud sync, collaboration, sharing backend, teams, billing, or hosted notebooks.
- Complex telemetry inside the app unless it is opt-in and documented.
- Marketplace/templates community features.
- Full plugin architecture.
- AI-assisted formula writing unless privacy, error handling, and positioning are clear.
- Advanced experimental syntax that lacks spec/test/docs coverage.

### Hide Or Soften Before Launch

- Internal debugging surfaces and console-only affordances unless explicitly framed as developer tools.
- Any setting that exposes implementation details without a user-facing explanation.
- Disabled features that look like broken promises.
- Proposed docs/spec pages that read like shipped behavior.
- Demo examples that depend on fragile parser edge cases or live external services.

## Priority Order

### P0. Launch Definition And Freeze Line

Owner: Assistant, with user confirmation.

Deliverables:

- Define exact launch promise, supported platforms, target audience, and launch date target or readiness milestone.
- Create a must/should/later/remove matrix for public-facing features.
- Map launch-critical features to implemented/proposed specs.
- Identify feature work allowed during launch hardening.

Done when:

- User confirms the launch scope.
- Every must-ship behavior has a spec, doc path, and validation plan.
- Non-launch experiments have a documented defer/hide decision.

### P0. Stability And Regression Audit

Owner: Assistant.

Core flows to audit:

- First load and quick tour.
- Typing/editing/paste/undo/redo.
- Live results and explicit trigger results.
- Variables, functions, units, currencies, dates, ranges, lists, plotting, and solve behavior.
- Result chip copy/insert/drag interactions.
- Sheet create/rename/delete/reorder/persist.
- Import/export and docs example import.
- Settings persistence and reset.
- Offline FX behavior and external-service failure messages.
- Mobile/narrow viewport usability.

Done when:

- All p0 blockers are fixed, tested, or explicitly documented as launch limitations.
- `npm run docs:map`, `npm run docs:drift`, `npm run spec:test`, `npm run spec:trust`, `npm run verify:changed`, targeted tests, and build checks are green for launch changes.

### P0. Product Polish: Settings, Onboarding, And UI

Owner: Assistant.

Deliverables:

- Settings IA grouped as appearance, calculation/output, locale/date, storage/privacy, panels, plotting, and advanced.
- Clear defaults and reset behavior.
- First-run onboarding that teaches the core loop without modal friction.
- Empty/error/offline states that sound intentional and actionable.
- Accessibility pass for labels, focus, keyboard use, contrast, and responsive layout.

Done when:

- A new user can open the app, understand the starter content, change key settings, and recover from common errors without reading source docs.
- Playwright first-run/settings checks and visual screenshots cover desktop and mobile widths.

### P0. Public Website And Signup

Owner: Assistant.

Deliverables:

- Homepage with positioning, use cases, screenshots/video, app link, docs link, download/beta area, privacy copy, and update signup.
- Real product screenshots captured from reproducible demo sheets.
- Lightweight signup flow: Buttondown, ConvertKit, Mailchimp, GitHub Discussions, or a static form backend. Decision should favor operational simplicity.
- SEO/Open Graph basics.

Done when:

- Homepage builds locally and deploys to the chosen public route.
- Links, responsive layout, screenshots, signup, and docs/app routing are verified.

### P0. Desktop Packaging

Owner: Assistant.

Recommended path:

- Start with Electron unless a short Tauri spike proves lower-risk for this repository.
- Use the existing Vite/React app as renderer.
- Keep local data, import/export, docs links, and offline behavior equivalent to web.
- Treat signing/notarization and auto-update as release operations, not invisible follow-ups.

Decision criteria:

- Build time and repo complexity.
- Cross-platform packaging reliability.
- File-system and deep-link needs.
- Signing/notarization path.
- Auto-update support.
- Bundle size and startup performance.

Done when:

- At minimum, a macOS local package launches and passes smoke checks.
- CI or documented release steps can produce Windows and Linux artifacts.
- Known unsigned-build warnings are documented for beta users.

### P1. Release Operations

Owner: Assistant.

Deliverables:

- `RELEASE_CHECKLIST.md` or equivalent.
- Versioning and changelog policy.
- Beta/stable channel rules.
- GitHub issue templates for bug reports and feature requests.
- Privacy/security notes.
- Rollback plan for website/app deployment.
- Release candidate checklist dry run.

Done when:

- A release candidate can be promoted by following the checklist without relying on memory.

### P1. Documentation And Support

Owner: Assistant.

Deliverables:

- Beginner docs journey: install/open, first calculation, variables, units, charts, sheets, import/export, troubleshooting.
- Public "known limitations" page for honest launch expectations.
- Support route: GitHub issues, email, discussions, or signup reply path.
- Docs accessibility and broken-link checks.

Done when:

- A scripted beginner journey can go from homepage to docs to a working SmartPad example.

### P1. Launch Assets And Measurement

Owner: Assistant.

Deliverables:

- App icon, favicon, screenshots, short demo clips, Open Graph card, download metadata.
- Privacy-respecting web analytics.
- Signup event tracking.
- Public statement of what is and is not tracked.

Done when:

- Website assets render correctly.
- Tracking boundaries are documented.
- App remains local-first without hidden telemetry.

## Continuous Development Model

### Work Lanes

- `project`: launch, docs, website, release operations, community.
- `maintenance`: stability, regression coverage, refactors, reliability.
- `feature`: product improvements approved for launch scope or explicitly post-launch.
- `experiment`: ideas that should not leak into launch messaging until proven.

### Feature Intake

Before adding a new feature during launch hardening, decide:

1. Does it strengthen the launch promise?
2. Can it be specified, tested, documented, and shipped without delaying p0 launch work?
3. If not, can it be hidden behind a proposed spec or experiment note?

Default rule: during launch hardening, fixes and polish outrank new capability.

### Release Gates

Every launch-impacting change should have:

- Spec status checked.
- User docs checked.
- Targeted tests added or updated.
- `npm run verify:changed` run when the diff is meaningful.
- Human review gate left open until the user confirms visible behavior.

### Public Trust Rules

- Be explicit about local-first storage.
- Avoid hidden in-app telemetry.
- Document external services, especially FX rate behavior and signup/analytics on the website.
- Keep import/export obvious so users understand portability.
- Separate shipped behavior from roadmap/speculation.

## Initial Execution Sequence

1. Draft and confirm launch scope matrix.
2. Run stability audit inventory and mark p0 blockers.
3. Finish current autocomplete/user-review item because it affects first impressions.
4. Redesign settings/onboarding baseline.
5. Build marketing homepage with real screenshots.
6. Decide Electron vs Tauri and produce first desktop spike.
7. Add release checklist and changelog/versioning rules.
8. Audit docs beginner journey and known limitations.
9. Capture launch assets and configure signup/analytics.
10. Run release candidate dry run.

## Open Decisions

- Public launch target: web-first beta, desktop beta, or both at once.
- Signup provider and whether it belongs on GitHub Pages or another host.
- Electron vs Tauri after one focused packaging spike.
- Whether to rename/reposition any advanced feature before launch.
- Whether desktop auto-update is required for v1 public launch or can wait for beta 2.
- What support path should be promised publicly.
