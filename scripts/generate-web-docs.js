const fs = require("node:fs");
const path = require("node:path");

const repoRoot = process.cwd();
const specsDir = path.join(repoRoot, "docs", "Specs");
const outputPath = path.join(repoRoot, "public", "docs", "index.html");

const ESCAPE_TABLE = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const escapeHtml = (value) =>
  value.replace(/[&<>"']/g, (char) => ESCAPE_TABLE[char] || char);

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[`'"()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const readSpecFiles = () => {
  const entries = fs.readdirSync(specsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".spec.md"))
    .map((entry) => path.join(specsDir, entry.name))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
};

const humanizeFileStem = (stem) =>
  stem
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b([a-z])/g, (_, char) => char.toUpperCase());

const extractTitle = (content, fallbackName) => {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch?.[1]) {
    return titleMatch[1].trim();
  }
  return humanizeFileStem(fallbackName.replace(/\.spec\.md$/i, ""));
};

const extractSummary = (content) => {
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim().startsWith("#"));
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith("#")) continue;
    if (line.startsWith("---")) continue;
    if (line.startsWith("*") || line.startsWith("-")) continue;
    if (line.startsWith("```")) continue;
    return line;
  }
  return "No summary paragraph found in this spec yet.";
};

const extractSections = (content) => {
  const matches = [...content.matchAll(/^##\s+(.+)$/gm)];
  return matches.slice(0, 12).map((match) => match[1].trim());
};

const extractCodeBlocks = (content) => {
  const blocks = [];
  const regex = /```(?:[a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g;
  let match = regex.exec(content);
  while (match) {
    const body = match[1].trim();
    if (body) {
      blocks.push(body);
    }
    match = regex.exec(content);
  }
  return blocks;
};

const pickExamples = (blocks) => {
  const positive = blocks.find((block) => !block.includes("⚠️")) || "";
  const edgeCase = blocks.find((block) => block.includes("⚠️")) || "";
  return { positive, edgeCase };
};

const buildSpecCards = (specs) =>
  specs
    .map((spec) => {
      const sectionItems = spec.sections.length
        ? spec.sections
            .map((section) => `<li>${escapeHtml(section)}</li>`)
            .join("\n")
        : "<li>Section outline is still being expanded.</li>";

      const positiveBlock = spec.examples.positive
        ? `<h4>Positive example</h4><pre><code>${escapeHtml(spec.examples.positive)}</code></pre>`
        : "<h4>Positive example</h4><p>Example not yet added in source spec.</p>";

      const edgeBlock = spec.examples.edgeCase
        ? `<h4>Edge-case example</h4><pre><code>${escapeHtml(spec.examples.edgeCase)}</code></pre>`
        : "<h4>Edge-case example</h4><p>Edge-case example not yet present in source spec.</p>";

      return `
      <section id="${spec.id}" class="card spec-card">
        <h2>${escapeHtml(spec.title)}</h2>
        <p>${escapeHtml(spec.summary)}</p>
        <p>
          <a href="../../docs/Specs/${encodeURIComponent(spec.fileName)}">Open source spec</a>
        </p>
        <h3>Coverage</h3>
        <ul>${sectionItems}</ul>
        <div class="examples">
          ${positiveBlock}
          ${edgeBlock}
        </div>
      </section>`;
    })
    .join("\n");

const buildTopNav = (specs) =>
  specs.map((spec) => `<a href="#${spec.id}">${escapeHtml(spec.shortTitle)}</a>`).join("\n");

const deriveShortTitle = (title) => {
  const cleaned = title
    .replace(/^SmartPad\s+/i, "")
    .replace(/^Smartpad\s+/i, "")
    .replace(/\s+Spec$/i, "")
    .replace(/^[^a-z0-9]+/i, "")
    .trim();
  return cleaned || title;
};

const buildHtml = (specs) => {
  const generatedAt = new Date().toISOString();
  const topNav = buildTopNav(specs);
  const cards = buildSpecCards(specs);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SmartPad Docs</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <header class="hero">
      <div class="hero-inner">
        <p class="eyebrow">SmartPad Documentation</p>
        <h1>Web docs generated from source specs</h1>
        <p class="subtitle">
          This page is generated from <code>docs/Specs/*.spec.md</code> so site docs stay aligned with implementation contracts.
        </p>
        <p class="subtitle">Generated: ${escapeHtml(generatedAt)}</p>
        <div class="hero-actions">
          <a href="../" class="btn btn-primary">Open SmartPad App</a>
          <a href="https://github.com/nmaxcom/SmartPad/issues/new?template=bug_report.yml" class="btn btn-secondary" target="_blank" rel="noreferrer">Report a bug</a>
        </div>
      </div>
    </header>

    <main class="content">
      <nav class="toc">
        <a href="#overview">Overview</a>
        ${topNav}
      </nav>

      <section id="overview" class="card">
        <h2>Overview</h2>
        <p>
          This public docs surface is generated, not hand-written. Update specs first, then run
          <code>npm run docs:web:build</code> to refresh this site content.
        </p>
        <p>
          Total specs included: <strong>${specs.length}</strong>
        </p>
      </section>

      ${cards}
    </main>
  </body>
</html>
`;
};

const main = () => {
  const specFiles = readSpecFiles();
  const specs = specFiles.map((filePath) => {
    const fileName = path.basename(filePath);
    const content = fs.readFileSync(filePath, "utf8");
    const title = extractTitle(content, fileName);
    const shortTitle = deriveShortTitle(title);
    const sections = extractSections(content);
    const summary = extractSummary(content);
    const examples = pickExamples(extractCodeBlocks(content));
    return {
      fileName,
      title,
      shortTitle,
      summary,
      sections,
      examples,
      id: `spec-${slugify(fileName.replace(/\.spec\.md$/i, ""))}`,
    };
  });

  fs.writeFileSync(outputPath, buildHtml(specs), "utf8");
  console.log(`Generated web docs: ${path.relative(repoRoot, outputPath)} (${specs.length} specs)`);
};

module.exports = {
  buildHtml,
  deriveShortTitle,
  extractCodeBlocks,
  extractSections,
  extractSummary,
  extractTitle,
  humanizeFileStem,
  pickExamples,
  slugify,
};

if (require.main === module) {
  main();
}
