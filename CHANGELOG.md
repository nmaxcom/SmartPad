# Changelog

All notable user-facing changes to SmartPad will be documented in this file.

SmartPad uses semantic versioning. Pre-release builds use `-beta.N` or `-rc.N` suffixes.

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
