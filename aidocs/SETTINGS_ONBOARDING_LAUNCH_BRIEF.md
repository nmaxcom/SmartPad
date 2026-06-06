# SmartPad Settings And Onboarding Launch Brief

## Goal

Make the first-run product surface and settings experience feel intentional, understandable, and screenshot-ready for public launch.

This brief drives `T-2026-06-06-03`.

## Current State

Existing implementation:

- Settings UI: `src/components/ui/SettingsSections.tsx`
- Settings persistence: `src/state/settingsStore.ts`
- Settings panel/modal: `src/components/ui/SettingsPanel.tsx`, `src/components/ui/SettingsModal.tsx`
- First-run quick tour content: `src/templates/quickTourTemplate.ts`
- Template panel: `src/components/VariablePanel/TemplatePanel.tsx`

Existing coverage:

- `tests/unit/settingsStore.test.ts`
- `tests/e2e/settings-integration.spec.ts`
- `tests/e2e/grouped-input-and-date-settings.spec.ts`
- `tests/unit/quickTourTemplate.test.ts`
- `tests/e2e/quick-tour-template.spec.ts`
- `tests/e2e/template-basic-functionality.spec.ts`

Launch gap:

- Settings expose many real controls, but the structure reads like implementation categories rather than public-user decisions.
- First-run quick tour is feature-dense and useful, but it needs product-level framing so a new user knows what to do first.
- Final launch screenshots should wait until settings/onboarding polish lands.

## Settings IA Recommendation

Group settings by user intent, not implementation internals.

### 1. Appearance

Purpose: make SmartPad look comfortable before any calculations are changed.

Controls:

- Interface theme.
- Syntax theme.
- Result chip visual style controls if they remain user-facing.

Launch copy:

- Explain that these only affect appearance.
- Avoid implying themes change calculation behavior.

### 2. Results And Formatting

Purpose: control how answers are displayed.

Controls:

- Decimal places.
- Group thousands.
- Scientific notation thresholds.
- Trim scientific trailing zeros.
- Live Result toggle.
- Result Lane toggle.

Launch copy:

- Use plain language: `How answers are displayed`.
- Put scientific notation under an advanced subsection or disclosure.
- Explain Result Lane with a screenshot or concise note: wide screens only.

### 3. Reuse And Export

Purpose: explain result chips, references, and copy/export behavior.

Controls:

- Result chip drag/drop insert mode.
- Reference text copy/export mode.

Launch copy:

- `References keep calculations connected. Plain values are snapshots.`
- Clarify that export/copy choices affect portability/readability.

### 4. Dates And Locale

Purpose: prevent date confusion across locales.

Controls:

- Date locale mode.
- Locale override.
- Date display format.

Launch copy:

- Show detected locale and effective locale.
- Explain ambiguous numeric dates like `06/05/2024`.
- Keep ISO as the recommended durable export/display mode.

### 5. Lists And Limits

Purpose: guard against runaway lists while explaining why limits exist.

Controls:

- Max items per list.

Launch copy:

- Frame as performance/safety guardrail.
- Keep default visible.

### 6. Currency And External Data

Purpose: make FX behavior trustworthy.

Controls/status:

- Live FX status.
- Provider status list.
- Offline/cache message.

Launch copy:

- Say when SmartPad uses cached rates.
- Link to privacy/portability or FX docs.
- Avoid making providers feel user-selectable unless they are.

### 7. Panels

Purpose: let users choose workspace layout.

Controls:

- Variable panel.
- Template panel.
- Settings panel.

Launch copy:

- Use terms visible in the UI.
- Explain that hiding panels does not delete data.

### 8. Advanced Plotting

Purpose: keep expert chart tuning out of the default scan path.

Controls:

- Plot sample counts.
- Domain expansion.
- View/domain/pan padding.
- Plot details toggle.

Launch copy:

- Put these under an `Advanced` or collapsed section.
- Explain that defaults are safe for most users.
- Do not lead homepage screenshots with this section.

## Onboarding Recommendation

First-run should teach the core loop without blocking typing.

Required first-run signals:

- SmartPad is a text workspace, not a form.
- Type naturally; results appear as you write.
- Use `=>` for intentional/shareable result lines.
- Variables update downstream lines.
- Units/currency/dates are real values.
- Result chips can be copied or reused.
- Sheets are local-first; export important work.

Current quick tour:

- Good: shows currency, percentages, conversion, chart, lists, dates, solve, and result chip reuse.
- Risk: feature-dense for screenshots and first-time users; may feel like a demo sheet rather than guided onboarding.

Launch approach:

1. Keep the quick tour as a template.
2. Add lightweight first-run framing around it:
   - title/callout in the app or template panel,
   - short `Start here` language,
   - one clear first action: edit/scrub a value and watch results update.
3. Avoid modal onboarding that blocks typing.
4. Add link to Getting Started docs.

## Empty And Recovery States

Before public screenshots, verify:

- Empty editor state has a useful prompt or template entry point.
- Missing FX/cache state is understandable.
- Settings reset uses clear confirmation copy.
- Import/export errors explain what to do next.
- Unsupported/proposed features fail with explicit messages, not generic failures.

## Accessibility And Responsive Requirements

Settings/onboarding launch review must cover:

- Keyboard open/close settings.
- Escape closes modal without losing typed work.
- Focus order follows visible sections.
- Labels are associated with controls.
- Toggle/select/input controls are reachable by keyboard.
- Text fits at 390px, 900px, and 1440px widths.
- Settings modal/panel does not create confusing nested scroll regions.
- Contrast and focus states are visible.

## Visual Snapshot Requirements

Capture after implementation:

- First-run default app at 1440px.
- First-run default app at 390px.
- Settings overview at 1440px.
- Settings/date locale section.
- Settings/reuse export section.
- Template/quick tour entry point.
- Result chip reuse example.

Do not capture:

- Internal debug/tracing controls.
- Advanced plotting settings as the main product proof.
- Autocomplete as a headline feature until user confirms it.

## Verification

Targeted commands after implementation:

```bash
npm run test:unit -- tests/unit/settingsStore.test.ts tests/unit/quickTourTemplate.test.ts --runInBand
npx playwright test tests/e2e/settings-integration.spec.ts tests/e2e/grouped-input-and-date-settings.spec.ts tests/e2e/quick-tour-template.spec.ts tests/e2e/template-basic-functionality.spec.ts --project=chromium --config=playwright.config.ts --workers=1
npm run docs:map
npm run docs:drift
npm run spec:test
npm run spec:trust
npm run verify:changed
npm run build
```

Manual checks:

- New user can identify what to do first in less than one minute.
- User can change date locale and understand why it matters.
- User can choose reference vs plain-value reuse and understand the tradeoff.
- User can reset settings safely.
- User can find Getting Started docs from onboarding or help surface.
- Launch screenshot candidates are visually clean.

## Done Criteria

`T-2026-06-06-03` is done when:

- Settings sections follow the launch IA above or an explicitly approved alternative.
- Advanced controls are visually subordinate.
- Onboarding gives one clear first action without blocking typing.
- Quick tour remains syntax-safe and covered by tests.
- Settings persistence/reset/date locale/reuse controls pass tests.
- Desktop/mobile screenshots are reviewed.
- Any behavior/copy changes are reflected in specs/docs when needed.
