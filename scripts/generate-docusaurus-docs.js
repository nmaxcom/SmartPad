const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = process.cwd();
const specsDir = path.join(repoRoot, "docs", "Specs");
const docsRoot = path.join(repoRoot, "website", "docs");
const specsOutDir = path.join(docsRoot, "specs");
const guidesOutDir = path.join(docsRoot, "guides");

const SPEC_CATALOG = [
  {
    fileName: "LiveResult.spec.md",
    slug: "live-results",
    title: "Live Results",
    summary: "See useful results while you type, without adding `=>` to every line.",
    focus: [
      "Fast feedback while you type",
      "Success-only live rendering (no noisy live errors)",
      "Keeps explicit `=>` behavior unchanged",
    ],
    syntax: [
      "Live previews only apply to lines without `=>`.",
      "Incomplete or unresolved lines stay quiet until they become valid.",
      "Turning `liveResultEnabled` off restores explicit-only behavior.",
    ],
    checklist: [
      "Use explicit `=>` only when you want SmartPad to show a deliberate result or a deliberate error.",
      "Keep assignment lines readable so live feedback highlights intent quickly.",
      "Expect no preview for notes/comments/plain text lines.",
    ],
    examples: {
      success: [
        {
          title: "Quick arithmetic while drafting",
          description: "Live chips appear for valid lines even before adding `=>`.",
          code: ["hours = 38", "rate = $95/hour", "weekly pay = hours * rate", "weekly pay in EUR"].join("\n"),
        },
        {
          title: "Conversion while typing",
          description: "Unit-aware preview appears as soon as the expression is complete.",
          code: ["distance = 42 km", "distance in mi", "pace = 10 km / 52 min", "pace in min/km"].join("\n"),
        },
        {
          title: "Compact syntax still resolves",
          description: "Live mode supports implicit multiplication and compact unit forms.",
          code: ["run rate = 9L/min*18min", "carry = 2(3+4)", "combined = (2+3)(4+5)"].join("\n"),
        },
      ],
      guardrails: [
        {
          title: "Incomplete lines are intentionally silent",
          description: "These lines should show no preview until they are complete.",
          code: ["draft = 3*", "conversion = 4lb to", "unknown = missingVar + 2"].join("\n"),
        },
        {
          title: "Explicit trigger still wins",
          description: "Using `=>` keeps the classic explicit-result workflow.",
          code: ["base = 120", "tax = 8%", "total = base + base * tax =>"].join("\n"),
        },
      ],
    },
  },
  {
    fileName: "ResultChipsAndValueGraph.spec.md",
    slug: "result-chips-and-references",
    title: "Result Chips and References",
    summary: "Reuse previous results without retyping values or losing where they came from.",
    focus: [
      "Live and triggered results behave the same once SmartPad has enough information",
      "Click/drag/paste chips to build formulas",
      "Stable source-linked references survive reorder and edits",
    ],
    syntax: [
      "Chips insert hidden reference nodes, not brittle line-number text.",
      "Rich copy/paste preserves reference identity for SmartPad round trips.",
      "External plain-text export follows `referenceTextExportMode` policy.",
    ],
    checklist: [
      "Prefer chip insertion for dependency-heavy sheets to reduce typo risk.",
      "When a source breaks, inspect warning chips first before rewriting lines.",
      "Use copy-value action for external sharing; keep references for in-app work.",
    ],
    examples: {
      success: [
        {
          title: "Reference-first budgeting",
          description: "Build totals by inserting chips instead of retyping values.",
          code: [
            "monthly rent = $2500",
            "phone bill = $45",
            "food/day = $50",
            "food total = food/day * 30 =>",
            "monthly total = monthly rent + phone bill + food total =>",
          ].join("\n"),
        },
        {
          title: "Percent workflows with chip reuse",
          description: "Use prior results as clean inputs for taxes and discounts.",
          code: [
            "subtotal = $420",
            "tax = 8.5% on subtotal =>",
            "discount = 15% off subtotal =>",
            "final total = subtotal + tax - discount =>",
          ].join("\n"),
        },
        {
          title: "Reference chains across units",
          description: "Referenced values keep semantic types (currency/unit/list).",
          code: [
            "distance = 42 km",
            "time = 52 min",
            "speed = distance / time =>",
            "speed in km/h =>",
          ].join("\n"),
        },
      ],
      guardrails: [
        {
          title: "Broken source behavior",
          description: "Downstream references should clearly indicate source failure.",
          code: [
            "subtotal = 120",
            "tax = subtotal * 0.15 =>",
            "subtotal = 12 / 0",
            "tax =>",
          ].join("\n"),
        },
        {
          title: "Cycle prevention mindset",
          description: "Avoid making a line depend on itself through chip insertion.",
          code: ["base = 100", "profit = base * 0.2 =>", "base = profit + 50"].join("\n"),
        },
      ],
    },
  },
  {
    fileName: "Plotting.spec.md",
    slug: "plotting-and-dependency-views",
    title: "Plotting and Dependency Views",
    summary: "Turn a sheet into something you can explore, not just read.",
    focus: [
      "Explore how results depend on chosen inputs",
      "Persist key insights as detached `@view` blocks",
      "Keep text as source-of-truth while visuals stay synchronized",
    ],
    syntax: [
      "`@view` lines bind to the expression directly above.",
      "Use `x=...` to define the independent variable.",
      "Optional params include `domain`, `view`, `ydomain`, `yview`, and `size`.",
    ],
    checklist: [
      "Keep the plotted expression directly above the `@view` line.",
      "Use explicit `domain` when automatic inference hides useful regions.",
      "Quote multi-series `y=` values if you include spaces.",
    ],
    examples: {
      success: [
        {
          title: "Investment growth exploration",
          description: "Track growth sensitivity by varying years.",
          code: [
            "principal = $12000",
            "annual return = 9%",
            "years = 18",
            "estimated value = principal * (1 + annual return)^years =>",
            "@view plot x=years domain=0..40",
          ].join("\n"),
        },
        {
          title: "Two-series comparison",
          description: "Compare linear and quadratic behavior in one view.",
          code: ["x = 4", "f = 2*x + 1", "g = x^2", "@view plot x=x y=f,g"].join("\n"),
        },
        {
          title: "Viewport control",
          description: "Persist exploration zoom and y-axis intent.",
          code: [
            "principal = $8000",
            "rate = 6%",
            "years = 30",
            "future = principal * (1 + rate)^years =>",
            "@view plot x=years domain=0..40 view=5..25 ydomain=0..50000",
          ].join("\n"),
        },
      ],
      guardrails: [
        {
          title: "Malformed directive",
          description: "Keep `@view` syntax strict and explicit.",
          code: ["revenue = 12000", "cost = 9000", "profit = revenue - cost =>", "@view plot years"].join("\n"),
        },
        {
          title: "Disconnected source",
          description: "View should enter recoverable disconnected state if source disappears.",
          code: ["f = 2*x + 1", "@view plot x=x", "f = unknownVar + 1"].join("\n"),
        },
      ],
    },
  },
  {
    fileName: "Currency.spec.md",
    slug: "currency-and-fx",
    title: "Currency and FX",
    summary: "Work with money naturally, including conversions and fallback rates.",
    focus: [
      "Currency behaves like unit-aware data, not plain strings",
      "`to`/`in` conversions use live FX with deterministic fallback",
      "Manual pair rates override live providers when explicitly defined",
    ],
    syntax: [
      "Use `to` or `in` for conversion suffixes (`EUR 50 to USD`).",
      "Manual overrides are normal assignments (`EUR = 1.08 USD`).",
      "Currency can combine with rates (`$85/hour`, `EUR 1.89/liter`).",
    ],
    checklist: [
      "Define manual rates in-sheet when you need fixed scenario planning.",
      "Keep target currency explicit in stakeholder-facing outputs.",
      "Prefer one base reporting currency for long documents.",
    ],
    examples: {
      success: [
        {
          title: "Travel planning",
          description: "Convert spending between currencies while preserving units.",
          code: [
            "hotel = EUR 240",
            "meals = EUR 180",
            "trip spend eur = hotel + meals =>",
            "trip spend eur in USD =>",
          ].join("\n"),
        },
        {
          title: "Manual FX override",
          description: "Pin rates for a fixed-budget scenario.",
          code: ["EUR = 1.10 USD", "meal = EUR 18", "meal in USD =>", "budget = USD 1500", "budget in EUR =>"].join("\n"),
        },
        {
          title: "Currency with rates",
          description: "Convert only currency portion inside compound units.",
          code: ["hourly = $85/hour", "hourly in EUR/hour =>", "monthly hours = 168 h", "pay = hourly * monthly hours =>"].join("\n"),
        },
      ],
      guardrails: [
        {
          title: "Unsupported conversion target",
          description: "Invalid or unknown targets should surface clear errors.",
          code: ["budget = $1200", "budget in ABC =>"].join("\n"),
        },
        {
          title: "Missing FX rate context",
          description: "Cross-currency conversion fails when no rate source is available.",
          code: ["amount = GBP 79", "amount in BTC =>"].join("\n"),
        },
      ],
    },
  },
  {
    fileName: "duration.spec.md",
    slug: "duration-and-time-values",
    title: "Duration and Time Values",
    summary: "Add, compare, and plan with durations, times, and dates.",
    focus: [
      "Duration is a first-class value with flexible literal forms",
      "Time-of-day arithmetic supports rollovers with clear hints",
      "DateTime +/- duration expressions accept natural duration phrases",
    ],
    syntax: [
      "Accept `2hours 1min`, `2 h 1 min`, and mixed spacing.",
      "Duration conversions use `to`/`in` (`3h 7min 12s to min`).",
      "`Time + Time` is invalid; use `Time - Time` for durations.",
    ],
    checklist: [
      "Prefer `min` over bare `m` when you mean minutes.",
      "Use explicit timezone-aware datetime literals for cross-region planning.",
      "Keep mixed-sign duration math explicit with `+`/`-` operators.",
    ],
    examples: {
      success: [
        {
          title: "Duration conversion",
          description: "Convert composite durations into scalar target units.",
          code: ["prep = 3h 7min 12s", "prep to min =>", "prep to s =>"].join("\n"),
        },
        {
          title: "Time-of-day rollover",
          description: "Time plus duration wraps with day context.",
          code: ["start = 19:30", "duration = 5h 20min 3s", "finish = start + duration =>"].join("\n"),
        },
        {
          title: "Datetime with natural duration",
          description: "Subtract duration phrases directly from datetime literals.",
          code: ["meeting = 01/04/2025 19:30", "travel back = meeting - 2hours 1min =>"].join("\n"),
        },
      ],
      guardrails: [
        {
          title: "Invalid unit target",
          description: "Duration cannot convert to incompatible dimensions.",
          code: ["elapsed = 3h 7min 12s", "elapsed to kg =>"].join("\n"),
        },
        {
          title: "Invalid time math",
          description: "Adding two clock times is intentionally rejected.",
          code: ["first = 19:30", "second = 18:00", "first + second =>"].join("\n"),
        },
      ],
    },
  },
  {
    fileName: "Lists.spec.md",
    slug: "lists",
    title: "Lists",
    summary: "Work with repeated values without turning the sheet into a grid.",
    focus: [
      "Lists make one-line calculations scale to many values",
      "Aggregators reduce lists to scalar decisions",
      "Element-wise operations preserve units and currencies",
    ],
    syntax: [
      "List literal: comma-separated values (`costs = $12, $15, $9`).",
      "Filter: `xs where > 10` / `xs where = 0.3`.",
      "Zip math requires matching list lengths.",
    ],
    checklist: [
      "Use named list variables before chaining advanced operations.",
      "Validate list length assumptions before pairwise arithmetic.",
      "Keep list element dimensions compatible to avoid hard errors.",
    ],
    examples: {
      success: [
        {
          title: "Monthly expense summary",
          description: "Aggregate costs, inspect max, and compute average quickly.",
          code: [
            "rent = $1250",
            "utilities = $185",
            "internet = $75",
            "subscriptions = $49.99",
            "expenses = rent, utilities, internet, subscriptions",
            "sum(expenses) =>",
            "avg(expenses) =>",
            "max(expenses) =>",
          ].join("\n"),
        },
        {
          title: "Percent distribution",
          description: "Turn category totals into contribution percentages.",
          code: [
            "expenses = $1250, $185, $75, $49.99",
            "total = sum(expenses) =>",
            "expenses / total as % =>",
          ].join("\n"),
        },
        {
          title: "Fitness volume via zip multiply",
          description: "Element-wise list math for set planning.",
          code: [
            "weights = 80 kg, 85 kg, 90 kg",
            "reps = 5, 5, 3",
            "volume = weights * reps =>",
            "sum(volume) =>",
          ].join("\n"),
        },
      ],
      guardrails: [
        {
          title: "Nested list rejection",
          description: "Aggregators reject nested list shapes.",
          code: ["rent = 1200, 1200", "utilities = 200, 200", "expenses = rent, utilities", "sum(expenses) =>"].join("\n"),
        },
        {
          title: "Zip length mismatch",
          description: "Pairwise operations require equal list lengths.",
          code: ["a = 1, 2, 3", "b = 10, 20", "a + b =>"].join("\n"),
        },
      ],
    },
  },
  {
    fileName: "Ranges.spec.md",
    slug: "ranges",
    title: "Ranges",
    summary: "Generate number, date, and time sequences with `..`.",
    focus: [
      "`..` builds sequences faster than manual list typing",
      "Steps are explicit, directional, and designed to fail clearly when they do not make sense",
      "Range outputs compose with list math and conversions",
    ],
    syntax: [
      "Numeric: `<start>..<end>` or `<start>..<end> step <step>`.",
      "Temporal ranges require explicit duration step.",
      "`to <unit>` annotates/converts range-produced lists under list rules.",
    ],
    checklist: [
      "Use `step` explicitly when sequence size matters for performance.",
      "Check max generated list size when exploring large spans.",
      "Prefer `..` for generation and reserve `to/in` for conversions.",
    ],
    examples: {
      success: [
        {
          title: "Numeric scenarios",
          description: "Build sensitivity ranges with custom step size.",
          code: ["1..5 =>", "0..10 step 2 =>", "(1..5) * 2 =>", "sum(1..5) =>"].join("\n"),
        },
        {
          title: "Descending ranges",
          description: "Default step follows direction when omitted.",
          code: ["6..2 =>", "10..0 step -2 =>"].join("\n"),
        },
        {
          title: "Range + unit annotation",
          description: "Annotate generated unitless ranges with target units.",
          code: ["1..5 to kg =>", "0..10 step 2 to m/s =>"].join("\n"),
        },
      ],
      guardrails: [
        {
          title: "Invalid triple-dot typo",
          description: "`...` is rejected instead of silently auto-corrected.",
          code: ["1...5 =>"].join("\n"),
        },
        {
          title: "Step direction mismatch",
          description: "Step sign must match range direction.",
          code: ["0..10 step -2 =>", "10..0 step 2 =>"].join("\n"),
        },
      ],
    },
  },
  {
    fileName: "Locale.spec.md",
    slug: "locale-date-time",
    title: "Locale Date and Time",
    summary: "Write dates in familiar formats and keep date ranges predictable.",
    focus: [
      "Locale-aware parsing handles real-world date input",
      "Range routing prevents parser misclassification",
      "Errors normalize to clear, range-specific user messages",
    ],
    syntax: [
      "In `es-ES`, `DD-MM-YYYY` and `DD/MM/YYYY` are accepted date literals.",
      "Temporal ranges require `step` duration (`step 30 min`, `step 1 day`).",
      "Month stepping uses anchored day-of-month with clamp semantics.",
    ],
    checklist: [
      "Set locale intentionally before entering slash/dash-heavy dates.",
      "Add explicit temporal steps to avoid hidden assumptions.",
      "Treat timezone labels as part of result interpretation.",
    ],
    examples: {
      success: [
        {
          title: "Locale-aware literal parsing",
          description: "es-ES style date inputs resolve deterministically.",
          code: ["d = 01-02-2023", "d =>", "dt = 01-02-2023 09:30", "dt =>"].join("\n"),
        },
        {
          title: "Time slot generation",
          description: "Temporal ranges with explicit duration step.",
          code: ["09:00..11:00 step 30 min =>", "2026-01-01..2026-01-05 step 1 day =>"].join("\n"),
        },
        {
          title: "Month-end anchored stepping",
          description: "Anchor day is preserved with clamp-to-month-end behavior.",
          code: ["2026-01-31..2026-05-31 step 1 month =>"].join("\n"),
        },
      ],
      guardrails: [
        {
          title: "Missing temporal step",
          description: "Date/time ranges require explicit duration steps.",
          code: ["2026-01-01..2026-01-05 =>", "09:00..11:00 =>"].join("\n"),
        },
        {
          title: "Invalid locale date",
          description: "Bad literals should produce targeted date errors.",
          code: ["d = 32-02-2023 =>"].join("\n"),
        },
      ],
    },
  },
  {
    fileName: "FileManagement.spec.md",
    slug: "file-management",
    title: "File Management",
    summary: "Keep sheets saved locally, recoverable, and easy to export.",
    focus: [
      "No-save-button workflow via debounced persistence",
      "Flat sidebar navigation with fast rename/trash/export actions",
      "Safe recovery paths through trash view and restore",
    ],
    syntax: [
      "Sheets are plain Markdown; title inferred from first heading.",
      "Autosave commits after 1500ms idle typing by default.",
      "Drag-and-drop import supports `.md` and `.zip` bundles.",
    ],
    checklist: [
      "Treat sheet headings as the public names you expect to export/share.",
      "Use `Download All` before major migrations or browser profile changes.",
      "Check Trash before assuming data loss in deletion scenarios.",
    ],
    examples: {
      success: [
        {
          title: "Markdown-first sheet",
          description: "A sheet remains plain text and portable.",
          code: ["# Weekly planning", "hours = 38", "rate = $95/hour", "weekly pay = hours * rate =>"].join("\n"),
        },
        {
          title: "Import-ready notebook",
          description: "Structure sheets so zip/md imports stay clean and conflict-resistant.",
          code: ["# Trip budget", "hotel = EUR 240", "meals = EUR 180", "total = hotel + meals =>"].join("\n"),
        },
        {
          title: "Multi-tab safe editing",
          description: "Behavioral expectation: updates synchronize across tabs.",
          code: ["# Shared plan", "baseline = 1200", "tax = 8%", "total = baseline + baseline * tax =>"].join("\n"),
        },
      ],
      guardrails: [
        {
          title: "Title collision import",
          description: "Conflicting names should be suffixed instead of overwritten.",
          code: ["# Budget", "rent = $1250", "utilities = $185", "sum(rent, utilities) =>"].join("\n"),
        },
        {
          title: "Trash safety workflow",
          description: "Deletion should move to trash first, not hard delete by default.",
          code: ["# Notes", "backup = 1"].join("\n"),
        },
      ],
    },
  },
];

const LINEAR_DOC_ORDER = [
  "intro",
  "guides/getting-started",
  "guides/syntax-playbook",
  "guides/everyday-calculations",
  "guides/privacy-and-portability",
  "guides/troubleshooting",
  "guides/known-limitations",
  "guides/support",
  "specs/index",
  ...SPEC_CATALOG.map((entry) => `specs/${entry.slug}`),
];

const escapeYaml = (value) => value.replace(/"/g, '\\"');
const mdxStringProp = (value) => `{${JSON.stringify(value)}}`;

const stripUnneededExplicitTriggers = (code) => code.replace(/[ \t]+=>$/gm, "");

const shouldKeepExplicitTriggers = ({ title, description }) =>
  /(explicit trigger|guardrail|invalid|fail|failing|rejected|mismatch|error|unsupported|malformed|broken|cycle|typo)/i.test(
    `${title} ${description ?? ""}`,
  );

const renderPlayground = ({ title, description, code }) => {
  const playgroundCode = shouldKeepExplicitTriggers({ title, description }) ? code : stripUnneededExplicitTriggers(code);
  return `<ExamplePlayground title=${mdxStringProp(title)} description=${mdxStringProp(description)} code=${mdxStringProp(playgroundCode)} />`;
};

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const trashPath = (targetPath) => {
  if (!fs.existsSync(targetPath)) return;
  const result = spawnSync("trash", [targetPath], { encoding: "utf8" });
  if (result.status !== 0) {
    const message = result.stderr || result.stdout || "`trash` command failed";
    throw new Error(`Unable to move generated path to trash: ${targetPath}\n${message}`);
  }
};

const resetGeneratedDirs = () => {
  trashPath(specsOutDir);
  trashPath(guidesOutDir);
  ensureDir(specsOutDir);
  ensureDir(guidesOutDir);
};

const readSpecContent = (fileName) => fs.readFileSync(path.join(specsDir, fileName), "utf8");

const cleanSectionTitle = (value) =>
  value
    .replace(/^\s*[\divxlcdm]+[\)\.\-:]\s*/i, "")
    .replace(/^\s*\d+[\)\.\-:]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

const extractSectionTitles = (content) => {
  return [...content.matchAll(/^##\s+(.+)$/gm)]
    .map((match) => cleanSectionTitle(match[1]))
    .filter(Boolean);
};

const extractContractBullets = (content) => {
  const lines = content
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const chosen = [];
  for (const line of lines) {
    if (!/^[-*]\s+|^\d+[\)\.:-]\s+/.test(line)) continue;
    const normalized = line.replace(/^[-*]\s+/, "").replace(/^\d+[\)\.:-]\s+/, "").trim();
    if (!normalized) continue;
    if (normalized.length < 30 || normalized.length > 180) continue;
    if (/^#+\s/.test(normalized)) continue;
    if (/^`{3}/.test(normalized)) continue;
    if (!/(must|should|default|error|fallback|preserve|require|cannot|never|scope|guardrail|include|exclude)/i.test(normalized)) {
      continue;
    }
    if (!/[a-z]/i.test(normalized)) continue;
    if (chosen.includes(normalized)) continue;
    chosen.push(normalized);
    if (chosen.length >= 10) break;
  }

  return chosen;
};

const extractObjectLiteral = (source, marker) => {
  const start = source.indexOf(marker);
  if (start === -1) {
    throw new Error(`Marker not found: ${marker}`);
  }

  const openBrace = source.indexOf("{", start);
  if (openBrace === -1) {
    throw new Error(`Opening brace not found for: ${marker}`);
  }

  let depth = 0;
  let closeBrace = -1;

  for (let i = openBrace; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    if (ch === "}") depth -= 1;
    if (depth === 0) {
      closeBrace = i;
      break;
    }
  }

  if (closeBrace === -1) {
    throw new Error(`Closing brace not found for: ${marker}`);
  }

  return source.slice(openBrace, closeBrace + 1);
};

const loadSupportedUnits = () => {
  const registryPath = path.join(repoRoot, "src", "syntax", "registry.ts");
  const source = fs.readFileSync(registryPath, "utf8");
  const literal = extractObjectLiteral(source, "export const SUPPORTED_UNITS =");
  return Function(`\"use strict\"; return (${literal});`)();
};

const extractArrayLiteral = (source, marker) => {
  const start = source.indexOf(marker);
  if (start === -1) {
    throw new Error(`Marker not found: ${marker}`);
  }

  const assignment = source.indexOf("=", start);
  if (assignment === -1) {
    throw new Error(`Assignment not found for: ${marker}`);
  }

  const openBracket = source.indexOf("[", assignment);
  if (openBracket === -1) {
    throw new Error(`Opening bracket not found for: ${marker}`);
  }

  let depth = 0;
  let closeBracket = -1;

  for (let i = openBracket; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "[") depth += 1;
    if (ch === "]") depth -= 1;
    if (depth === 0) {
      closeBracket = i;
      break;
    }
  }

  if (closeBracket === -1) {
    throw new Error(`Closing bracket not found for: ${marker}`);
  }

  return source.slice(openBracket, closeBracket + 1);
};

const loadSiPrefixes = () => {
  const definitionsPath = path.join(repoRoot, "src", "units", "definitions.ts");
  const source = fs.readFileSync(definitionsPath, "utf8");
  const literal = extractArrayLiteral(source, "const SI_PREFIXES");
  return Function(`\"use strict\"; return (${literal});`)();
};

const loadSupportedCurrencySymbols = () => {
  const currencyPath = path.join(repoRoot, "src", "types", "CurrencyValue.ts");
  const source = fs.readFileSync(currencyPath, "utf8");
  const literal = extractObjectLiteral(source, "const CURRENCY_INFO");
  const regex = /'([^']+)'\s*:/g;
  const symbols = [];
  let match = regex.exec(literal);
  while (match) {
    symbols.push(match[1]);
    match = regex.exec(literal);
  }
  return symbols;
};

const renderUnitsReferenceSection = () => {
  const units = loadSupportedUnits();
  const siPrefixes = loadSiPrefixes();
  const currencies = loadSupportedCurrencySymbols();
  const categories = Object.values(units).filter((category) => category?.name && Array.isArray(category.units));
  const prefixGroups = [
    ["Large", siPrefixes.filter((prefix) => prefix.factor > 1)],
    ["Small", siPrefixes.filter((prefix) => prefix.factor < 1)],
  ];

  const lines = [
    "## Units and rates reference",
    "",
    "SmartPad treats units and currencies as semantic value types. Conversions and operations stay type-aware instead of string-based: compatible units convert, incompatible additions/subtractions are rejected, and multiplication/division creates derived units.",
    "",
    "The tables below are a practical quick reference, not the full boundary of what the engine can parse. The runtime also resolves SI prefixes dynamically for registered unit symbols, so families like `m`, `s`, `Pa`, `W`, `A`, `V`, `J`, `Wh`, `Hz`, `L`, `mol`, and `cd` can be used with metric prefixes where the conversion is dimensionally valid.",
    "",
    "### SI prefixes",
    "",
    "| Group | Prefixes |\n| --- | --- |",
    ...prefixGroups.map(([label, prefixes]) => {
      const rendered = prefixes.map((prefix) => `\`${prefix.symbol}\` ${prefix.name}`).join(", ");
      return `| ${label} | ${rendered} |`;
    }),
    "",
    "Prefix examples: `nm`, `mm`, `cm`, `km`, `ms`, `kPa`, `MW`, `mA`, `uA`, `µA`, `kWh`, `MHz`.",
    "",
    "### Compound unit algebra",
    "",
    "SmartPad understands products, divisions, powers, compact units, and explicit conversion targets:",
    "",
    renderPlayground({
      title: "Compound units and conversions",
      description: "Mix prefixes, derived units, compact rates, and conversion targets.",
      code: [
        "distance = 120 km",
        "time = 90 min",
        "speed = distance / time",
        "speed in m/s",
        "acceleration = 9.8 m/s^2",
        "force = 75 kg * acceleration",
        "force in N",
        "energy = force * 3 m",
        "energy in J",
        "pressure = 101.3 kPa",
        "pressure in psi",
        "surface load = 5 kg/m^2",
        "surface load in g/cm^2",
        "batch volume = 9L/min*18min",
        "batch volume in m^3",
      ].join("\n"),
    }),
    "",
    "Composite units can also be converted across prefixes when the dimensions match, for example `kg/m^2` to `g/cm^2`, `m^3` to `L`, `kWh/month` to `Wh/day`, or `$0.09/GB * 12 TB/month` after converting the traffic side to a compatible rate.",
    "",
    "Unknown plain-word labels are treated as count-style units when they are safe to interpret that way, which lets domain examples such as `task`, `ticket`, or `user/month` behave like unit-bearing values. Use explicit aliases when a project needs a stable business meaning.",
    "",
    "### Currency symbols/codes",
    "",
    currencies.map((symbol) => `\`${symbol}\``).join(", "),
    "",
  ];

  lines.push("### Named-unit quick reference");
  lines.push("");

  categories.forEach((category) => {
    lines.push(`### ${category.name}`);
    lines.push("");
    lines.push("| Symbol | Name | Aliases |\n| --- | --- | --- |");
    category.units.forEach((unit) => {
      const aliases = Array.isArray(unit.aliases) ? unit.aliases.join(", ") : "";
      lines.push(`| \`${unit.symbol}\` | ${unit.name} | ${aliases} |`);
    });
    lines.push("");
  });

  lines.push("### Rate patterns");
  lines.push("");
  lines.push(
    renderPlayground({
      title: "Rates across units",
      description: "Use rates as first-class values, then normalize the unit side before multiplying.",
      code: [
        "download = 6 Mbit/s * 2 h",
        "download in MB",
        "egress = $0.09/GB",
        "traffic = 12 TB/month",
        "billable traffic = traffic in GB/month",
        "monthly cost = egress * billable traffic",
      ].join("\n"),
    }),
  );
  lines.push("");

  return lines.join("\n");
};

const renderIntroPage = () => {
  const lines = [
    "---",
    'title: "Start Here"',
        'description: "A gentle first pass through SmartPad: what it is, why it is local-first, and where to begin."',
    "sidebar_position: 1",
    "slug: /",
    "---",
    "",
    'import ExamplePlayground from "@site/src/components/ExamplePlayground";',
    "",
    "# Start Here",
    "",
    '<div className="doc-hero doc-hero--wide">',
    '<p className="doc-hero__kicker">SmartPad in one minute</p>',
    "<h2>Plain-text thinking with live, trustworthy math</h2>",
        "<p>SmartPad is a plain-text place for working things out. You write the thought, SmartPad keeps the math honest, and the sheet stays readable tomorrow.</p>",
    "</div>",
    "",
        "## Why it feels different",
    "",
        "- **Your work stays close**: sheets live in browser storage on your machine by default.",
        "- **The file still makes sense outside the app**: exports are human-readable Markdown (`.md`).",
        "- **Numbers carry meaning**: units, currencies, durations, lists, ranges, and dates behave like values, not decoration.",
        "- **You can poke at assumptions**: chips, references, and views make a sheet easier to explore without rewriting it.",
    "",
    "## First 90-second win",
    "",
    renderPlayground({
      title: "Personal weekly plan",
      description: "Type naturally, then nudge values to explore options.",
      code: [
        "hours = 38",
        "rate = $95/hour",
        "weekly pay = hours * rate =>",
        "tax = 8.5% on weekly pay =>",
        "take home = weekly pay - tax =>",
        "take home in EUR =>",
      ].join("\n"),
    }),
    "",
        "## A good path through the docs",
    "",
    "1. **[Getting Started](./guides/getting-started)**: core mental model + first useful workflows.",
    "2. **[Syntax Playbook](./guides/syntax-playbook)**: write robust expressions and avoid common pitfalls.",
    "3. **[Everyday Calculations](./guides/everyday-calculations)**: practical examples for budgeting, planning, and analysis.",
    "4. **[Privacy and Portability](./guides/privacy-and-portability)**: understand durability, export, and local ownership.",
        "5. **[Known Limitations](./guides/known-limitations)**: know where SmartPad is careful, unfinished, or intentionally quiet.",
        "6. **[Support](./guides/support)**: report bugs, request features, and share examples safely.",
        "7. **[Feature Guides](./specs)**: go deeper on each major capability when you need the details.",
    "",
    "## What SmartPad is not",
    "",
    "- It is not a brittle formula grid where meaning is hidden in cell addresses.",
    "- It is not cloud-only lock-in requiring proprietary exports.",
    "- It is not a throwaway calculator where context gets lost.",
    "",
    "## Next",
    "",
    "Continue with [Getting Started](./guides/getting-started).",
    "",
  ];

  return `${lines.join("\n")}\n`;
};

const renderGuidePages = () => {
  const unitsReference = renderUnitsReferenceSection();

  return [
    {
      file: "getting-started.md",
      body: [
        "---",
        'title: "Getting Started"',
        "sidebar_position: 2",
        'description: "Set up your first useful SmartPad sheets and understand the core writing loop."',
        "---",
        "",
        'import ExamplePlayground from "@site/src/components/ExamplePlayground";',
        "",
        "# Getting Started",
        "",
        "SmartPad works best when you treat each line like a thought you can compute, not a cell you have to babysit.",
        "",
        "## The basic rhythm",
        "",
        "1. Write a fact or assumption in plain text.",
        "2. Let the live result tell you whether the line makes sense.",
        "3. Reuse prior results by clicking or dragging chips instead of retyping values.",
        "4. Add `=>` when you want to force a result, run a command, or show an intentional error.",
        "",
        renderPlayground({
          title: "First complete workflow",
          description: "A full mini-model using currency, percentages, and conversion.",
          code: [
            "hours = 40",
            "rate = $82/hour",
            "gross = hours * rate =>",
            "tax = 22% on gross =>",
            "net = gross - tax =>",
            "net in EUR =>",
          ].join("\n"),
        }),
        "",
        "## Habits that age well",
        "",
        "- Use names you would understand next month (`monthly rent`, `fuel cost`).",
        "- Keep one idea per line, then build from previous lines.",
        "- Put units and currencies directly on the value so assumptions are visible.",
        "",
        renderPlayground({
          title: "Range + list quick analysis",
          description: "Generate, transform, and summarize without leaving plain text.",
          code: [
            "commute mins = 28, 31, 26, 34, 29",
            "avg(commute mins) =>",
            "late days = commute mins where > 30 =>",
            "count(late days) =>",
            "weeks = 1..4 =>",
          ].join("\n"),
        }),
        "",
        "## When `=>` is still worth using",
        "",
        "- Commands and workflows that need an explicit run.",
        "- Examples where you want to show the exact error SmartPad gives.",
        "- Notes you are sharing with someone else, where an explicit result makes the sheet easier to read.",
        "",
        "## Continue",
        "",
        "- [Syntax Playbook](../syntax-playbook)",
        "- [Everyday Calculations](../everyday-calculations)",
        "",
      ].join("\n"),
    },
    {
      file: "syntax-playbook.md",
      body: [
        "---",
        'title: "Syntax Playbook"',
        "sidebar_position: 3",
        'description: "Write SmartPad sheets that stay readable as they grow."',
        "---",
        "",
        'import ExamplePlayground from "@site/src/components/ExamplePlayground";',
        "",
        "# Syntax Playbook",
        "",
        "## Patterns worth remembering",
        "",
        "- Put units and currency right next to the value (`$85/hour`, `9 L/min`).",
        "- Use `to` or `in` when you want a conversion.",
        "- Use lists (`a, b, c`) and ranges (`1..10`) instead of hand-writing repeated values.",
        "- Use plain phrases for everyday math (`tax on`, `discount off`, `as %`).",
        "",
        renderPlayground({
          title: "Syntax essentials",
          description: "Small patterns that make a sheet easier to read and change.",
          code: [
            "subtotal = $128",
            "tax = 8.5%",
            "total = subtotal + subtotal * tax =>",
            "distance = 42 km",
            "distance in mi =>",
            "scores = 71, 77, 84, 90, 94",
            "avg(scores) =>",
          ].join("\n"),
        }),
        "",
        "## A few things to watch",
        "",
        "- Use `to` or `in` for conversions; `->` is just text to SmartPad.",
        "- When you multiply two lists together, make sure they have matching lengths.",
        "- Give time ranges an explicit `step` so the interval is unambiguous.",
        "- Write `min` for minutes when `m` could be read as meters.",
        "",
        renderPlayground({
          title: "Clear errors are useful",
          description: "These examples are intentionally wrong, so you can see how SmartPad responds.",
          code: ["1...5 =>", "a = 1, 2, 3", "b = 10, 20", "a + b =>", "2026-01-01..2026-01-05 =>"].join("\n"),
        }),
        "",
        unitsReference,
        "",
      ].join("\n"),
    },
    {
      file: "everyday-calculations.md",
      body: [
        "---",
        'title: "Everyday Calculations"',
        "sidebar_position: 4",
        'description: "Practical SmartPad examples for budgeting, planning, travel, work, and data."',
        "---",
        "",
        'import ExamplePlayground from "@site/src/components/ExamplePlayground";',
        "",
        "# Everyday Calculations",
        "",
        "The fastest way to learn SmartPad is to start from a real little sheet and change the assumptions. Every example here is meant to be copied, opened, and edited.",
        "",
        "## Personal finance",
        "",
        renderPlayground({
          title: "Monthly budget with category shares",
          description: "A small budget you can adjust without building a spreadsheet.",
          code: [
            "rent = $1250",
            "utilities = $185",
            "internet = $75",
            "groceries = $420",
            "expenses = rent, utilities, internet, groceries",
            "total = sum(expenses) =>",
            "expenses / total as % =>",
          ].join("\n"),
        }),
        "",
        "## Travel",
        "",
        renderPlayground({
          title: "Trip cost with FX",
          description: "Add costs in one currency, then view the trip in another.",
          code: [
            "hotel = EUR 240",
            "food = EUR 180",
            "transport = EUR 90",
            "trip eur = hotel + food + transport =>",
            "trip eur in USD =>",
          ].join("\n"),
        }),
        "",
        "## Work planning",
        "",
        renderPlayground({
          title: "Hourly rate planning",
          description: "Turn one hourly rate into weekly and monthly planning numbers.",
          code: [
            "hourly = $85/hour",
            "weekly hours = 38",
            "monthly hours = weekly hours * 4.33 =>",
            "weekly pay = hourly * weekly hours =>",
            "monthly pay = hourly * monthly hours =>",
          ].join("\n"),
        }),
        "",
        "## Scheduling",
        "",
        renderPlayground({
          title: "Time slots and date ranges",
          description: "Generate planning windows without hand-writing every date or time.",
          code: [
            "slots = 09:00..11:00 step 30 min =>",
            "sprint days = 2026-01-01..2026-01-14 step 1 day =>",
            "review cadence = 2026-01-31..2026-05-31 step 1 month =>",
          ].join("\n"),
        }),
        "",
        "## Engineering/data",
        "",
        renderPlayground({
          title: "Bandwidth and storage",
          description: "Let rates, storage units, and billing units do the bookkeeping.",
          code: [
            "download = 6 Mbit/s * 2 h =>",
            "download to GB =>",
            "egress = $0.09/GB",
            "traffic = 12 TB/month",
            "monthly egress = egress * (traffic in GB/month) =>",
          ].join("\n"),
        }),
        "",
      ].join("\n"),
    },
    {
      file: "privacy-and-portability.md",
      body: [
        "---",
        'title: "Privacy and Portability"',
        "sidebar_position: 5",
        'description: "How SmartPad stores your work, what stays local, and how to keep important sheets portable."',
        "---",
        "",
        "# Privacy and Portability",
        "",
        "SmartPad is built around a simple idea: your notes and calculations should still belong to you after the tool is closed.",
        "",
        "- **Local-first storage**: sheets are saved in your browser using IndexedDB.",
        "- **Readable exports**: your content remains plain Markdown text.",
        "- **Easy escape hatch**: download one sheet as `.md`, or export everything as a zip.",
        "- **Recoverable deletes**: trash/restore flows help prevent accidental permanent loss.",
        "- **No hidden sheet telemetry**: SmartPad does not send sheet text, calculations, variables, or imported files to a SmartPad backend.",
        "",
        "## How saving works",
        "",
        "SmartPad autosaves after you pause typing, keeps the same sheet identity when a title changes, and coordinates updates across tabs. The main thing to remember is that browser storage belongs to the browser profile, so profile resets, private browsing, or cleanup tools can remove local data.",
        "",
        "## Signup and analytics",
        "",
        "A future update signup belongs to the website, not to your sheets.",
        "",
        "- You should not need to sign up just to use SmartPad.",
        "- Website analytics, if enabled, should measure the website only.",
        "- Analytics should not collect sheet content, calculation text, imported files, or local sheet metadata.",
        "- Any provider used for updates or analytics should be disclosed where people sign up.",
        "",
        "## Currency and external rates",
        "",
        "Currency conversion may use external FX providers and cached data:",
        "",
        "- Fiat and crypto rate availability depends on provider uptime and network access.",
        "- When offline or unavailable, SmartPad can use cached rates when present.",
        "- FX rates are useful for planning, but they are not guaranteed market quotes.",
        "- Do not use SmartPad FX output as financial, tax, legal, or investment advice.",
        "",
        "## Desktop beta status",
        "",
        "Desktop builds are still a beta path. Use the web app as the dependable default until packaged builds are clearly marked and tested.",
        "",
        "- Early desktop builds may be unsigned and may show operating-system warnings.",
        "- Release notes should say exactly which platforms were built and smoke-tested.",
        "",
        "## What to do before sharing publicly",
        "",
        "- Export a `.md` copy of critical sheets.",
        "- Use `Download All` before browser/profile migrations.",
        "- Confirm sensitive notes are removed from examples before posting screenshots.",
        "",
        "## Make sheets easier to keep",
        "",
        "- Give important models clear Markdown headings.",
        "- Keep units and currencies explicit so values make sense outside the UI.",
        "- Archive long-lived work as exported `.md` files in storage you control.",
        "",
        "## When to ask for help",
        "",
        "Use [Support](../support) for wrong calculations, storage/import/export problems, settings bugs, docs errors, or beta feedback.",
        "",
        "## Related details",
        "",
        "- [File Management](../../specs/file-management)",
        "",
      ].join("\n"),
    },
    {
      file: "troubleshooting.md",
      body: [
        "---",
        'title: "Troubleshooting"',
        "sidebar_position: 6",
        'description: "Simple ways to narrow down syntax, conversion, and range issues."',
        "---",
        "",
        'import ExamplePlayground from "@site/src/components/ExamplePlayground";',
        "",
        "# Troubleshooting",
        "",
        "## If a conversion does not work",
        "",
        "- Check that you used `to` or `in`, and that the unit or currency is spelled the way SmartPad expects.",
        "- Make sure the units are the same kind of thing. `km` can become `m`; `kg` cannot become `s`.",
        "- For currency conversion, rates need either a live source or cached data.",
        "",
        "## If a range fails",
        "",
        "- Use `..` to generate a range.",
        "- For dates and times, include a duration step such as `step 1 day` or `step 30 min`.",
        "- Make sure the step moves in the same direction as the range.",
        "",
        "## If list math fails",
        "",
        "- Pairwise list math works best when both lists have the same length.",
        "- Start with flat lists before trying nested ones.",
        "- Keep units compatible inside the same list operation.",
        "",
        renderPlayground({
          title: "Debug by simplification",
          description: "Split a failing expression into explicit intermediate lines.",
          code: [
            "prices = $10, $20, $30",
            "qty = 2, 1, 3",
            "line totals = prices * qty =>",
            "sum(line totals) =>",
            "bad qty = 2, 1",
            "prices * bad qty =>",
          ].join("\n"),
        }),
        "",
        "## If something still feels off",
        "",
        "These deeper pages can help when you want the exact behavior for one feature:",
        "",
        ...SPEC_CATALOG.map((entry) => `- [${entry.title}](../../specs/${entry.slug})`),
        "",
        "## Report a reproducible problem",
        "",
        "If the issue still happens after simplification, open [Support](../support) and include the smallest sheet text that demonstrates the behavior.",
        "",
        "For wrong calculations, data loss, storage/import/export problems, settings issues, or docs errors, use the linked bug report form from the support page.",
        "",
      ].join("\n"),
    },
    {
      file: "known-limitations.md",
      body: [
        "---",
        'title: "Known Limitations"',
        "sidebar_position: 7",
        'description: "A plain-language view of what works today, where SmartPad is careful, and how to protect important work."',
        "---",
        "",
        "# Known Limitations",
        "",
        "SmartPad is useful today, but it is better to be clear about its edges. This page is here so you know what to trust, what to double-check, and what is not part of the app yet.",
        "",
        "## Your sheets live in this browser",
        "",
        "- SmartPad does not currently have accounts, cloud sync, team workspaces, or collaboration.",
        "- Sheets are stored locally in the browser profile with IndexedDB.",
        "- Browser profile resets, device migrations, private browsing, or storage cleanup tools can remove local data.",
        "- Use `Download All` before changing browsers, devices, or profiles.",
        "",
        "## Privacy boundaries",
        "",
        "- The app does not send sheet content to a SmartPad backend.",
        "- There is no hidden in-app telemetry for sheet text, calculations, variables, or imported files.",
        "- If the website later offers update signup or analytics, that should be explained separately from app usage.",
        "",
        "## Currency and external data",
        "",
        "- Currency conversions can depend on external FX providers and cached rates.",
        "- If rates are unavailable, SmartPad should make that visible instead of pretending nothing happened.",
        "- Treat FX values as planning data, not financial advice or guaranteed market quotes.",
        "",
        "## Desktop app",
        "",
        "- Desktop packaging is expected to start as a beta path.",
        "- Until signed installers exist, use the web app as the main version.",
        "- Unsigned beta builds may trigger operating-system warnings and should be labeled clearly.",
        "",
        "## Not in the app yet",
        "",
        "These are common things people may expect, but they are not part of SmartPad today:",
        "",
        "- Cloud sync, accounts, and collaboration",
        "- Full structured tables",
        "- AI-generated formulas",
        "- Auto-suggested plots as a finished workflow",
        "- Timezone and business-day date keywords",
        "- Plugin marketplace or plugin system",
        "- Signed desktop installers for every operating system",
        "",
        "## Good habits",
        "",
        "- Keep important models backed up as plain Markdown exports.",
        "- Remove sensitive data before posting screenshots, videos, or issue examples.",
        "- Check [Support](../support) when a calculation looks wrong, storage behaves unexpectedly, or import/export does not work.",
        "",
      ].join("\n"),
    },
    {
      file: "support.md",
      body: [
        "---",
        'title: "Support"',
        "sidebar_position: 8",
        'description: "Report bugs, request features, and share reproducible SmartPad examples safely."',
        "---",
        "",
        "# Support",
        "",
        "For now, SmartPad support happens through GitHub issues. The most helpful reports are small, specific, and safe to share publicly.",
        "",
        "## Report a bug",
        "",
        "Use the [bug report form](https://github.com/nmaxcom/SmartPad/issues/new?template=bug_report.yml) when SmartPad gives a wrong result, fails to load, loses expected local state, or breaks an import/export/settings workflow.",
        "",
        "Include:",
        "",
        "- App URL or build where it happened",
        "- Browser and operating system",
        "- Exact sheet text needed to reproduce the issue",
        "- Expected result and actual result",
        "- Screenshot or short recording when the issue is visual",
        "- Exported `.md` sample only if it does not contain sensitive data",
        "",
        "## Request a feature",
        "",
        "Use the [feature request form](https://github.com/nmaxcom/SmartPad/issues/new?template=feature_request.md) for new workflows, syntax ideas, platform requests, or anything that would make SmartPad more useful in your day-to-day work.",
        "",
        "Useful feature requests explain:",
        "",
        "- The job you are trying to complete",
        "- Why current SmartPad behavior is not enough",
        "- A small example sheet or screenshot",
        "- Whether the request matters for web, desktop, mobile, or all platforms",
        "",
        "## What gets looked at first",
        "",
        "When several issues arrive at once, the most serious ones should come first:",
        "",
        "1. Wrong calculations or misleading results",
        "2. App load failures",
        "3. Storage, trash/restore, import, export, or download issues",
        "4. Settings, locale/date, currency, or first-run onboarding problems",
        "5. Docs routing, broken links, and unclear examples",
        "6. Visual polish and enhancement requests",
        "",
        "## Privacy before sharing",
        "",
        "SmartPad sheets are plain text. Remove personal, financial, client, or credential-like content before pasting examples into public issues.",
        "",
        "When a private example is required to reproduce a problem, first reduce it to the smallest anonymous sheet that still fails.",
        "",
        "## Related pages",
        "",
        "- [Troubleshooting](../troubleshooting)",
        "- [Known Limitations](../known-limitations)",
        "- [Privacy and Portability](../privacy-and-portability)",
        "",
      ].join("\n"),
    },
  ];
};

const renderSpecIndexPage = (entries) => {
  const lines = [
    "---",
    'title: "Feature Guides"',
    "sidebar_position: 9",
    'description: "A deeper, user-facing guide to each major SmartPad feature."',
    "---",
    "",
    "# Feature Guides",
    "",
    "These pages go deeper than the quick guides. Use them when you want to understand one SmartPad feature well enough to rely on it in a real sheet.",
    "",
    "## Read in order",
    "",
    ...entries.map((entry, idx) => `${idx + 1}. [${entry.title}](./${entry.slug}) - ${entry.summary}`),
    "",
  ];

  return `${lines.join("\n")}\n`;
};

const renderSpecPage = (entry, content, sidebarPosition) => {
  const lines = [
    "---",
    `title: \"${escapeYaml(entry.title)}\"`,
    `description: \"${escapeYaml(entry.summary)}\"`,
    `sidebar_position: ${sidebarPosition}`,
    "---",
    "",
    'import ExamplePlayground from "@site/src/components/ExamplePlayground";',
    "",
    `<div className=\"doc-hero\">`,
    `<p className=\"doc-hero__kicker\">Feature Guide</p>`,
    `<h2>${entry.title}</h2>`,
    `<p>${entry.summary}</p>`,
    "</div>",
    "",
    "## What this helps with",
    "",
    ...entry.focus.map((item) => `- ${item}`),
    "",
    "## How to use it",
    "",
    ...entry.syntax.map((item) => `- ${item}`),
    "",
    "## Examples to try",
    "",
    ...entry.examples.success.flatMap((example) => [renderPlayground(example), ""]),
    "## When SmartPad should push back",
    "",
    ...entry.examples.guardrails.flatMap((example) => [renderPlayground(example), ""]),
    "## Good habits",
    "",
    ...entry.checklist.map((item) => `- ${item}`),
    "",
  ];

  return lines.join("\n");
};

const writeSidebar = () => {
  const lines = [
    'import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";',
    "",
    "const sidebars: SidebarsConfig = {",
    "  docsSidebar: [",
    ...LINEAR_DOC_ORDER.map((id) => `    \"${id}\",`),
    "  ],",
    "};",
    "",
    "export default sidebars;",
    "",
  ];

  fs.writeFileSync(path.join(repoRoot, "website", "sidebars.ts"), lines.join("\n"), "utf8");
};

const writeDocs = () => {
  fs.writeFileSync(path.join(docsRoot, "intro.md"), renderIntroPage(), "utf8");

  const guidePages = renderGuidePages();
  guidePages.forEach((page) => {
    fs.writeFileSync(path.join(guidesOutDir, page.file), page.body, "utf8");
  });

  fs.writeFileSync(path.join(specsOutDir, "index.md"), renderSpecIndexPage(SPEC_CATALOG), "utf8");

  SPEC_CATALOG.forEach((entry, index) => {
    const content = readSpecContent(entry.fileName);
    const sidebarPosition = 10 + index;
    fs.writeFileSync(
      path.join(specsOutDir, `${entry.slug}.md`),
      renderSpecPage(entry, content, sidebarPosition),
      "utf8",
    );
  });

  return guidePages.length;
};

const main = () => {
  ensureDir(docsRoot);
  resetGeneratedDirs();
  const guidePageCount = writeDocs();
  writeSidebar();
  console.log(
    `Generated docs: ${SPEC_CATALOG.length} feature pages, ${guidePageCount} guide pages, flat sidebar.`
  );
};

main();
