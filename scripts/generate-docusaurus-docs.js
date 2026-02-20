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
    category: "Core Experience",
    summary:
      "See valid results while typing and keep the editing flow uninterrupted.",
    why: "Live feedback is the core reason SmartPad feels faster than spreadsheets.",
  },
  {
    fileName: "ResultChipsAndValueGraph.spec.md",
    slug: "result-chips-and-references",
    title: "Result Chips and References",
    category: "Core Experience",
    summary:
      "Reuse computed values safely with chips, hidden references, and dependency awareness.",
    why: "Turn one-off lines into composable building blocks without losing readability.",
  },
  {
    fileName: "Plotting.spec.md",
    slug: "plotting-and-dependency-views",
    title: "Plotting and Dependency Views",
    category: "Core Experience",
    summary:
      "Visualize behavior from expressions, dependencies, and exploratory model changes.",
    why: "Great docs should help users jump from numbers to insight immediately.",
  },
  {
    fileName: "Currency.spec.md",
    slug: "currency-and-fx",
    title: "Currency and FX",
    category: "Math and Units",
    summary:
      "Model money with robust unit behavior, conversion syntax, and FX source rules.",
    why: "Global planning only works when conversion behavior is explicit and trustworthy.",
  },
  {
    fileName: "duration.spec.md",
    slug: "duration-and-time-values",
    title: "Duration and Time Values",
    category: "Math and Units",
    summary:
      "Work with durations, time-of-day values, and datetime arithmetic safely.",
    why: "Time math breaks quickly unless syntax and precedence are consistent.",
  },
  {
    fileName: "Lists.spec.md",
    slug: "lists",
    title: "Lists",
    category: "Data and Collections",
    summary:
      "Aggregate, map, filter, sort, and index data with unit-aware operations.",
    why: "Lists let SmartPad behave like a mini analytics notebook without heavy tooling.",
  },
  {
    fileName: "Ranges.spec.md",
    slug: "ranges",
    title: "Ranges",
    category: "Data and Collections",
    summary:
      "Generate numeric and date ranges for plans, projections, and schedules.",
    why: "Range generation removes repetitive manual input and keeps models editable.",
  },
  {
    fileName: "Locale.spec.md",
    slug: "locale-date-time",
    title: "Locale Date and Time",
    category: "Data and Collections",
    summary:
      "Parse and format dates predictably across locale-specific inputs and outputs.",
    why: "Cross-region workflows fail unless date interpretation is deterministic.",
  },
  {
    fileName: "FileManagement.spec.md",
    slug: "file-management",
    title: "File Management",
    category: "Workspace",
    summary:
      "Ensure durable sheets with autosave, import/export, trash, and tab sync behavior.",
    why: "Data durability is part of product trust, not a secondary concern.",
  },
];

const CATEGORY_ORDER = ["Core Experience", "Math and Units", "Data and Collections", "Workspace"];

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const loadSupportedUnits = () => {
  const registryPath = path.join(repoRoot, "src", "syntax", "registry.ts");
  const source = fs.readFileSync(registryPath, "utf8");
  const marker = "export const SUPPORTED_UNITS =";
  const start = source.indexOf(marker);
  if (start === -1) {
    throw new Error("SUPPORTED_UNITS declaration not found in syntax registry.");
  }

  const openBrace = source.indexOf("{", start);
  if (openBrace === -1) {
    throw new Error("SUPPORTED_UNITS object opening brace not found.");
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
    throw new Error("SUPPORTED_UNITS object closing brace not found.");
  }

  const objectLiteral = source.slice(openBrace, closeBrace + 1);
  return Function(`"use strict"; return (${objectLiteral});`)();
};

const renderUnitsReferenceSection = () => {
  const units = loadSupportedUnits();
  const categories = Object.values(units);
  const totalUnits = categories.reduce((count, category) => count + category.units.length, 0);
  const lines = [
    "## Supported units reference",
    "",
    `Total supported units: **${totalUnits}**`,
    "",
  ];

  categories.forEach((category) => {
    lines.push(`### ${category.name}`);
    lines.push("");
    lines.push("| Symbol | Name | Aliases |");
    lines.push("| --- | --- | --- |");
    category.units.forEach((unit) => {
      lines.push(`| \`${unit.symbol}\` | ${unit.name} | ${unit.aliases.join(", ")} |`);
    });
    lines.push("");
  });

  return lines.join("\n");
};

const escapeYaml = (value) => value.replace(/"/g, '\\"');
const readSpecContent = (fileName) => fs.readFileSync(path.join(specsDir, fileName), "utf8");

const extractSections = (content) => {
  const matches = [...content.matchAll(/^##\s+(.+)$/gm)];
  return matches.slice(0, 10).map((match) => match[1].trim());
};

const extractCodeBlocks = (content) => {
  const blocks = [];
  const regex = /```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g;
  let match = regex.exec(content);
  while (match) {
    const body = match[2].trim();
    if (body) blocks.push(body);
    match = regex.exec(content);
  }
  return blocks;
};

const pickExamples = (blocks) => {
  const positive = blocks.find((block) => !/⚠️|error|invalid|fail|guardrail/i.test(block)) || "";
  const edgeCase = blocks.find((block) => /⚠️|error|invalid|fail|guardrail/i.test(block)) || "";
  return { positive, edgeCase };
};

const sectionKey = (title) => title.toLowerCase();
const cleanSectionTitle = (value) =>
  value
    .replace(/^\s*[\divxlcdm]+[\)\.\-:]\s*/i, "")
    .replace(/^\s*\d+[\)\.\-:]\s*/, "")
    .trim();

const inferPitfalls = (entry, sections) => {
  const has = (pattern) => sections.some((section) => pattern.test(sectionKey(section)));
  const items = [];

  if (has(/syntax|parsing/)) {
    items.push("Use exact SmartPad syntax first, then optimize for brevity.");
  }
  if (has(/edge|guardrail|error/)) {
    items.push("Check edge and guardrail behavior before scaling your sheet.");
  }
  if (has(/format|display|locale/)) {
    items.push("Treat formatted display as presentation, not implicit conversion logic.");
  }
  if (/currency|duration|locale|ranges|lists/.test(entry.slug)) {
    items.push("Keep context explicit (units, currencies, locale) when composing formulas.");
  }
  if (!items.length) {
    items.push("Build complex formulas from named intermediate lines for reliability.");
  }

  return items.slice(0, 3);
};

const inferUseCases = (entry) => {
  if (entry.slug === "currency-and-fx") {
    return [
      "You plan across currencies and need conversion rules that users can trust.",
      "You compare scenarios with manual rates versus live FX behavior.",
      "You want readable outputs without losing unit correctness.",
    ];
  }
  if (entry.slug.includes("list") || entry.slug.includes("range")) {
    return [
      "You model repeated values or time windows quickly.",
      "You need aggregates and filtering without exporting to another tool.",
      "You want the sheet to stay editable while logic grows.",
    ];
  }
  if (entry.slug.includes("file")) {
    return [
      "You need confidence that work is saved and recoverable.",
      "You collaborate across tabs or import/export workflows.",
      "You want predictable behavior for trash and restoration.",
    ];
  }
  return [
    "You want faster iteration without switching contexts.",
    "You need readable formulas that teammates can follow.",
    "You want reliable behavior under real user inputs.",
  ];
};

const mdxStringProp = (value) => `{${JSON.stringify(value)}}`;

const renderPlayground = ({ title, description, code }) =>
  `<ExamplePlayground title=${mdxStringProp(title)} description=${mdxStringProp(description)} code=${mdxStringProp(code)} />`;

const renderExamples = (entry, examples) => {
  if (!examples.positive && !examples.edgeCase) {
    return [
      "## Try it in SmartPad",
      "",
      "Examples for this feature are being backfilled. Add examples in the source spec and regenerate docs.",
      "",
    ].join("\n");
  }

  const lines = [
    "## Try it in SmartPad",
    "",
    renderPlayground({
      title: `${entry.title}: quick win`,
      description: "Run this interactive example and tweak values immediately.",
      code: examples.positive || examples.edgeCase,
    }),
    "",
  ];

  if (examples.edgeCase && examples.edgeCase !== examples.positive) {
    lines.push(
      renderPlayground({
        title: `${entry.title}: edge behavior`,
        description: "Use this to understand guardrails and failure modes.",
        code: examples.edgeCase,
      }),
    );
    lines.push("");
  }

  return lines.join("\n");
};

const renderDocPage = (entry, content) => {
  const sections = extractSections(content);
  const examples = pickExamples(extractCodeBlocks(content));
  const pitfalls = inferPitfalls(entry, sections);
  const useCases = inferUseCases(entry);

  const chunks = [
    "---",
    `title: \"${escapeYaml(entry.title)}\"`,
    `description: \"${escapeYaml(entry.summary)}\"`,
    "---",
    "",
    'import ExamplePlayground from "@site/src/components/ExamplePlayground";',
    "",
    '<div className="doc-hero">',
    `<p className="doc-hero__kicker">${entry.category}</p>`,
    `<h2>${entry.title}</h2>`,
    `<p>${entry.summary}</p>`,
    "</div>",
    "",
    "## Why this matters",
    "",
    entry.why,
    "",
    "## Use it when",
    "",
    ...useCases.map((item) => `- ${item}`),
    "",
    renderExamples(entry, examples).trimEnd(),
    "",
    "## What this feature guarantees",
    "",
    ...sections.map((section) => `- ${cleanSectionTitle(section)}`),
    "",
    "## Common mistakes",
    "",
    ...pitfalls.map((pitfall) => `- ${pitfall}`),
    "",
    `<p className="doc-footnote">Authoritative spec: <a href="https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/${entry.fileName}">docs/Specs/${entry.fileName}</a></p>`,
    "",
  ];

  return chunks.join("\n");
};

const renderIndexPage = (recordsByCategory) => {
  const lines = [
    "---",
    "sidebar_position: 6",
    "title: Feature Guides",
    "---",
    "",
    '<div className="doc-hero doc-hero--wide">',
    '<p className="doc-hero__kicker">SmartPad Docs</p>',
    "<h2>One language for ideas, math, and decisions</h2>",
    "<p>Explore guided features with live interactive examples and clear behavior contracts.</p>",
    "</div>",
    "",
    "## Explore by path",
    "",
    '<div className="journey-grid">',
    '<a className="journey-card" href="/docs/guides/getting-started"><strong>Start Fast</strong><span>From blank sheet to meaningful output in minutes.</span></a>',
    '<a className="journey-card" href="/docs/guides/syntax-playbook"><strong>Master Syntax</strong><span>Write formulas that stay readable as complexity grows.</span></a>',
    '<a className="journey-card" href="/docs/guides/examples-gallery"><strong>Real Examples</strong><span>Use production-style snippets you can run immediately.</span></a>',
    '<a className="journey-card" href="/docs/guides/troubleshooting"><strong>Fix Fast</strong><span>Diagnose and resolve common issues quickly.</span></a>',
    "</div>",
    "",
  ];

  CATEGORY_ORDER.forEach((category) => {
    const records = recordsByCategory.get(category) || [];
    if (!records.length) return;

    lines.push(`## ${category}`);
    lines.push("");
    lines.push('<div className="feature-grid">');
    records.forEach((record) => {
      lines.push(
        `<a className="feature-card" href="/docs/specs/${record.slug}"><strong>${record.title}</strong><span>${record.summary}</span></a>`,
      );
    });
    lines.push("</div>");
    lines.push("");
  });

  return `${lines.join("\n")}\n`;
};

const renderGuidePages = (recordsByCategory) => {
  const allRecords = [...recordsByCategory.values()].flat();
  const unitsReferenceSection = renderUnitsReferenceSection();

  return [
    {
      file: "getting-started.md",
      body: [
        "---",
        "title: Getting Started",
        "sidebar_position: 1",
        "---",
        "",
        'import ExamplePlayground from "@site/src/components/ExamplePlayground";',
        "",
        "# Getting Started",
        "",
        "<div className=\"doc-hero\">",
        "<p className=\"doc-hero__kicker\">First Session</p>",
        "<h2>Make your first useful model in under a minute</h2>",
        "<p>Use this as your baseline workflow and branch into deeper guides from there.</p>",
        "</div>",
        "",
        "<ExamplePlayground title=\"60-second first win\" description=\"A compact workflow that proves the SmartPad loop instantly.\" code={`hours = 38\\nrate = $95/hour\\nweekly pay = hours * rate => $3,610\\n\\nfx = weekly pay in EUR => EUR 3,340`} />",
        "",
        "## Next stops",
        "",
        "- [Syntax Playbook](/docs/guides/syntax-playbook)",
        "- [Examples Gallery](/docs/guides/examples-gallery)",
        "- [Feature Guides](/docs/specs)",
        "",
      ].join("\n"),
    },
    {
      file: "syntax-playbook.md",
      body: [
        "---",
        "title: Syntax Playbook",
        "sidebar_position: 2",
        "---",
        "",
        'import ExamplePlayground from "@site/src/components/ExamplePlayground";',
        "",
        "# Syntax Playbook",
        "",
        "<div className=\"doc-hero\">",
        "<p className=\"doc-hero__kicker\">Writing Style</p>",
        "<h2>Write formulas that scale with your thinking</h2>",
        "<p>These patterns keep your sheets understandable even as models grow.</p>",
        "</div>",
        "",
        "<ExamplePlayground title=\"Core syntax patterns\" description=\"Reliable defaults for day-to-day SmartPad work.\" code={`subtotal = $128\\ntax = 8.5%\\ntotal = subtotal + (subtotal * tax) => $138.88\\n\\ndistance = 42 km\\ndistance in mi => 26.1 mi\\n\\nplan = [120, 140, 155, 170]\\navg(plan) => 146.25`} />",
        "",
        "## Rules that prevent surprises",
        "",
        "- Prefer explicit conversions with `to` / `in`.",
        "- Keep units and currencies attached to actual values.",
        "- Use named intermediate lines before compacting formulas.",
        "",
        unitsReferenceSection,
        "",
      ].join("\n"),
    },
    {
      file: "examples-gallery.md",
      body: [
        "---",
        "title: Examples Gallery",
        "sidebar_position: 3",
        "---",
        "",
        'import ExamplePlayground from "@site/src/components/ExamplePlayground";',
        "",
        "# Examples Gallery",
        "",
        "<div className=\"doc-hero\">",
        "<p className=\"doc-hero__kicker\">Production Patterns</p>",
        "<h2>Copy, run, and adapt these real workflows</h2>",
        "<p>Each example is interactive and opens directly into SmartPad.</p>",
        "</div>",
        "",
        "<ExamplePlayground title=\"Budget + FX\" description=\"Project local totals into another currency.\" code={`rent = USD 1950\\nutilities = USD 240\\ntotal usd = rent + utilities => $2,190\\ntotal eur = total usd in EUR => EUR 2,025`} />",
        "",
        "<ExamplePlayground title=\"Unit-aware planning\" description=\"Estimate travel-like scenarios with conversion safety.\" code={`speed = 62 mi/h\\ntime = 45 min\\ndistance = speed * time => 46.5 mi\\ndistance in km => 74.83 km`} />",
        "",
        "<ExamplePlayground title=\"List analysis\" description=\"Extract signal from a compact list quickly.\" code={`scores = [71, 77, 84, 90, 94]\\ntop3 = take(sort(scores, desc), 3)\\navg(top3) => 89.33`} />",
        "",
      ].join("\n"),
    },
    {
      file: "troubleshooting.md",
      body: [
        "---",
        "title: Troubleshooting",
        "sidebar_position: 4",
        "---",
        "",
        "# Troubleshooting",
        "",
        "## If conversions fail",
        "",
        "- Verify the target unit/currency exists and is spelled correctly.",
        "- Use explicit `value in TARGET` syntax instead of custom arrows.",
        "- Check manual FX overrides before expecting live provider values.",
        "",
        "## If outputs look wrong",
        "",
        "- Split formulas into named steps and evaluate line-by-line.",
        "- Validate list/range boundaries and step definitions.",
        "- Review locale-sensitive date and decimal parsing assumptions.",
        "",
        "## If behavior still feels off",
        "",
        "- Go to [Feature Guides](/docs/specs) and open the relevant contract page.",
        "",
      ].join("\n"),
    },
    {
      file: "feature-map.md",
      body: [
        "---",
        "title: Feature Map",
        "sidebar_position: 5",
        "---",
        "",
        "# Feature Map",
        "",
        `SmartPad currently ships **${allRecords.length}** primary feature guides across four workflow areas.`,
        "",
        ...CATEGORY_ORDER.flatMap((category) => {
          const records = recordsByCategory.get(category) || [];
          return [`## ${category}`, "", ...records.map((record) => `- [${record.title}](/docs/specs/${record.slug})`), ""];
        }),
      ].join("\n"),
    },
  ];
};

const writeSidebar = (recordsByCategory) => {
  const lines = [
    'import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";',
    "",
    "const sidebars: SidebarsConfig = {",
    "  docsSidebar: [",
    '    "intro",',
    "    {",
    '      type: "category",',
    '      label: "Start Here",',
    "      items: [",
    '        "guides/getting-started",',
    '        "guides/syntax-playbook",',
    '        "guides/examples-gallery",',
    '        "guides/troubleshooting",',
    '        "guides/feature-map",',
    "      ],",
    "    },",
    '    "specs/index",',
  ];

  CATEGORY_ORDER.forEach((category) => {
    const records = recordsByCategory.get(category) || [];
    if (!records.length) return;
    lines.push("    {");
    lines.push('      type: "category",');
    lines.push(`      label: "${category}",`);
    lines.push("      items: [");
    records.forEach((record) => lines.push(`        "specs/${record.slug}",`));
    lines.push("      ],");
    lines.push("    },");
  });

  lines.push("  ],");
  lines.push("};");
  lines.push("");
  lines.push("export default sidebars;");
  lines.push("");

  fs.writeFileSync(path.join(repoRoot, "website", "sidebars.ts"), lines.join("\n"), "utf8");
};

const main = () => {
  ensureDir(docsRoot);
  ensureDir(specsOutDir);
  ensureDir(guidesOutDir);

  const recordsByCategory = new Map();

  SPEC_CATALOG.forEach((entry) => {
    const content = readSpecContent(entry.fileName);
    const docContent = renderDocPage(entry, content);
    const outputPath = path.join(specsOutDir, `${entry.slug}.md`);
    fs.writeFileSync(outputPath, docContent, "utf8");

    if (!recordsByCategory.has(entry.category)) {
      recordsByCategory.set(entry.category, []);
    }
    recordsByCategory.get(entry.category).push(entry);
  });

  fs.writeFileSync(path.join(specsOutDir, "index.md"), renderIndexPage(recordsByCategory), "utf8");

  renderGuidePages(recordsByCategory).forEach((page) => {
    fs.writeFileSync(path.join(guidesOutDir, page.file), page.body, "utf8");
  });

  writeSidebar(recordsByCategory);

  const legacyIndex = path.join(specsOutDir, "_index.md");
  if (fs.existsSync(legacyIndex)) {
    fs.rmSync(legacyIndex);
  }

  console.log(`Generated ordered Docusaurus docs pages: ${SPEC_CATALOG.length}`);
};

main();
