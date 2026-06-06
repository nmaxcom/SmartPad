# SmartPad Release Checklist

Use this checklist for public web releases, launch candidates, and desktop beta releases.

## Release Channels

- `web`: GitHub Pages public app and docs.
- `desktop-beta`: unsigned or partially signed desktop artifacts for testing.
- `stable`: future channel for signed/notarized desktop artifacts and fully public release notes.

Default launch path:

1. Ship a web release candidate.
2. Validate launch stability and public docs.
3. Publish the web app and marketing site.
4. Add desktop beta artifacts after the Electron shell passes smoke checks.

## Version Policy

Use semantic versioning:

- `MAJOR`: incompatible file/storage behavior, syntax breakage, or public API removal.
- `MINOR`: new user-facing features or launch milestones.
- `PATCH`: bug fixes, docs corrections, polish, and non-breaking release operations.

Pre-release labels:

- `-beta.N` for public beta builds.
- `-rc.N` for release candidates.

The version source is `package.json`. Desktop package metadata must use the same version.

## Changelog Policy

Maintain `CHANGELOG.md` for user-facing changes.

Each release should include:

- Added
- Changed
- Fixed
- Known limitations
- Verification summary

Do not include internal-only refactors unless they affect user behavior, release reliability, privacy, packaging, or docs.

## Web Release Candidate

Before tagging a web release candidate:

- [ ] Launch scope is confirmed or the unconfirmed decisions are explicitly marked as beta limitations.
- [ ] `aidocs/LAUNCH_SCOPE_MATRIX.md` has no unresolved p0 `gap` that blocks web launch.
- [ ] `aidocs/LAUNCH_STABILITY_AUDIT.md` P0 checks have been run or intentionally scoped for the candidate.
- [ ] Public docs beginner path and known limitations are current.
- [ ] Privacy copy covers local storage, FX behavior, website analytics, and signup.
- [ ] Web launch brief in `aidocs/WEB_LAUNCH_BRIEF.md` is implemented or scoped for the candidate.
- [ ] Marketing homepage links to app, docs, updates/signup, support, and release notes.
- [ ] Screenshots/video assets are captured from a verified build.
- [ ] Support path is visible.

Required commands:

```bash
npm run docs:map
npm run docs:drift
npm run spec:test
npm run spec:trust
npm run verify:changed
npm run docs:docusaurus:publish-prod
npm run build
```

Run targeted checks from `aidocs/LAUNCH_STABILITY_AUDIT.md` for every touched area.

Post-build checks:

- [ ] Open the built/previewed app at the production base path.
- [ ] Confirm docs link resolves under `/SmartPad/docs/`.
- [ ] Confirm docs pages render without broken asset paths.
- [ ] Confirm starter content and example import work.
- [ ] Confirm issue/support links resolve.
- [ ] Confirm signup/update link works or is clearly marked as unavailable.

## Desktop Beta Candidate

Before publishing desktop beta artifacts:

- [ ] Electron direction in `aidocs/DESKTOP_PACKAGING_DECISION.md` is still valid.
- [ ] Desktop version matches `package.json`.
- [ ] App launches from packaged files, not a dev server.
- [ ] Sheet storage persists across restart.
- [ ] Import/export works outside dev mode.
- [ ] Settings persist and reset.
- [ ] Docs links open intentionally.
- [ ] Offline FX/cache behavior is understandable.
- [ ] Unsigned-build warnings are documented if signing is not configured.
- [ ] Artifact host is chosen: GitHub Releases, website download page, or both.

Desktop smoke:

```bash
npm run build
```

Then run the desktop packaging script once it exists and perform manual packaged-app smoke from `aidocs/DESKTOP_PACKAGING_DECISION.md`.

## Release Publication

1. Update `CHANGELOG.md`.
2. Update `package.json` version.
3. Run release-candidate checks.
4. Commit release changes.
5. Tag the release:

```bash
git tag vX.Y.Z
```

6. Push branch and tag.
7. Confirm GitHub Pages deployment succeeds.
8. Confirm public app URL and docs URL.
9. Publish GitHub Release notes from `CHANGELOG.md`.
10. Update website/download links if desktop artifacts are included.

## Rollback

For web:

1. Identify last known good commit/tag.
2. Revert or hotfix on `main`.
3. Let Pages redeploy from `main`.
4. Confirm app/docs routes after deployment.
5. Add changelog note if users may have seen the bad release.

For desktop beta:

1. Mark affected artifacts as pre-release/problematic in GitHub Releases.
2. Publish a fixed beta artifact.
3. Document whether user data/storage is affected.
4. Add migration or recovery notes if needed.

## Support Intake

Default public support path:

- Bugs: GitHub bug report form.
- Feature ideas: GitHub feature request template.
- Private or account/signup issues: use the update/signup reply path once chosen.

Bug triage order:

1. Data loss or corruption.
2. Incorrect calculations in launch-promoted examples.
3. App load, storage, import/export, or docs routing failures.
4. Settings/onboarding blockers.
5. Visual polish and non-blocking feature requests.
