# SmartPad Unit, Ratio, and Conversion Decisions

Audience: technical reviewers with no prior context of SmartPad's internals. This document frames product/UX design forks and highlights user-facing consequences, without requiring knowledge of the codebase.

SmartPad lets users write expressions like `distance / time` or `price to $/month` in a free-form document. It supports:
- Units (km, h, USD, etc.)
- Custom unit aliases defined by user variables (e.g., `workday = 8 h`)
- Conversions via a suffix (`to`, `in`)
- Ratios and rates ("per X")

The open questions below are about user experience and syntax behavior. Each section gives a decision fork and shows multiple examples of what SmartPad should return and why, plus the tradeoffs if we choose each option.

---

## 1) Conversion suffix parsing: how to interpret "to" / "in"

Problem: Users write phrases that include the words "to" and "in". SmartPad also uses those words as a conversion command.

Decision fork:
- Option A: Treat the last "to/in" token as the conversion suffix.
- Option B: Only treat "to/in" as conversion if a structural parse confirms it.

Examples:
- `time to write in workweek =>`
  - Option A output: `6.4 workweek`
    - Rationale: base expression = `time to write`, conversion target = `workweek`.
  - Option B output: `6.4 workweek`
    - Rationale: structured parse would still pick the correct target.
  - Consequence: Option A is simpler but may misread complex phrases; Option B is robust but requires more parsing rules.

- `distance to airport in km =>`
  - Option A output: `distance to airport` converted into `km`
    - Rationale: last `in` is used as conversion target.
  - Option B output: ambiguous; would need grammar support to avoid misreading the phrase "to airport".
  - Consequence: Option A allows natural language but may be fragile; Option B needs more syntax rules.

Repercussion of choosing A:
- Easier to explain to users ("conversion uses last to/in").
- Lower implementation complexity.
- Higher risk of mis-parsing rare phrases.

Repercussion of choosing B:
- More correct for ambiguous cases.
- More complex parser and potential new syntax conflicts.

---

## 2) "Per X" targets and scaling (presentation vs simplification)

Problem: People express rates in human reporting formats (per 1000, per million). The system can either preserve that formatting or simplify it.

Decision fork:
- Option A: Preserve the exact requested target formatting.
- Option B: Normalize to the simplest canonical unit.

Examples:
- `defects = 7 defect`
- `production = 1200 unit`
- `rate = defects / production =>`
  - Expected: `0.00583 defect/unit`

- `rate to defect/(1000 unit) =>`
  - Option A output: `5.83 defect/(1000 unit)`
    - Rationale: matches the reporting intention.
  - Option B output: `0.00583 defect/unit`
    - Rationale: mathematically equivalent but less report-friendly.

- `api = $0.35/Mreq`
- `traffic = 80 Mreq/month`
- `cost = api * traffic =>`
  - Option A output: `$28/month`
  - Option B output: `$28/(1 month)` or `$28*1/month` if simplified poorly

Repercussion of choosing A:
- Aligns with how business metrics are reported.
- More consistent with "user asked for this exact target".
- Requires formatting logic to preserve grouping.

Repercussion of choosing B:
- Easier to implement and reason about.
- Risks surprising or "unhelpful" display even when math is right.

---

## 3) Countable nouns as real units vs dimensionless

Problem: Words like "person", "request", "serving", "defect" are not SI units, but users expect them to show up in outputs.

Decision fork:
- Option A: Treat countables as real units (with labels).
- Option B: Treat countables as dimensionless (labels can be dropped).

Examples:
- `household = 3 person`
- `rent = $1500/month`
- `rent / household =>`
  - Option A output: `$500/person/month`
    - Rationale: communicates per-person split.
  - Option B output: `$500/month`
    - Rationale: math is correct but hides meaning.

- `writing = 500 words/h`
- `book = 80000 words`
- `time to write = book / writing =>`
  - Option A output: `160 h`
  - Option B output: `160` (unitless)

Repercussion of choosing A:
- Outputs match user intuition and communicate meaning.
- Requires count dimension handling in unit arithmetic.

Repercussion of choosing B:
- Simpler internal model but results are less interpretable.
- Harder to trust for business users.

---

## 4) Currency + unit formatting style

Problem: When currency combines with units (e.g., $ per unit), formatting has a large effect on perceived correctness.

Decision fork:
- Option A: Use compact rate formatting (`$28/month`).
- Option B: Use explicit multiplication/division tokens (`$28*1/month`).
- Option C: Use human language (`$28 per month`).

Examples:
- `api = $0.35/Mreq`
- `traffic = 80 Mreq/month`
- `cost = api * traffic =>`
  - Option A: `$28/month` (clean, expected)
  - Option B: `$28*1/month` (reads like a bug)
  - Option C: `$28 per month` (clear, but changes syntax style)

- `rent = $1500/month`
- `household = 3 person`
- `rent / household =>`
  - Option A: `$500/person/month`
  - Option B: `$500/month*person` (mathematically ok, UX confusing)

Repercussion of choosing A:
- Consistent with metric reporting and finance displays.
- Requires formatting rules to avoid "1/" artifacts.

Repercussion of choosing B:
- Simpler formatter, but outputs feel wrong.

Repercussion of choosing C:
- More human-readable, but moves away from math-like syntax.

---

## 5) User-defined aliases vs built-in units

Problem: Users can define aliases that may collide with built-in units (day, month, batch).

Decision fork:
- Option A: User-defined aliases override built-ins in their document.
- Option B: Built-ins always win; user aliases are ignored on conflict.
- Option C: Conflicts require explicit syntax (e.g., `@alias`).

Examples:
- `workday = 8 h`
- `day = workday`
- `pace = 100 km/workweek`
- `pace to km/day =>`
  - Option A output: `20 km/day` (5 workdays per week)
  - Option B output: `2.857 km/day` (7 days per week)
  - Option C output: depends on syntax; could require `pace to km/@day`

- `batch = 10 kg`
- `output = 96 unit`
- `output to unit/batch =>`
  - Option A output: `9.6 unit/batch`
  - Option B output: `96 unit/batch` (no scaling)

Repercussion of choosing A:
- Matches user intent and is more powerful.
- Risk of subtle confusion if base units are redefined silently.

Repercussion of choosing B:
- Predictable for casual users, but blocks advanced workflows.

Repercussion of choosing C:
- Most explicit but adds syntax complexity.

---

## 6) Alias visibility in outputs

Problem: When a user asked for an alias-based unit, should the output keep the alias or convert to base units?

Decision fork:
- Option A: Preserve alias labels when requested.
- Option B: Always normalize to base units for display.

Examples:
- `workweek = 40 h`
- `time = 10 h`
- `time in workweek =>`
  - Option A: `0.25 workweek`
  - Option B: `10 h`

- `pace = 100 km/workweek`
- `pace to km/h =>`
  - Option A and B: `2.5 km/h` (base conversion is requested explicitly)

Repercussion of choosing A:
- Preserves user domain context (workweek, shift, batch).
- Requires alias-aware formatting.

Repercussion of choosing B:
- Simpler display logic but can feel "disobedient".

---

## 7) Pluralization and label fidelity

Problem: The internal unit representation often uses singular labels, but users write plurals.

Decision fork:
- Option A: Preserve user-facing plural forms.
- Option B: Always normalize to singular in output.

Examples:
- Input: `book = 80000 words`
  - Option A output: `80000 words`
  - Option B output: `80000 word`

- Input: `2 workweeks to h =>`
  - Option A: `80 h`
  - Option B: `80 h` (no visible difference here, but label matters in other contexts)

Repercussion of choosing A:
- Output reads naturally.
- Requires pluralization logic tied to original input or value.

Repercussion of choosing B:
- Simpler, but the output feels less human.

---

## 8) Phrase variables inside "per X"

Problem: Users define phrase variables (with spaces) and want them used as unit labels.

Decision fork:
- Option A: Allow phrase variables in unit positions and conversion targets.
- Option B: Disallow and require underscores or single tokens.

Examples:
- `recipe = 8 serving`
- `flour = 500 g`
- `per serving = flour / recipe =>`
  - Option A output: `62.5 g/serving`
  - Option B output: error or forced `per_serving`

- `line rate = 12 units/h`
- `shift = 8 h`
- `output = line rate * shift =>`
  - Should be `96 unit` regardless, but phrase variables matter when used as aliases.

Repercussion of choosing A:
- More natural writing, but parsing is trickier.

Repercussion of choosing B:
- Simpler parser, but less friendly to normal writing.

---

## 9) Clarifying "ratio reasoning" outputs

Problem: Users do multi-step ratio reasoning and expect meaningful labels.

Decision fork:
- Option A: Keep explicit labels in every step.
- Option B: Simplify labels when mathematically reducible.

Examples:
- `batch = 10 kg`
- `line rate = 12 unit/h`
- `shift = 8 h`
- `output = line rate * shift =>`
  - Output: `96 unit`
- `output to unit/batch =>`
  - Option A: `9.6 unit/batch` (explicit)
  - Option B: `0.96 unit/kg` (if alias expanded)

Repercussion of choosing A:
- Matches user mental model (batch is meaningful).
- Can obscure underlying base units for engineers.

Repercussion of choosing B:
- Precise in base units but loses the business concept.

---

## 10) Precision and rounding in unit reports

Problem: Many outputs are ratios with repeating decimals.

Decision fork:
- Option A: Respect global precision settings.
- Option B: Auto-round based on typical reporting units (per 1000, per million).

Examples:
- `rate = 7 defect / 1200 unit =>`
  - Option A: `0.005833 defect/unit`
  - Option B: `0.00583 defect/unit` or `5.83 defect/(1000 unit)`

Repercussion of choosing A:
- Predictable and consistent.
- Might be too precise for business reporting.

Repercussion of choosing B:
- More human-friendly for reports.
- Adds heuristics that could surprise power users.

---

## Summary: Decisions to Make (Product/UX)

1) How should conversion suffix parsing handle phrases with "to/in"?
2) Should "per X" targets preserve the requested formatting or normalize?
3) Are countables real units that remain visible in outputs?
4) How should currency-unit results be formatted?
5) Should user aliases override built-ins, and how do we warn users?
6) Should alias labels be preserved when requested?
7) How should pluralization be displayed?
8) Are phrase variables valid inside unit contexts?
9) When should outputs preserve domain labels vs reduce to base units?
10) How should precision be chosen for ratio outputs?
