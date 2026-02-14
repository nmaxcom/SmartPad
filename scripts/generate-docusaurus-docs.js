const fs = require("node:fs");
const path = require("node:path");

const repoRoot = process.cwd();
const specsDir = path.join(repoRoot, "docs", "Specs");
const docsRoot = path.join(repoRoot, "website", "docs");
const specsOutDir = path.join(docsRoot, "specs");

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[`'"()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const readSpecFiles = () =>
  fs
    .readdirSync(specsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".spec.md"))
    .map((entry) => path.join(specsDir, entry.name))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));

const extractTitle = (content, fallbackName) => {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch?.[1]) return titleMatch[1].trim();
  return fallbackName.replace(/\.spec\.md$/i, "");
};

const extractSummary = (content) => {
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim().startsWith("#"));
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith("#")) continue;
    if (line.startsWith("---")) continue;
    return line;
  }
  return "Generated from SmartPad feature specifications.";
};

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const stripTopHeading = (content) => content.replace(/^#\s+.+\n+/, "");

const writeOverview = (records) => {
  const lines = [
    "---",
    "sidebar_position: 2",
    "---",
    "",
    "# Feature Specs",
    "",
    "This section is generated from `docs/Specs/*.spec.md`.",
    "",
    `Total specs: **${records.length}**`,
    "",
  ];

  records.forEach((record) => {
    lines.push(`- [${record.title}](./${record.slug})`);
  });

  lines.push("", "Run `npm run docs:docusaurus:generate` after spec updates.");

  fs.writeFileSync(path.join(specsOutDir, "_index.md"), `${lines.join("\n")}\n`, "utf8");
};

const main = () => {
  ensureDir(docsRoot);
  ensureDir(specsOutDir);

  const specFiles = readSpecFiles();
  const records = [];

  specFiles.forEach((specPath) => {
    const fileName = path.basename(specPath);
    const baseName = fileName.replace(/\.spec\.md$/i, "");
    const content = fs.readFileSync(specPath, "utf8");
    const title = extractTitle(content, fileName);
    const summary = extractSummary(content);
    const slug = slugify(baseName);
    const outPath = path.join(specsOutDir, `${slug}.md`);
    const generated = [
      "---",
      `title: "${title.replace(/"/g, '\\"')}"`,
      `description: "${summary.replace(/"/g, '\\"')}"`,
      "---",
      "",
      `> Source: \`docs/Specs/${fileName}\``,
      "",
      stripTopHeading(content).trim(),
      "",
    ].join("\n");

    fs.writeFileSync(outPath, generated, "utf8");
    records.push({ slug, title });
  });

  writeOverview(records);
  console.log(`Generated Docusaurus docs pages: ${records.length}`);
};

main();
