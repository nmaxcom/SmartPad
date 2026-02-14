const fs = require("node:fs");
const path = require("node:path");

const repoRoot = process.cwd();
const specsDir = path.join(repoRoot, "docs", "Specs");
const docsRoot = path.join(repoRoot, "website", "docs");
const specsOutDir = path.join(docsRoot, "specs");

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

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[`'"()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

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

const extractTopHeading = (content, fallbackTitle) => {
  const match = content.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() || fallbackTitle;
};

const extractSections = (content) => {
  const matches = [...content.matchAll(/^##\s+(.+)$/gm)];
  return matches.slice(0, 10).map((match) => match[1].trim());
};

const extractCodeBlocks = (content) => {
  const blocks = [];
  const regex = /```(?:[a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g;
  let match = regex.exec(content);
  while (match) {
    const body = match[1].trim();
    if (body) blocks.push(body);
    match = regex.exec(content);
  }
  return blocks;
};

const pickExamples = (blocks) => {
  const positive = blocks.find((block) => !block.includes("⚠️")) || "";
  const edgeCase = blocks.find((block) => block.includes("⚠️")) || "";
  return { positive, edgeCase };
};

const stripTopHeading = (content) => content.replace(/^#\s+.+\n+/, "").trim();

const renderExampleSection = (examples) => {
  if (!examples.positive && !examples.edgeCase) {
    return "## Quick examples\n\nExamples for this feature are being backfilled.\n";
  }

  const lines = ["## Quick examples", ""];
  if (examples.positive) {
    lines.push("### Happy path");
    lines.push("```text");
    lines.push(examples.positive);
    lines.push("```");
    lines.push("");
  }
  if (examples.edgeCase) {
    lines.push("### Edge case");
    lines.push("```text");
    lines.push(examples.edgeCase);
    lines.push("```");
    lines.push("");
  }
  return lines.join("\n");
};

const renderCoverageSection = (sections) => {
  if (!sections.length) {
    return "## What this covers\n\nSection list is being refined.\n";
  }
  const lines = ["## What this covers", ""];
  sections.forEach((section) => lines.push(`- ${section}`));
  lines.push("");
  return lines.join("\n");
};

const renderDocPage = (entry, content) => {
  const sourceHeading = extractTopHeading(content, entry.title);
  const sections = extractSections(content);
  const examples = pickExamples(extractCodeBlocks(content));
  const rawSpecBody = stripTopHeading(content);

  const chunks = [
    "---",
    `title: "${escapeYaml(entry.title)}"`,
    `description: "${escapeYaml(entry.summary)}"`,
    "---",
    "",
    `> Source: \`docs/Specs/${entry.fileName}\``,
    "",
    `## At a glance`,
    "",
    entry.summary,
    "",
    renderExampleSection(examples).trimEnd(),
    "",
    renderCoverageSection(sections).trimEnd(),
    "",
    "## Full specification",
    "",
    `<details>`,
    `<summary>Open full spec: ${sourceHeading}</summary>`,
    "",
    rawSpecBody,
    "",
    `</details>`,
    "",
  ];

  return chunks.join("\n");
};

const renderIndexPage = (recordsByCategory) => {
  const lines = [
    "---",
    "sidebar_position: 2",
    "title: Feature Guides",
    "---",
    "",
    "# Feature Guides",
    "",
    "This section turns raw SmartPad specs into ordered, user-readable guides.",
    "",
  ];

  CATEGORY_ORDER.forEach((category) => {
    const records = recordsByCategory.get(category) || [];
    if (!records.length) return;
    lines.push(`## ${category}`);
    lines.push("");
    records.forEach((record) => {
      lines.push(`- [${record.title}](./${record.slug})`);
      lines.push(`  - ${record.summary}`);
    });
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

const writeSidebar = (recordsByCategory) => {
  const lines = [
    'import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";',
    "",
    "const sidebars: SidebarsConfig = {",
    "  docsSidebar: [",
    '    "intro",',
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
  writeSidebar(recordsByCategory);

  // Cleanup old generated index file from previous pipeline shape.
  const legacyIndex = path.join(specsOutDir, "_index.md");
  if (fs.existsSync(legacyIndex)) {
    fs.rmSync(legacyIndex);
  }

  console.log(`Generated ordered Docusaurus docs pages: ${SPEC_CATALOG.length}`);
};

main();
