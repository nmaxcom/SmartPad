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

const startsWithAny = (file, prefixes = []) => prefixes.some((prefix) => file.startsWith(prefix));

const main = () => {
  const map = JSON.parse(fs.readFileSync(specMapPath, "utf8"));
  const changedFiles = getChangedFiles(range);
  const failingGroups = [];

  map.groups.forEach((group) => {
    const specHits = changedFiles.filter((file) => startsWithAny(file, group.specPrefixes));
    if (specHits.length === 0) return;

    const testHits = changedFiles.filter((file) => startsWithAny(file, group.testPrefixes || []));
    if (testHits.length === 0) {
      failingGroups.push({ name: group.name, specHits });
    }
  });

  if (failingGroups.length === 0) {
    console.log("Spec-test sync check passed.");
    process.exit(0);
  }

  console.error("Spec-test sync check failed.");
  console.error("Behavior/spec mapped groups changed without corresponding test updates:");
  failingGroups.forEach((group) => {
    console.error(`- ${group.name}`);
    group.specHits.forEach((file) => console.error(`  - changed: ${file}`));
  });
  console.error("Add or update tests in mapped test prefixes, then rerun.");
  process.exit(1);
};

main();
