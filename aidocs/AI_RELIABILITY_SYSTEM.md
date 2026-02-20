# AI Reliability System

## Purpose
Define one consistent, AI-friendly enforcement path so feature changes stay synced with:
- specs (`docs/Specs/`)
- tests (`tests/`)
- user docs (`website/docs/`, `public/docs/`, mapped docs)
- build integrity (`npm run build`)
- CI signal quality (PR summary + PR comment)

## Canonical Command
Use this as the default verification gate:

```bash
npm run verify:changed -- <diff-range>
```

Local default:

```bash
npm run verify:changed
```

Default range is `HEAD~1...HEAD`.

## What `verify:changed` Runs
Script: `scripts/verify-changed.js`

Checks:
1. `npm run docs:map -- <range>`
2. `npm run docs:drift -- <range>`
3. `npm run spec:test -- <range>`
4. Related unit tests (Jest) for changed `src/**` files:
   - `npx jest --findRelatedTests <changed-src-files> --passWithNoTests`
5. `npm run build` when the diff is deploy-impacting (for example `src/` or core config changes)

Output:
- human markdown summary (stdout)
- optional summary file via `--summary-file`
- optional JSON payload via `--json-file`

Exit behavior:
- non-zero if any gate fails

## CI Integration
Workflow: `.github/workflows/ci.yml`

Behavior:
1. Runs `verify:changed` against PR diff range.
2. Publishes markdown summary to `GITHUB_STEP_SUMMARY`.
3. Upserts a PR comment containing the same summary.
4. Fails the workflow if `verify:changed` fails.

## Docs Workflow Integration
Workflow: `.github/workflows/documentation-maintenance.yml`

Behavior:
1. Triggers on docs + aidocs markdown changes.
2. Checks markdown links in `docs/`, `aidocs/`, and `README.md`.
3. Runs `verify:changed` for consistency checks on docs-related PRs.

## AI Operating Rules
When changing behavior in `src/`:
1. Update linked specs in `docs/Specs/`.
2. Update mapped user docs.
3. Update tests.
4. Run `npm run verify:changed`.
5. Record results in `aidocs/EXECUTIVE_JOURNAL.md`.

If `verify:changed` fails:
1. Fix missing mapped artifacts first.
2. Use individual commands (`docs:map`, `docs:drift`, `spec:test`) for diagnosis.
3. Rerun `verify:changed` until clean.

## Notes For Future AI Sessions
- Do not bypass `verify:changed` unless explicitly directed by the user.
- Prefer interpreting failures as process feedback, not isolated script noise.
- Keep commit scopes small so diff-range checks remain precise.
