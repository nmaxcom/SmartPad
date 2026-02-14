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
      "Show evaluable results while typing, keep => behavior unchanged, and suppress noisy/error-prone previews.",
  },
  {
    fileName: "ResultChipsAndValueGraph.spec.md",
    slug: "result-chips-and-references",
    title: "Result Chips and References",
    category: "Core Experience",
    summary:
      "Defines chip interactions, hidden references, dependency behavior, and result-lane UX in the editor.",
  },
  {
    fileName: "Plotting.spec.md",
    slug: "plotting-and-dependency-views",
    title: "Plotting and Dependency Views",
    category: "Core Experience",
    summary:
      "Specifies exploratory plotting, detached views, and dependency-driven visualization flows.",
  },
  {
    fileName: "Currency.spec.md",
    slug: "currency-and-fx",
    title: "Currency and FX",
    category: "Math and Units",
    summary:
      "Covers currency units, FX conversion, manual overrides, and formatting rules for money calculations.",
  },
  {
    fileName: "duration.spec.md",
    slug: "duration-and-time-values",
    title: "Duration and Time Values",
    category: "Math and Units",
    summary:
      "Defines duration literals, time-of-day values, datetime arithmetic, and parsing disambiguation rules.",
  },
  {
    fileName: "Lists.spec.md",
    slug: "lists",
    title: "Lists",
    category: "Data and Collections",
    summary:
      "Defines list creation, aggregations, filtering, mapping, sorting, indexing, and unit-safe list operations.",
  },
  {
    fileName: "Ranges.spec.md",
    slug: "ranges",
    title: "Ranges",
    category: "Data and Collections",
    summary:
      "Defines numeric and date/time range generation, step rules, guardrails, and list interoperability.",
  },
  {
    fileName: "Locale.spec.md",
    slug: "locale-date-time",
    title: "Locale Date and Time",
    category: "Data and Collections",
    summary:
      "Defines locale-aware date parsing, date/time ranges, output formatting, and error normalization.",
  },
  {
    fileName: "FileManagement.spec.md",
    slug: "file-management",
    title: "File Management",
    category: "Workspace",
    summary:
      "Defines sheet storage, autosave, import/export behavior, trash lifecycle, and multi-tab synchronization.",
  },
];

const CATEGORY_ORDER = ["Core Experience", "Math and Units", "Data and Collections", "Workspace"];

const escapeYaml = (value) => value.replace(/"/g, '\\"');

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const readSpecContent = (fileName) => {
  const fullPath = path.join(specsDir, fileName);
  return fs.readFileSync(fullPath, "utf8");
};

const extractSections = (content) => {
  const matches = [...content.matchAll(/^##\s+(.+)$/gm)];
  return matches.slice(0, 12).map((match) => match[1].trim());
};

const extractCodeBlocks = (content) => {
  const blocks = [];
  const regex = /```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g;
  let match = regex.exec(content);
  while (match) {
    const lang = (match[1] || "text").trim();
    const body = match[2].trim();
    if (body) blocks.push({ lang, body });
    match = regex.exec(content);
  }
  return blocks;
};

const pickExamples = (blocks) => {
  const positive =
    blocks.find((block) => !/⚠️|error|invalid|fail|guardrail/i.test(block.body))?.body || "";
  const edgeCase =
    blocks.find((block) => /⚠️|error|invalid|fail|guardrail/i.test(block.body))?.body || "";
  return { positive, edgeCase };
};

const sectionKey = (title) => title.toLowerCase();

const pickSectionTitles = (sections, matcher) =>
  sections.filter((section) => matcher(sectionKey(section)));

const inferPitfalls = (entry, sections) => {
  const items = [];
  if (pickSectionTitles(sections, (key) => key.includes("syntax") || key.includes("parsing")).length) {
    items.push("Use the documented syntax exactly; SmartPad intentionally avoids ambiguous shorthand.");
  }
  if (pickSectionTitles(sections, (key) => key.includes("edge") || key.includes("guardrail")).length) {
    items.push("Watch edge-case behavior and guardrails before assuming spreadsheet-style coercions.");
  }
  if (pickSectionTitles(sections, (key) => key.includes("format") || key.includes("display")).length) {
    items.push("Display formatting can differ from internal values; verify conversion targets explicitly.");
  }
  if (/currency|duration|locale|ranges|lists/i.test(entry.slug)) {
    items.push("Keep units and locale context explicit when combining values from different domains.");
  }
  if (!items.length) {
    items.push("Use the quick examples first, then verify behavior against your own sheet data.");
  }
  return items.slice(0, 3);
};

const renderExampleSection = (examples) => {
  if (!examples.positive && !examples.edgeCase) {
    return [
      "## Try it now",
      "",
      "Examples for this feature are being backfilled. Add examples in the linked spec and regenerate docs.",
      "",
    ].join("\n");
  }

  const lines = [
    "## Try it now",
    "",
    "Copy these into a SmartPad sheet and watch live results update as you type.",
    "",
  ];

  if (examples.positive) {
    lines.push("### Happy path");
    lines.push("```smartpad");
    lines.push(examples.positive);
    lines.push("```");
    lines.push("");
  }

  if (examples.edgeCase) {
    lines.push("### Edge case");
    lines.push("```smartpad");
    lines.push(examples.edgeCase);
    lines.push("```");
    lines.push("");
  }

  return lines.join("\n");
};

const renderCoverageSection = (sections) => {
  if (!sections.length) {
    return "## Capability map\n\nCoverage list is being refined.\n";
  }

  const lines = ["## Capability map", ""];
  sections.forEach((section) => lines.push(`- ${section}`));
  lines.push("");
  return lines.join("\n");
};

const renderDocPage = (entry, content) => {
  const sections = extractSections(content);
  const examples = pickExamples(extractCodeBlocks(content));
  const pitfalls = inferPitfalls(entry, sections);

  const chunks = [
    "---",
    `title: \"${escapeYaml(entry.title)}\"`,
    `description: \"${escapeYaml(entry.summary)}\"`,
    "---",
    "",
    '<div className="guide-masthead">',
    "",
    `**What this unlocks:** ${entry.summary}`,
    "",
    `**Source spec:** [docs/Specs/${entry.fileName}](https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/${entry.fileName})`,
    "",
    "</div>",
    "",
    "## Why this matters",
    "",
    `This guide translates the ${entry.title} contract into practical workflow patterns so teams can build confidently in SmartPad.`,
    "",
    renderExampleSection(examples).trimEnd(),
    "",
    "## Common pitfalls",
    "",
    ...pitfalls.map((pitfall) => `- ${pitfall}`),
    "",
    renderCoverageSection(sections).trimEnd(),
    "",
    "## Deep reference",
    "",
    `- Canonical behavior contract: [${entry.fileName}](https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/${entry.fileName})`,
    "- Regenerate docs after spec edits: `npm run docs:docusaurus:generate`",
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
    '<div className="hero-panel">',
    "",
    "## SmartPad Feature Guides",
    "",
    "SmartPad is a text-first workspace with live math, units, lists, ranges, plotting, and workspace automation.",
    "",
    "Use this library to jump from idea to working sheet quickly.",
    "",
    "</div>",
    "",
    "## Explore by journey",
    "",
    '<div className="journey-grid">',
    '<a className="journey-card" href="/docs/guides/getting-started"><strong>Getting Started</strong><span>From first line to live result in minutes.</span></a>',
    '<a className="journey-card" href="/docs/guides/syntax-playbook"><strong>Syntax Playbook</strong><span>Core expression patterns you will use daily.</span></a>',
    '<a className="journey-card" href="/docs/guides/examples-gallery"><strong>Examples Gallery</strong><span>Real workflows across money, units, and planning.</span></a>',
    '<a className="journey-card" href="/docs/guides/troubleshooting"><strong>Troubleshooting</strong><span>Fast fixes for parsing and conversion surprises.</span></a>',
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

  lines.push("Regenerate this section after spec updates:");
  lines.push("");
  lines.push("```bash");
  lines.push("npm run docs:docusaurus:generate");
  lines.push("```");
  lines.push("");

  return `${lines.join("\n")}\n`;
};

const renderGuidePages = (recordsByCategory) => {
  const docs = [];
  const allRecords = [...recordsByCategory.values()].flat();

  docs.push({
    file: "getting-started.md",
    body: [
      "---",
      "title: Getting Started",
      "sidebar_position: 1",
      "---",
      "",
      "# Getting Started With SmartPad",
      "",
      "SmartPad feels like notes, but every line can become a live computation.",
      "",
      "## 60-second first win",
      "",
      "```smartpad",
      "hours = 38",
      "rate = $95/hour",
      "weekly pay = hours * rate => $3,610",
      "",
      "fx = weekly pay in EUR => EUR 3,340",
      "```",
      "",
      "## What to learn next",
      "",
      "- [Syntax Playbook](/docs/guides/syntax-playbook)",
      "- [Examples Gallery](/docs/guides/examples-gallery)",
      "- [Feature Guides](/docs/specs)",
      "",
    ].join("\n"),
  });

  docs.push({
    file: "syntax-playbook.md",
    body: [
      "---",
      "title: Syntax Playbook",
      "sidebar_position: 2",
      "---",
      "",
      "# Syntax Playbook",
      "",
      "Use these patterns to keep sheets expressive and predictable.",
      "",
      "## Core patterns",
      "",
      "```smartpad",
      "subtotal = $128",
      "tax = 8.5%",
      "total = subtotal + (subtotal * tax) => $138.88",
      "",
      "distance = 42 km",
      "distance in mi => 26.1 mi",
      "",
      "plan = [120, 140, 155, 170]",
      "avg(plan) => 146.25",
      "```",
      "",
      "## Rules of thumb",
      "",
      "- Use `to` / `in` for conversions.",
      "- Keep units and currencies on values, not comments.",
      "- Name intermediate values so downstream lines stay readable.",
      "",
    ].join("\n"),
  });

  docs.push({
    file: "examples-gallery.md",
    body: [
      "---",
      "title: Examples Gallery",
      "sidebar_position: 3",
      "---",
      "",
      "# Examples Gallery",
      "",
      "Feature-packed examples you can paste and adapt.",
      "",
      "## Budget + FX",
      "",
      "```smartpad",
      "rent = USD 1950",
      "utilities = USD 240",
      "total usd = rent + utilities => $2,190",
      "total eur = total usd in EUR => EUR 2,025",
      "```",
      "",
      "## Unit-aware planning",
      "",
      "```smartpad",
      "speed = 62 mi/h",
      "time = 45 min",
      "distance = speed * time => 46.5 mi",
      "distance in km => 74.83 km",
      "```",
      "",
      "## List analysis",
      "",
      "```smartpad",
      "scores = [71, 77, 84, 90, 94]",
      "top3 = take(sort(scores, desc), 3)",
      "avg(top3) => 89.33",
      "```",
      "",
    ].join("\n"),
  });

  docs.push({
    file: "troubleshooting.md",
    body: [
      "---",
      "title: Troubleshooting",
      "sidebar_position: 4",
      "---",
      "",
      "# Troubleshooting Quick Fixes",
      "",
      "## If conversions fail",
      "",
      "- Verify the target unit/currency is valid.",
      "- Prefer `value in TARGET` over free-form arrows.",
      "- Check manual FX overrides before blaming live rates.",
      "",
      "## If results look wrong",
      "",
      "- Break formulas into named steps.",
      "- Confirm list/range boundaries and step size.",
      "- Inspect locale-sensitive dates and decimal separators.",
      "",
      "## If behavior differs from expectation",
      "",
      "Use the per-feature guide and then open the canonical spec for authoritative rules.",
      "",
      "- Feature guide index: [/docs/specs](/docs/specs)",
      "",
    ].join("\n"),
  });

  docs.push({
    file: "feature-map.md",
    body: [
      "---",
      "title: Feature Map",
      "sidebar_position: 5",
      "---",
      "",
      "# Feature Map",
      "",
      `SmartPad currently publishes **${allRecords.length}** core feature guides grouped by workflow area.`,
      "",
      ...CATEGORY_ORDER.flatMap((category) => {
        const records = recordsByCategory.get(category) || [];
        return [`## ${category}`, "", ...records.map((record) => `- [${record.title}](/docs/specs/${record.slug})`), ""];
      }),
    ].join("\n"),
  });

  return docs;
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

    records.forEach((record) => {
      lines.push(`        "specs/${record.slug}",`);
    });

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

  // Cleanup old generated index file from previous pipeline shape.
  const legacyIndex = path.join(specsOutDir, "_index.md");
  if (fs.existsSync(legacyIndex)) {
    fs.rmSync(legacyIndex);
  }

  console.log(`Generated ordered Docusaurus docs pages: ${SPEC_CATALOG.length}`);
};

main();
