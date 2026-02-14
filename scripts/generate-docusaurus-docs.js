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
    why: "Keep cognitive flow intact by seeing outcomes the moment an expression becomes valid.",
  },
  {
    fileName: "ResultChipsAndValueGraph.spec.md",
    slug: "result-chips-and-references",
    title: "Result Chips and References",
    category: "Core Experience",
    summary:
      "Defines chip interactions, hidden references, dependency behavior, and result-lane UX in the editor.",
    why: "Turn lines into reusable building blocks without losing readability.",
  },
  {
    fileName: "Plotting.spec.md",
    slug: "plotting-and-dependency-views",
    title: "Plotting and Dependency Views",
    category: "Core Experience",
    summary:
      "Specifies exploratory plotting, detached views, and dependency-driven visualization flows.",
    why: "Move from raw values to visual intuition with near-zero setup.",
  },
  {
    fileName: "Currency.spec.md",
    slug: "currency-and-fx",
    title: "Currency and FX",
    category: "Math and Units",
    summary:
      "Covers currency units, FX conversion, manual overrides, and formatting rules for money calculations.",
    why: "Model global pricing and planning in one sheet without brittle conversion hacks.",
  },
  {
    fileName: "duration.spec.md",
    slug: "duration-and-time-values",
    title: "Duration and Time Values",
    category: "Math and Units",
    summary:
      "Defines duration literals, time-of-day values, datetime arithmetic, and parsing disambiguation rules.",
    why: "Handle schedules, lead times, and elapsed calculations with reliable unit math.",
  },
  {
    fileName: "Lists.spec.md",
    slug: "lists",
    title: "Lists",
    category: "Data and Collections",
    summary:
      "Defines list creation, aggregations, filtering, mapping, sorting, indexing, and unit-safe list operations.",
    why: "Treat line-based notes like structured datasets when you need analysis depth.",
  },
  {
    fileName: "Ranges.spec.md",
    slug: "ranges",
    title: "Ranges",
    category: "Data and Collections",
    summary:
      "Defines numeric and date/time range generation, step rules, guardrails, and list interoperability.",
    why: "Generate planning horizons, projections, and schedules without manual fill operations.",
  },
  {
    fileName: "Locale.spec.md",
    slug: "locale-date-time",
    title: "Locale Date and Time",
    category: "Data and Collections",
    summary:
      "Defines locale-aware date parsing, date/time ranges, output formatting, and error normalization.",
    why: "Collaborate across regions while keeping date/time behavior deterministic.",
  },
  {
    fileName: "FileManagement.spec.md",
    slug: "file-management",
    title: "File Management",
    category: "Workspace",
    summary:
      "Defines sheet storage, autosave, import/export behavior, trash lifecycle, and multi-tab synchronization.",
    why: "Protect user trust with durable persistence and predictable recovery behavior.",
  },
];

const CATEGORY_ORDER = ["Core Experience", "Math and Units", "Data and Collections", "Workspace"];

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const escapeYaml = (value) => value.replace(/"/g, '\\"');

const readSpecContent = (fileName) => fs.readFileSync(path.join(specsDir, fileName), "utf8");

const extractSections = (content) => {
  const matches = [...content.matchAll(/^##\s+(.+)$/gm)];
  return matches.slice(0, 12).map((match) => match[1].trim());
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

const inferPitfalls = (entry, sections) => {
  const items = [];
  const has = (pattern) => sections.some((section) => pattern.test(sectionKey(section)));

  if (has(/syntax|parsing/)) {
    items.push("Use the documented syntax exactly; SmartPad avoids ambiguous shorthand on purpose.");
  }
  if (has(/edge|guardrail|error/)) {
    items.push("Check guardrails before assuming spreadsheet-style coercion rules.");
  }
  if (has(/format|display|locale/)) {
    items.push("Display strings are not always canonical values; verify the target unit/currency explicitly.");
  }
  if (/currency|duration|locale|ranges|lists/.test(entry.slug)) {
    items.push("Keep context (unit, locale, currency) explicit when composing lines across domains.");
  }
  if (!items.length) {
    items.push("Build from small named steps first, then collapse into concise formulas.");
  }

  return items.slice(0, 3);
};

const mdxStringProp = (value) => `{${JSON.stringify(value)}}`;

const renderPlayground = ({ title, description, code }) => {
  return `<ExamplePlayground title=${mdxStringProp(title)} description=${mdxStringProp(description)} code=${mdxStringProp(code)} />`;
};

const renderExamples = (entry, examples) => {
  if (!examples.positive && !examples.edgeCase) {
    return [
      "## Live playground",
      "",
      "Examples for this feature are being backfilled. Add examples to the source spec and regenerate docs.",
      "",
    ].join("\n");
  }

  const lines = [
    "## Live playground",
    "",
    renderPlayground({
      title: `${entry.title} quick win`,
      description: "Copy, run, and adapt this baseline to your own sheet.",
      code: examples.positive || examples.edgeCase,
    }),
    "",
  ];

  if (examples.edgeCase && examples.edgeCase !== examples.positive) {
    lines.push(
      renderPlayground({
        title: `${entry.title} guardrail check`,
        description: "Use this to understand expected behavior around edge conditions.",
        code: examples.edgeCase,
      }),
    );
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

  const isCurrency = entry.slug === "currency-and-fx";

  const chunks = [
    "---",
    `title: \"${escapeYaml(entry.title)}\"`,
    `description: \"${escapeYaml(entry.summary)}\"`,
    "---",
    "",
    'import ExamplePlayground from "@site/src/components/ExamplePlayground";',
    "",
    '<div className="spotlight-panel">',
    `<h3>${entry.title}</h3>`,
    `<p><strong>What this unlocks:</strong> ${entry.summary}</p>`,
    `<p><strong>Why teams care:</strong> ${entry.why}</p>`,
    `<p><strong>Source spec:</strong> <a href="https://github.com/nmaxcom/SmartPad/blob/main/docs/Specs/${entry.fileName}">docs/Specs/${entry.fileName}</a></p>`,
    "</div>",
    "",
    "## What you can ship with this",
    "",
    `Use this guide to move from isolated formulas to production-grade ${entry.title.toLowerCase()} behavior in real SmartPad sheets.`,
    "",
    renderExamples(entry, examples).trimEnd(),
    "",
    isCurrency ? "## Currency + FX blueprint" : "## Design notes",
    "",
    isCurrency
      ? "- Run local budgeting in USD while instantly projecting totals to EUR/GBP for planning and approvals."
      : "- Keep formulas legible by splitting intent into named lines before collapsing math.",
    isCurrency
      ? "- Keep manual rates for scenario planning, but preserve live-rate behavior for day-to-day usage."
      : "- Prefer explicit conversions and target units instead of inferring context from nearby lines.",
    isCurrency
      ? "- Treat conversion syntax (`to` / `in`) as part of the model contract, not just display formatting."
      : "- Validate expected output with at least one positive and one guardrail-oriented example.",
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
    '<div className="cinema-hero">',
    '<p className="cinema-kicker">SmartPad Docs</p>',
    "<h2>From plain text to decision-ready models</h2>",
    "<p>Explore examples, run them in one click, and build sheets that are readable and mathematically reliable.</p>",
    '<div className="cinema-tags"><span>Live math</span><span>Units + FX</span><span>Lists + ranges</span><span>Workspace safe</span></div>',
    "</div>",
    "",
    "## Explore by journey",
    "",
    '<div className="journey-grid">',
    '<a className="journey-card" href="/docs/guides/getting-started"><strong>Getting Started</strong><span>First value in under a minute.</span></a>',
    '<a className="journey-card" href="/docs/guides/syntax-playbook"><strong>Syntax Playbook</strong><span>Patterns that keep sheets clean and scalable.</span></a>',
    '<a className="journey-card" href="/docs/guides/examples-gallery"><strong>Examples Gallery</strong><span>Copy-ready workflows you can run instantly.</span></a>',
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
      'import ExamplePlayground from "@site/src/components/ExamplePlayground";',
      "",
      "# Getting Started With SmartPad",
      "",
      "<div className=\"spotlight-panel\">",
      "<p><strong>Goal:</strong> go from blank page to a live, explainable model in under 60 seconds.</p>",
      "</div>",
      "",
      "<ExamplePlayground title=\"60-second first win\" description=\"Open this directly in SmartPad and tweak values.\" code={`hours = 38\\nrate = $95/hour\\nweekly pay = hours * rate => $3,610\\n\\nfx = weekly pay in EUR => EUR 3,340`} />",
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
      'import ExamplePlayground from "@site/src/components/ExamplePlayground";',
      "",
      "# Syntax Playbook",
      "",
      "Use these patterns to keep sheets expressive and predictable.",
      "",
      "<ExamplePlayground title=\"Core expression patterns\" description=\"A compact pattern set used across most SmartPad workflows.\" code={`subtotal = $128\\ntax = 8.5%\\ntotal = subtotal + (subtotal * tax) => $138.88\\n\\ndistance = 42 km\\ndistance in mi => 26.1 mi\\n\\nplan = [120, 140, 155, 170]\\navg(plan) => 146.25`} />",
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
      'import ExamplePlayground from "@site/src/components/ExamplePlayground";',
      "",
      "# Examples Gallery",
      "",
      "Feature-packed examples you can paste and adapt.",
      "",
      "<ExamplePlayground title=\"Budget + FX\" description=\"Local budget totals projected into a second currency.\" code={`rent = USD 1950\\nutilities = USD 240\\ntotal usd = rent + utilities => $2,190\\ntotal eur = total usd in EUR => EUR 2,025`} />",
      "",
      "<ExamplePlayground title=\"Unit-aware planning\" description=\"Travel-style estimate with unit conversion.\" code={`speed = 62 mi/h\\ntime = 45 min\\ndistance = speed * time => 46.5 mi\\ndistance in km => 74.83 km`} />",
      "",
      "<ExamplePlayground title=\"List analysis\" description=\"Fast analysis of a compact numeric list.\" code={`scores = [71, 77, 84, 90, 94]\\ntop3 = take(sort(scores, desc), 3)\\navg(top3) => 89.33`} />",
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
