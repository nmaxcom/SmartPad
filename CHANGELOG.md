# Changelog

All notable user-facing changes to SmartPad will be documented in this file.

SmartPad uses semantic versioning. Pre-release builds use `-beta.N` or `-rc.N` suffixes.

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
