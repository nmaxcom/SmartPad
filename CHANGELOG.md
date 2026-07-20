# Changelog

All notable user-facing changes to SmartPad will be documented in this file.

SmartPad uses semantic versioning. Pre-release builds use `-beta.N` or `-rc.N` suffixes.

## 1.0.0-rc.13 - 2026-07-20

### Fixed

- Result `⋯` menus now accept actions with multiple CSS hooks without throwing a
  `DOMTokenList` error, so `Explore result` opens reliably after the unified explorer update.

## 1.0.0-rc.12 - 2026-07-20

### Added

- Eligible named results now open one inline `Explore result` surface with the live value, source
  formula, root assumptions, mini response curves, and deterministic strongest-driver and sampled
  break-even insights.
- Assumption values inside the explorer can be dragged horizontally to rewrite their visible source
  assignment while every dependent result and plot updates live.
- `Ask in plain language…` locally compiles supported Spanish/English plot, target, conversion, and
  set requests into visible, editable, parser-validated SmartPad syntax before insertion.
- A connected plot's highlighted live point can be dragged horizontally to update its existing X
  assignment, with a live value chip, subtle always-visible discovery hint, and `Escape`
  cancellation. Derived series are sampled through their full formula dependency chain.

### Changed

- Scrubbable numeric literals now use a discreet dotted underline, horizontal cursor, contextual
  title, and one-time hover hint so new users can discover horizontal dragging.
- Result exploration replaces the isolated `See what matters most` tornado entry; automatic probes
  remain non-mutating while explicit gestures always edit ordinary sheet text.
- Editor surfaces are kept horizontally aligned after result-menu focus changes so inline controls
  cannot slide beneath the sheet navigation panel.

## 1.0.0-rc.11 - 2026-07-19

### Added

- Goal Seek accepts visible inclusive bounds such as
  `make profit = 7000 EUR by price with 40 EUR <= price <= 80 EUR =>`.
- One-sided `>=` / `<=` clauses, compatible currency/unit bounds, and time-duration limits are
  supported.
- Numeric result menus expose `Find <input> within limits…`, which inserts editable starting
  limits around the current input directly in the sheet.

### Changed

- A bounded Goal Seek returns the exact solution when feasible and explains whether the required
  value falls below the minimum or above the maximum. Answers are never silently clamped.

## 1.0.0-rc.10 - 2026-07-19

### Added

- Named numeric results now expose `See what matters most` in their existing actions menu.
- SmartPad recursively finds numeric root assumptions, varies each one by ±10% in isolation, recalculates the model, and ranks their effect on the selected result.
- A persistent inline tornado shows the current result, both recalculated outcomes, shared-scale impact bars, the most influential input, and accessible row descriptions.

### Changed

- Sensitivity results stay live while editing or scrubbing and can be moved to another result without changing sheet text, variables, baselines, scenarios, or undo history.

## 1.0.0-rc.9 - 2026-07-19

### Added

- Live and triggered result values are keyboard-focusable and open their existing actions with
  `Enter`, `Space`, or `ArrowDown`.
- Result menus support wrapping arrow navigation, `Home` / `End`, `Escape` focus restoration, and
  a `Go to source line` action.
- Reference chips act as keyboard links that return to and highlight their source line.

### Changed

- Goal Seek actions now use human-first labels such as `Find gross for a target…` while continuing
  to insert transparent, editable `make ... by ... =>` lines.

## 1.0.0-rc.8 - 2026-07-18

### Added

- A result chip's `⋯` menu can save the current model as a named scenario after a baseline is set.
- A compact comparison strip stays inside the sheet and shows the baseline, saved scenarios, and
  live result with deltas; it can be moved to another result or cleared from the same result menu.
- Named scenario snapshots persist per sheet, can be removed individually, and never add hidden
  formulas or controls to the Variables panel.

## 1.0.0-rc.7 - 2026-07-18

### Changed

- Baseline controls now live in each result chip's discreet actions menu instead of the Variables
  panel, keeping the complete exploration workflow inside the sheet.
- Changed inputs show their captured value and delta beside the editable line, while propagated
  changes appear directly beside their result chips.

## 1.0.0-rc.6 - 2026-07-18

### Added

- The Variables panel can capture one persistent baseline per sheet, then show live changed counts,
  previous values, and percentage deltas while the model is edited or scrubbed.
- Numeric variables are labeled as direct `input` assumptions or `derived` results, making the
  structure and propagation of a model easier to read.
- The first-run Decision Playground now teaches the full capture, scrub, and compare gesture.

## 1.0.0-rc.5 - 2026-07-18

### Fixed

- Local docs generation now preserves the documented `Shift`, `Alt`/`Option`, and `Escape`
  number-scrubbing controls instead of removing them during `npm run dev`.

## 1.0.0-rc.4 - 2026-07-18

### Added

- First run now opens a focused Decision Playground that connects editable assumptions, live profit
  and margin, a reactive plot, and one-variable goal seek in a single practical model. The broader
  Quick Tour remains available as a secondary template.
- Number scrubbing now supports `Shift` fine control, `Alt`/`Option` coarse control, and `Escape`
  to restore the exact value from before the gesture.

### Fixed

- Passive automatic autocomplete suggestions no longer intercept `Enter` and rewrite a completed
  expression. Arrow navigation still selects a suggestion, while `Tab` can accept the first item.
- Result-chip drag/drop workflows that were corrupted by passive autocomplete now preserve their
  source and target expressions.

## 1.0.0-rc.3 - 2026-07-02

### Fixed

- The manual autocomplete launcher now appears immediately on large sheets while the remaining
  suggestions render progressively.

## 1.0.0-rc.2 - 2026-06-23

### Added

- Settings modal header now discreetly shows the current SmartPad version.

### Changed

- Feature implementations and bug fixes now require a SmartPad version bump before commit.

## 1.0.0-rc.1 - 2026-06-22

First web public beta release candidate.

### Added

- Public Docusaurus documentation with Start Here, First Sheet, Core Interactions, Everyday Examples, Syntax Reference, Files & Privacy, Troubleshooting, and Support.
- Launch stability gates for editor basics, live results, units/dates/currency, result chips/references, lists/ranges, plotting, settings, autocomplete, docs IA, sheets persistence, import/export, FX failure visibility, and production app/docs routing.
- Browser-safe live FX launch path through the Fawaz provider, with Frankfurter and ECB treated as opportunistic providers because they fail browser CORS.
- Discreet dismissible FX warning when no live provider and no fresh cache are available.
- Minimal Electron desktop beta shell that loads the production build from disk.

### Changed

- Launch scope is web public beta first. Desktop is a beta path and the standalone promotional product website remains the final launch step.
- Current persistence/import/export coverage is accepted for first public launch; historical migration formats are deferred unless a concrete old-data case appears.

### Fixed

- Docusaurus production base path has been verified under `/SmartPad/docs/`.
- The app production base path has been verified under `/SmartPad/`.

### Known Limitations

- Desktop packaging is a beta shell. Signed/notarized installers and Windows/Linux artifacts are not ready yet.
- Marketing homepage, signup/update capture, launch screenshots/video, and final website journey are not complete.
- Frankfurter and ECB direct browser fetches currently fail CORS; Fawaz is the launch-critical browser-safe FX path.
- The production bundle still reports Vite's large chunk warning.

### Verification

- `npm run docs:map`
- `npm run docs:drift`
- `npm run spec:test`
- `npm run spec:trust`
- `npm run verify:changed`
- `npm run docs:docusaurus:publish-prod`
- `npm run build`
- `VITE_BASE_PATH=/SmartPad/ npm run build`
- Static smoke under `/SmartPad/` for app and docs routes.
