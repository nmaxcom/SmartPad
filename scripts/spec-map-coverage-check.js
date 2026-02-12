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
  const trackedFiles = changedFiles.filter(
    (file) =>
      file.startsWith("src/") ||
      file.startsWith("docs/Specs/") ||
      file.endsWith(".spec.md")
  );

  if (trackedFiles.length === 0) {
    console.log("Spec-map coverage check passed: no mapped source/spec changes in range.");
    process.exit(0);
  }

  const unmatched = trackedFiles.filter((file) => {
    return !map.groups.some((group) => startsWithAny(file, group.specPrefixes));
  });

  if (unmatched.length === 0) {
    console.log("Spec-map coverage check passed.");
    process.exit(0);
  }

  console.error("Spec-map coverage check failed.");
  console.error("The following changed files are not mapped in docs/spec-map.json:");
  unmatched.forEach((file) => console.error(`- ${file}`));
  console.error("Update docs/spec-map.json with appropriate group mappings, then rerun.");
  process.exit(1);
};

main();
