# SmartPad Desktop Packaging Decision

## Decision

Start the desktop beta path with Electron.

Tauri remains a future optimization candidate, but it should not be the first implementation path for launch.

## Why Electron First

SmartPad is already a Vite/React application with browser-oriented storage, docs links, Playwright coverage, and a public web launch path. Electron gives the shortest path to a credible desktop beta because it can reuse the current renderer with minimal architectural churn.

Launch priorities favor:

- Proving the public product and onboarding.
- Preserving web behavior in a packaged shell.
- Shipping a beta desktop build without blocking website/docs launch.
- Keeping CI/release work understandable for future agents.

Tauri may be attractive later for smaller bundles and native feel, but the first launch risk is not binary size. The first launch risk is introducing a new native toolchain and storage/runtime differences before the product surface is stable.

## Decision Criteria

| Criterion | Electron | Tauri | Launch judgment |
| --- | --- | --- | --- |
| Fits current Vite/React app | Strong | Strong, but with Rust/native setup | Electron is lower friction now. |
| Local storage parity | Strong if renderer uses existing IndexedDB/browser APIs | Needs validation in webview environment | Electron is easier for first smoke checks. |
| Cross-platform packaging ecosystem | Mature | Mature but requires Rust/Tauri setup | Electron has fewer repo-level unknowns for this codebase. |
| Bundle size/startup | Larger | Smaller | Not launch-blocking for beta. |
| File-system integrations | Strong | Strong | Either works; current app mostly needs import/export parity first. |
| Signing/notarization | Known ecosystem, still requires credentials | Known ecosystem, still requires credentials | Equivalent release-ops burden. |
| Auto-update | Mature options | Mature options | Defer from first beta unless cheap after packaging. |
| Agent maintainability | JavaScript/Node path matches repo | Adds Rust/native concepts | Electron is simpler for current automation. |

## First Desktop Beta Scope

Must work:

- App launches as a desktop window on macOS first.
- Existing Vite build loads from packaged files, not a dev server.
- Sheet storage persists between restarts.
- Import/export still works.
- Docs links open externally in the default browser or inside a clearly intentional desktop route.
- Offline FX/cache behavior matches web expectations.
- Settings persist and reset.
- App name, icon placeholder, and version are visible in package metadata.

Can wait:

- Auto-update.
- Code signing and notarization for beta builds, if beta warning copy is documented.
- Windows/Linux artifacts from local machine, as long as CI/release plan explains how they will be produced.
- Native menu polish beyond basic quit/copy/paste/select-all behavior.
- Deep links and file associations.

Must not happen:

- Desktop work must not fork app behavior from web without a spec or launch note.
- Desktop packaging must not introduce hidden telemetry.
- Desktop launch copy must not promise signed/notarized/stable installers until they exist.

## Spike Plan

### Phase 1: Minimal Electron Shell

Deliverables:

- Add Electron main/preload files under a clear desktop directory, for example `desktop/electron/` or `src-electron/`.
- Add package scripts for desktop dev and local package build.
- Load the production Vite build from disk.
- Prevent unsafe Node exposure in renderer unless a specific API is needed.
- Ensure external links open in the system browser.

Verification:

- `npm run build`
- Electron launch smoke on macOS.
- Manual smoke: first load, create sheet, reload/restart, reopen sheet, open docs link, export/import.
- Relevant existing tests for runtime mode, settings, storage, and docs URL.

### Phase 2: Beta Package

Deliverables:

- Add a packaging tool such as electron-builder or Electron Forge after Phase 1 proves runtime behavior.
- Produce unsigned macOS local beta artifact.
- Document unsigned-install warning expectations.
- Add package metadata: app name, product name, version, icon placeholder, app id.

Verification:

- Install/open the packaged app.
- Confirm persistence across close/reopen.
- Confirm import/export works outside dev server.
- Confirm docs/app external links behave intentionally.

### Phase 3: Cross-Platform Release Path

Deliverables:

- Add GitHub Actions release job or documented manual build commands for macOS, Windows, and Linux.
- Decide artifact formats:
  - macOS: `.dmg` or `.zip`
  - Windows: `.exe` or `.msi`
  - Linux: `.AppImage` or `.deb`
- Add release checklist entries for desktop artifact smoke.
- Decide whether signing/notarization is required before public beta or stable only.

Verification:

- Dry-run release artifact generation in CI or documented local commands.
- Release checklist references exact artifact paths and smoke steps.

## Tauri Revisit Trigger

Reconsider Tauri when at least one is true:

- Electron package size/startup materially hurts adoption.
- Stable desktop release is blocked by Electron-specific distribution friction.
- The app needs native APIs that Tauri can provide with less risk.
- A contributor is ready to own Rust/Tauri maintenance.

If revisited, run a one-day Tauri spike against the same smoke criteria before changing direction.

## Open Questions

- Should the first desktop beta be macOS-only, or should launch require Windows/Linux artifacts at the same time?
- Is an unsigned beta acceptable if the website clearly labels it?
- Which artifact host should be canonical: GitHub Releases, website download page, or both?
- Should release notes live in `CHANGELOG.md`, GitHub Releases, or both?
- Should desktop docs open externally or in an in-app docs window?

## Recommended Next Step

Create the minimal Electron shell only after settings/onboarding polish is underway or complete. A desktop wrapper around an unpolished first-run experience would create poor launch screenshots and duplicate QA work.
