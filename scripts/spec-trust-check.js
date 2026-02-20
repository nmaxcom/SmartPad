const fs = require("node:fs");
const path = require("node:path");

const repoRoot = process.cwd();
const trustPath = path.join(repoRoot, "docs", "spec-trust.json");
const mapPath = path.join(repoRoot, "docs", "spec-map.json");
const specsDir = path.join(repoRoot, "docs", "Specs");

const VALID_STATUSES = new Set(["implemented", "partial", "proposed", "deprecated"]);

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

const fileExists = (relPath) => fs.existsSync(path.join(repoRoot, relPath));

const main = () => {
  const trust = readJson(trustPath);
  const map = readJson(mapPath);
  const failures = [];

  const entries = Array.isArray(trust.entries) ? trust.entries : [];
  if (entries.length === 0) {
    failures.push("docs/spec-trust.json has no entries.");
  }

  const ids = new Set();
  const sourceSpecs = new Set();
  const canonicalSpecs = new Set();
  const groupNames = new Set((map.groups || []).map((group) => group.name));

  entries.forEach((entry, index) => {
    const label = `entry[${index}]`;
    if (!entry || typeof entry !== "object") {
      failures.push(`${label} is not an object.`);
      return;
    }

    if (!entry.id || typeof entry.id !== "string") {
      failures.push(`${label} missing id.`);
    } else if (ids.has(entry.id)) {
      failures.push(`${label} duplicate id "${entry.id}".`);
    } else {
      ids.add(entry.id);
    }

    if (!VALID_STATUSES.has(entry.status)) {
      failures.push(`${label} has invalid status "${entry.status}".`);
    }

    if (!entry.sourceSpec || typeof entry.sourceSpec !== "string") {
      failures.push(`${label} missing sourceSpec.`);
    } else {
      if (sourceSpecs.has(entry.sourceSpec)) {
        failures.push(`${label} duplicate sourceSpec "${entry.sourceSpec}".`);
      }
      sourceSpecs.add(entry.sourceSpec);
      if (!fileExists(entry.sourceSpec)) {
        failures.push(`${label} sourceSpec not found: ${entry.sourceSpec}`);
      }
    }

    if (!entry.canonicalSpec || typeof entry.canonicalSpec !== "string") {
      failures.push(`${label} missing canonicalSpec.`);
    } else {
      if (canonicalSpecs.has(entry.canonicalSpec)) {
        failures.push(`${label} duplicate canonicalSpec "${entry.canonicalSpec}".`);
      }
      canonicalSpecs.add(entry.canonicalSpec);
      if (!fileExists(entry.canonicalSpec)) {
        failures.push(`${label} canonicalSpec not found: ${entry.canonicalSpec}`);
      }

      if (entry.status === "implemented" && !entry.canonicalSpec.startsWith("docs/Specs/implemented/")) {
        failures.push(`${label} implemented spec must live under docs/Specs/implemented/: ${entry.canonicalSpec}`);
      }
      if (
        (entry.status === "proposed" || entry.status === "partial") &&
        !entry.canonicalSpec.startsWith("docs/Specs/proposed/")
      ) {
        failures.push(`${label} ${entry.status} spec must live under docs/Specs/proposed/: ${entry.canonicalSpec}`);
      }
    }

    const mappedGroups = Array.isArray(entry.mappedGroups) ? entry.mappedGroups : [];
    if (mappedGroups.length === 0) {
      failures.push(`${label} has no mappedGroups.`);
    } else {
      mappedGroups.forEach((group) => {
        if (!groupNames.has(group)) {
          failures.push(`${label} references unknown mapped group "${group}".`);
        }
      });
    }

    const testRefs = Array.isArray(entry.testRefs) ? entry.testRefs : [];
    if (entry.status === "implemented" && testRefs.length === 0) {
      failures.push(`${label} implemented spec must include at least one testRef.`);
    }
    testRefs.forEach((testRef) => {
      if (!fileExists(testRef)) {
        failures.push(`${label} testRef not found: ${testRef}`);
      }
    });
  });

  const sourceSpecFiles = fs
    .readdirSync(specsDir)
    .filter((file) => file.endsWith(".spec.md"))
    .map((file) => `docs/Specs/${file}`);

  sourceSpecFiles.forEach((sourceSpec) => {
    if (!sourceSpecs.has(sourceSpec)) {
      failures.push(`docs/spec-trust.json is missing source spec entry for ${sourceSpec}`);
    }
  });

  if (failures.length > 0) {
    console.error("Spec trust check failed.");
    failures.forEach((failure) => console.error(`- ${failure}`));
    console.error("Fix docs/spec-trust.json and related docs/spec files.");
    process.exit(1);
  }

  console.log("Spec trust check passed.");
  console.log(`Tracked source specs: ${sourceSpecFiles.length}`);
  console.log(`Registry entries: ${entries.length}`);
};

main();
