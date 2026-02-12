const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = process.cwd();
const specMapPath = path.join(repoRoot, "docs", "spec-map.json");

const range = process.argv[2] || "HEAD~1...HEAD";

const getChangedFiles = (diffRange) => {
  const output = execSync(`git diff --name-only ${diffRange}`, { encoding: "utf8" });
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
};

const startsWithAny = (file, prefixes) => prefixes.some((prefix) => file.startsWith(prefix));

const main = () => {
  const changedFiles = getChangedFiles(range);
  const map = JSON.parse(fs.readFileSync(specMapPath, "utf8"));

  const failingGroups = [];
  const warningGroups = [];

  map.groups.forEach((group) => {
    const specHits = changedFiles.filter((f) => startsWithAny(f, group.specPrefixes));
    const docHits = changedFiles.filter((f) => startsWithAny(f, group.docPrefixes));

    if (specHits.length > 0 && docHits.length === 0) {
      failingGroups.push({ name: group.name, specHits });
    } else if (specHits.length > 0 && docHits.length > 0) {
      warningGroups.push({ name: group.name, specHits, docHits });
    }
  });

  if (failingGroups.length === 0) {
    console.log("Docs drift check passed.");
    if (warningGroups.length > 0) {
      console.log("Mapped groups updated with docs:");
      warningGroups.forEach((group) => {
        console.log(`- ${group.name}`);
      });
    }
    process.exit(0);
  }

  console.error("Docs drift check failed.");
  console.error(
    "Spec/code changes were detected in mapped groups without corresponding docs updates:"
  );
  failingGroups.forEach((group) => {
    console.error(`- ${group.name}`);
    group.specHits.forEach((hit) => console.error(`  - ${hit}`));
  });
  console.error(
    "Fix by updating linked docs in docs/spec-map.json mappings, then run npm run docs:drift again."
  );
  process.exit(1);
};

main();
