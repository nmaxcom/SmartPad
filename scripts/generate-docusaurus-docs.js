const fs = require("node:fs");
const path = require("node:path");

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
    summary: "See valid results while typing, without adding `=>` on every line.",
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
      "Use explicit `=>` on lines where you want deliberate, explicit result intent.",
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
    summary: "Reuse results as draggable, copyable chips with stable dependency links.",
    focus: [
      "Live and trigger results share one interaction contract",
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
    summary: "Turn expressions into exploratory views with `@view` directives.",
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
    summary: "Treat currency as first-class units with live FX + manual overrides.",
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
    summary: "Work with duration literals, time-of-day math, and datetime arithmetic.",
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
    summary: "Model repeated values with aggregation, mapping, filtering, and zip math.",
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
    summary: "Generate numeric/date/time lists with predictable `..` span semantics.",
    focus: [
      "`..` builds sequences faster than manual list typing",
      "Step semantics are explicit, directional, and guardrailed",
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
    summary: "Parse locale-friendly dates and route temporal ranges reliably.",
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
    summary: "Local-first sheet durability with autosave, trash, import, and export.",
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
  "specs/index",
  ...SPEC_CATALOG.map((entry) => `specs/${entry.slug}`),
];

const escapeYaml = (value) => value.replace(/"/g, '\\"');
const mdxStringProp = (value) => `{${JSON.stringify(value)}}`;

const renderPlayground = ({ title, description, code }) =>
  `<ExamplePlayground title=${mdxStringProp(title)} description=${mdxStringProp(description)} code=${mdxStringProp(code)} />`;

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const resetGeneratedDirs = () => {
  fs.rmSync(specsOutDir, { recursive: true, force: true });
  fs.rmSync(guidesOutDir, { recursive: true, force: true });
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
  const currencies = loadSupportedCurrencySymbols();
  const categories = Object.values(units).filter((category) => category?.name && Array.isArray(category.units));

  const lines = [
    "## Units and rates reference",
    "",
    "SmartPad treats units and currencies as semantic value types. Conversions and operations stay type-aware instead of string-based.",
    "",
    "### Currency symbols/codes",
    "",
    currencies.map((symbol) => `\`${symbol}\``).join(", "),
    "",
  ];

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
  lines.push("```smartpad");
  lines.push("download = 6 Mbit/s * 2 h =>");
  lines.push("download to MB =>");
  lines.push("egress = $0.09/GB");
  lines.push("traffic = 12 TB/month");
  lines.push("cost = egress * (traffic in GB/month) =>");
  lines.push("```");
  lines.push("");

  return lines.join("\n");
};

const renderIntroPage = () => {
  const lines = [
    "---",
    'title: "Start Here"',
    'description: "Understand what SmartPad is, why it is local-first, and how to learn it in a practical order."',
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
    "<p>SmartPad is a text-native calculation workspace. You write normal lines, get semantic results immediately, and keep everything as portable Markdown you control.</p>",
    "</div>",
    "",
    "## Why people pick SmartPad",
    "",
    "- **Local-first by default**: your sheets persist in browser storage on your machine, not in a forced cloud backend.",
    "- **Plain-text portability**: files remain human-readable Markdown (`.md`), so your data stays future-proof.",
    "- **Semantic math**: units, currencies, durations, lists, ranges, and locale-aware dates behave like real values.",
    "- **Explorable models**: chips, references, and `@view` directives turn static notes into interactive decision tools.",
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
    "## Learn in this order",
    "",
    "1. **[Getting Started](./guides/getting-started)**: core mental model + first useful workflows.",
    "2. **[Syntax Playbook](./guides/syntax-playbook)**: write robust expressions and avoid common pitfalls.",
    "3. **[Everyday Calculations](./guides/everyday-calculations)**: practical examples for budgeting, planning, and analysis.",
    "4. **[Privacy and Portability](./guides/privacy-and-portability)**: understand durability, export, and local ownership.",
    "5. **[Feature Contracts](./specs)**: deep behavior guarantees for each major capability.",
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
        "SmartPad works best when you treat each line like a thought you can compute, not a cell you have to manage.",
        "",
        "## Core loop",
        "",
        "1. Write a fact or assumption as plain text math.",
        "2. Let live results validate your direction while typing.",
        "3. Add `=>` when you want explicit result intent on a line.",
        "4. Reuse prior results by clicking/dragging chips instead of retyping.",
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
        "## Practical defaults",
        "",
        "- Use descriptive variable names (`monthly rent`, `fuel cost`) to keep sheets readable.",
        "- Keep one concept per line and chain values with references.",
        "- Use units and currencies directly in the value to avoid hidden assumptions.",
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
        "## When to use `=>` explicitly",
        "",
        "- Final outputs you plan to share or screenshot.",
        "- Lines where explicit trigger improves readability for reviewers.",
        "- Guardrail checks where you want intentional error surfacing.",
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
        'description: "Write SmartPad syntax that remains readable and robust as models grow."',
        "---",
        "",
        'import ExamplePlayground from "@site/src/components/ExamplePlayground";',
        "",
        "# Syntax Playbook",
        "",
        "## Reliable expression patterns",
        "",
        "- Attach units/currency directly to values (`$85/hour`, `9 L/min`).",
        "- Use `to` / `in` for explicit conversions.",
        "- Use lists (`a, b, c`) and ranges (`1..10`) instead of manual repetition.",
        "- Use phrase operators for business math (`tax on`, `discount off`, `as %`).",
        "",
        renderPlayground({
          title: "Syntax essentials",
          description: "Common patterns you will use daily.",
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
        "## Prevent avoidable mistakes",
        "",
        "- Do not use `->` for conversions; use `to`/`in`.",
        "- Keep list lengths aligned for pairwise operations.",
        "- Add explicit `step` for temporal ranges.",
        "- Prefer `min` for minutes when `m` could mean meters.",
        "",
        renderPlayground({
          title: "Guardrail sampler",
          description: "Examples that should fail clearly.",
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
        'description: "Runnable SmartPad examples for real life budgeting, planning, and analysis."',
        "---",
        "",
        'import ExamplePlayground from "@site/src/components/ExamplePlayground";',
        "",
        "# Everyday Calculations",
        "",
        "These examples are spec-grounded and use valid SmartPad syntax so you can copy, run, and adapt immediately.",
        "",
        "## Personal finance",
        "",
        renderPlayground({
          title: "Monthly budget with category shares",
          description: "Compute totals and contribution percentages.",
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
          description: "Mix local costs and convert to your reporting currency.",
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
          description: "Project weekly/monthly scenarios from one base rate.",
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
          description: "Generate planning windows with explicit temporal steps.",
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
          description: "Use compound units and convert cleanly.",
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
        'description: "Understand SmartPad’s local-first storage model and plain-text portability."',
        "---",
        "",
        "# Privacy and Portability",
        "",
        "SmartPad is designed so your work remains yours:",
        "",
        "- **Local-first persistence**: sheets are stored in your browser via IndexedDB.",
        "- **No proprietary lock-in format**: content remains plain Markdown text.",
        "- **Import/export flexibility**: individual `.md` download plus bulk zip workflows.",
        "- **Recoverability**: trash/restore flows prevent accidental hard deletion.",
        "",
        "## Durability model",
        "",
        "1. Typing is autosaved after idle debounce (default spec target: 1500ms).",
        "2. Multi-tab synchronization uses broadcast events to prevent stale tab overwrite.",
        "3. Sheet identity is stable even when titles change.",
        "",
        "## What to do before sharing publicly",
        "",
        "- Export a `.md` copy of critical sheets.",
        "- Use `Download All` before browser/profile migrations.",
        "- Confirm sensitive notes are removed from examples before posting screenshots.",
        "",
        "## Future-proofing checklist",
        "",
        "- Keep important models in descriptive Markdown headings.",
        "- Prefer explicit units/currencies so values retain meaning outside SmartPad UI.",
        "- Store long-term archives as exported `.md` files in your own versioned storage.",
        "",
        "## Related deep contract",
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
        'description: "Fast diagnosis patterns for SmartPad syntax, conversion, and range issues."',
        "---",
        "",
        'import ExamplePlayground from "@site/src/components/ExamplePlayground";',
        "",
        "# Troubleshooting",
        "",
        "## If a conversion fails",
        "",
        "- Check target syntax (`to`/`in`) and unit/currency spelling.",
        "- Ensure source and target dimensions are compatible.",
        "- For FX conversions, confirm rate source or manual override availability.",
        "",
        "## If a range fails",
        "",
        "- Use `..` (not `to`) for generation.",
        "- For temporal ranges, include explicit duration step.",
        "- Verify step sign matches direction.",
        "",
        "## If list math fails",
        "",
        "- Validate list lengths for pairwise operations.",
        "- Avoid nested lists in aggregators unless operation supports them.",
        "- Keep unit dimensions compatible inside one list operation.",
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
        "## If behavior still feels off",
        "",
        "Open the precise behavior contract for that feature:",
        "",
        ...SPEC_CATALOG.map((entry) => `- [${entry.title}](../../specs/${entry.slug})`),
        "",
      ].join("\n"),
    },
  ];
};

const renderSpecIndexPage = (entries) => {
  const lines = [
    "---",
    'title: "Feature Contracts"',
    "sidebar_position: 7",
    'description: "Deep behavior guarantees for every major SmartPad feature."',
    "---",
    "",
    "# Feature Contracts",
    "",
    "Each page below translates the authoritative spec into a practical guide with runnable examples and guardrail scenarios.",
    "",
    "## Read in order",
    "",
    ...entries.map((entry, idx) => `${idx + 1}. [${entry.title}](./${entry.slug}) - ${entry.summary}`),
    "",
    "## Source of truth",
    "",
    "Canonical spec documents live under `docs/Specs/*.spec.md` in the repository.",
    "",
  ];

  return `${lines.join("\n")}\n`;
};

const renderSpecPage = (entry, content, sidebarPosition) => {
  const sections = extractSectionTitles(content);
  const contractBullets = extractContractBullets(content);
  const contractSection = (contractBullets.length ? contractBullets : sections).slice(0, 10);

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
    `<p className=\"doc-hero__kicker\">Feature Contract</p>`,
    `<h2>${entry.title}</h2>`,
    `<p>${entry.summary}</p>`,
    "</div>",
    "",
    "## What this feature gives you",
    "",
    ...entry.focus.map((item) => `- ${item}`),
    "",
    "## Syntax and usage contract",
    "",
    ...entry.syntax.map((item) => `- ${item}`),
    "",
    "## Runnable examples",
    "",
    ...entry.examples.success.flatMap((example) => [renderPlayground(example), ""]),
    "## Guardrail examples",
    "",
    ...entry.examples.guardrails.flatMap((example) => [renderPlayground(example), ""]),
    "## Critical behavior rules",
    "",
    ...contractSection.map((rule) => `- ${rule}`),
    "",
    "## Power-user checklist",
    "",
    ...entry.checklist.map((item) => `- ${item}`),
    "",
    `<p className=\"doc-footnote\">Authoritative spec: <a href=\"https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/${entry.fileName}\">docs/Specs/${entry.fileName}</a></p>`,
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

  renderGuidePages().forEach((page) => {
    fs.writeFileSync(path.join(guidesOutDir, page.file), page.body, "utf8");
  });

  fs.writeFileSync(path.join(specsOutDir, "index.md"), renderSpecIndexPage(SPEC_CATALOG), "utf8");

  SPEC_CATALOG.forEach((entry, index) => {
    const content = readSpecContent(entry.fileName);
    const sidebarPosition = 8 + index;
    fs.writeFileSync(
      path.join(specsOutDir, `${entry.slug}.md`),
      renderSpecPage(entry, content, sidebarPosition),
      "utf8",
    );
  });
};

const main = () => {
  ensureDir(docsRoot);
  resetGeneratedDirs();
  writeDocs();
  writeSidebar();
  console.log(`Generated docs: ${SPEC_CATALOG.length} feature pages, 5 guide pages, flat sidebar.`);
};

main();
