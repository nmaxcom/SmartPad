# SmartPad Docs And Support Launch Audit

## Goal

Make SmartPad understandable and supportable for public users who arrive from the launch homepage with no project context.

The current docs are a user-approved public manual for launch. Remaining launch work is mostly integration: link the docs from the future promotional homepage, keep privacy/support copy aligned with signup/analytics decisions, and verify the full homepage-to-docs-to-app journey once the homepage exists.

## Current State

Existing public docs:

- `website/docs/intro.md`
- `website/docs/guides/getting-started.md`
- `website/docs/guides/core-interactions.md`
- `website/docs/guides/everyday-calculations.md`
- `website/docs/guides/syntax-reference.md`
- `website/docs/guides/files-and-privacy.md`
- `website/docs/guides/troubleshooting.md`
- `website/docs/guides/support.md`

Existing support entry points:

- `.github/ISSUE_TEMPLATE/bug_report.yml`
- `.github/ISSUE_TEMPLATE/feature_request.md`
- `RELEASE_CHECKLIST.md`

Existing validation:

- `tests/e2e/docs-ia.spec.ts`
- `scripts/validate-docusaurus-examples.ts`
- `npm run docs:docusaurus:validate-examples`
- `npm run docs:docusaurus:publish-local`
- `npm run docs:docusaurus:publish-prod`
- `npm run docs:map`
- `npm run docs:drift`
- `npm run verify:changed`

## Launch Gaps

| Area | Current state | Launch gap | Required action |
| --- | --- | --- | --- |
| Beginner journey | Start Here, First Sheet, Core Interactions, Everyday Examples, and Syntax Reference exist | Journey is docs-first and not yet tied to launch homepage CTAs | Add scripted homepage -> docs -> app example journey after homepage exists. |
| Limitations and privacy | Files & Privacy covers local storage, backups, no accounts/cloud sync, FX dependency, current desktop beta status, and current limits | Signup provider/analytics decision is still pending | Keep copy aligned with the final signup/analytics decision before launch. |
| Support path | Support page exists; Troubleshooting links escalation; GitHub templates exist | Homepage/footer links missing until promotional site exists | Link support from future homepage and review GitHub issue-template wording during release dry run. |
| Desktop beta | Planned in launch docs; public docs describe beta status without promising artifacts | Artifact-specific warnings cannot be final until packaging exists | Update Files & Privacy and homepage copy only after a desktop artifact exists. |
| Proposed-vs-shipped | Public Docusaurus output no longer exposes per-spec Feature Guides | Future homepage could still overpromise advanced/proposed features | Keep homepage copy tied to implemented guides and verified launch behavior. |
| Accessibility | Docs IA test covers desktop/mobile sanity | Full homepage/docs/app journey accessibility cannot run until homepage exists | Verify keyboard, mobile, contrast, link text, and embedded previews after homepage exists. |

## Current Public Docs Shape

The approved Docusaurus sidebar is:

1. Start Here
2. First Sheet
3. Core Interactions
4. Everyday Examples
5. Syntax Reference
6. Files & Privacy
7. Troubleshooting
8. Support

The docs intentionally do not publish per-spec Feature Guides. Internal specs remain project source material; public docs stay focused on product users.

## Remaining Public Docs Work

### 1. Homepage Links

Update:

- Future homepage from `aidocs/WEB_LAUNCH_BRIEF.md`

Add links to:

- Start Here
- Syntax Reference
- Files & Privacy
- Support
- Changelog/Release notes

### 2. Release-Dry-Run Copy Review

During release candidate dry run, confirm:

- Support page issue links still resolve.
- Files & Privacy still matches actual signup/analytics/desktop status.
- Troubleshooting points users to support when simplification does not resolve a problem.
- Public docs do not mention proposed features as shipped behavior.

## User Journey To Verify

After homepage exists:

1. User lands on homepage.
2. User sees SmartPad product promise and real screenshot.
3. User opens docs.
4. User opens Getting Started or Start Here.
5. User runs or opens a provided example.
6. User opens SmartPad from docs/homepage.
7. User understands local-first storage and export guidance.
8. User can find support/bug report.
9. User can find current limitations and privacy guidance in Files & Privacy.

This should be verified by Playwright once the homepage and docs pages exist.

## Documentation Quality Rules

Public docs should:

- Use exact feature names visible in the app.
- Include runnable examples for shipped behavior.
- Avoid proposed feature examples unless clearly labeled.
- Prefer positive examples plus guardrails.
- Keep limitations honest and concise.
- Avoid internal implementation terms unless they help users make decisions.

## Verification

When docs/support changes are implemented:

```bash
npm run docs:docusaurus:publish-local
npm run docs:docusaurus:publish-prod
npm run docs:map
npm run docs:drift
npm run spec:test
npm run spec:trust
npm run verify:changed
```

Browser checks:

- Docs sidebar includes Files & Privacy, Troubleshooting, and Support.
- Links to bug report and feature request resolve.
- Files & Privacy mentions signup/analytics only if those features exist or are planned with clear status.
- Public Docusaurus output does not expose per-spec Feature Guides as the main launch path.
- Mobile docs navigation works at 390px width.
- Embedded examples do not create persistent sheets.

## Done Criteria

`T-2026-06-06-07` is done when:

- Files & Privacy covers local storage, FX, signup/analytics status, current limitations, and desktop beta status accurately.
- Support path is visible from docs and launch homepage.
- Sidebar and homepage link the right user-support pages.
- A scripted beginner journey from homepage to working SmartPad example passes.
- Docs build, docs drift/spec gates, and release-candidate docs checks pass.
