const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = process.cwd();
const specMapPath = path.join(repoRoot, "docs", "spec-map.json");

const getChangedFiles = (rangeArg) => {
  const range = rangeArg || "HEAD~1...HEAD";
  try {
    const output = execSync(`git diff --name-only ${range}`, { encoding: "utf8" });
    return output
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
};

const startsWithAny = (file, prefixes) => prefixes.some((prefix) => file.startsWith(prefix));

const formatList = (items) => (items.length ? items.map((f) => `- ${f}`).join("\n") : "- none");

const main = () => {
  const rangeArg = process.argv[2];
  const changedFiles = getChangedFiles(rangeArg);

  const map = JSON.parse(fs.readFileSync(specMapPath, "utf8"));
  const docsChanged = changedFiles.filter((f) => f.startsWith("docs/"));
  const codeOrSpecChanged = changedFiles.filter(
    (f) => f.startsWith("src/") || f.startsWith("docs/Specs/") || f.endsWith(".spec.md")
  );

  const impactedGroups = map.groups
    .map((group) => {
      const specHits = changedFiles.filter((f) => startsWithAny(f, group.specPrefixes));
      const docHits = changedFiles.filter((f) => startsWithAny(f, group.docPrefixes));
      if (!specHits.length && !docHits.length) return null;
      return { name: group.name, specHits, docHits };
    })
    .filter(Boolean);

  console.log("Docs Review Snapshot");
  console.log("====================");
  console.log(`Range: ${rangeArg || "HEAD~1...HEAD"}`);
  console.log(`Changed files: ${changedFiles.length}`);
  console.log(`Code/spec changes: ${codeOrSpecChanged.length}`);
  console.log(`Docs changes: ${docsChanged.length}`);
  console.log("");
  console.log("Changed code/spec files:");
  console.log(formatList(codeOrSpecChanged));
  console.log("");
  console.log("Changed docs files:");
  console.log(formatList(docsChanged));
  console.log("");
  console.log("Impacted mapped groups:");
  if (!impactedGroups.length) {
    console.log("- none");
    return;
  }
  impactedGroups.forEach((group) => {
    console.log(`- ${group.name}`);
    console.log(`  spec/code hits: ${group.specHits.length}`);
    console.log(`  docs hits: ${group.docHits.length}`);
  });
};

main();
