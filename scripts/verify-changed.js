const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = process.cwd();
const specMapPath = path.join(repoRoot, "docs", "spec-map.json");

const args = process.argv.slice(2);

const parseArgs = (argv) => {
  const parsed = {
    range: "HEAD~1...HEAD",
    summaryFile: "",
    jsonFile: "",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token) continue;
    if (token === "--summary-file") {
      parsed.summaryFile = String(argv[i + 1] || "").trim();
      i += 1;
      continue;
    }
    if (token === "--json-file") {
      parsed.jsonFile = String(argv[i + 1] || "").trim();
      i += 1;
      continue;
    }
    if (!token.startsWith("--")) {
      parsed.range = token;
    }
  }

  return parsed;
};

const { range, summaryFile, jsonFile } = parseArgs(args);

const startsWithAny = (file, prefixes = []) => prefixes.some((prefix) => file.startsWith(prefix));

const getChangedFiles = (diffRange) => {
  const output = execSync(`git diff --name-only ${diffRange}`, {
    cwd: repoRoot,
    encoding: "utf8",
  });
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
};

const runCheck = (label, cmd) => {
  try {
    execSync(cmd, { cwd: repoRoot, stdio: "inherit" });
    return { label, cmd, ok: true };
  } catch (error) {
    return {
      label,
      cmd,
      ok: false,
      code: typeof error?.status === "number" ? error.status : 1,
    };
  }
};

const quoteArg = (value) => {
  if (!value) return "''";
  if (/^[a-zA-Z0-9._/-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, `'\\''`)}'`;
};

const collectImpactedGroups = (changedFiles, map) => {
  return map.groups
    .map((group) => {
      const specHits = changedFiles.filter((file) => startsWithAny(file, group.specPrefixes || []));
      const docHits = changedFiles.filter((file) => startsWithAny(file, group.docPrefixes || []));
      const testHits = changedFiles.filter((file) => startsWithAny(file, group.testPrefixes || []));

      return {
        name: group.name,
        specHits,
        docHits,
        testHits,
      };
    })
    .filter((group) => group.specHits.length > 0);
};

const buildSummary = ({
  range: diffRange,
  changedFiles,
  impactedGroups,
  checks,
  shouldRunBuild,
  relatedSources,
}) => {
  const lines = [];
  lines.push("## Verify Changed Summary");
  lines.push("");
  lines.push(`- Range: \`${diffRange}\``);
  lines.push(`- Changed files: \`${changedFiles.length}\``);
  lines.push(`- Impacted groups: \`${impactedGroups.length}\``);
  lines.push(`- Related source files for targeted unit checks: \`${relatedSources.length}\``);
  lines.push(`- Build required by diff: \`${shouldRunBuild ? "yes" : "no"}\``);
  lines.push("");

  if (impactedGroups.length === 0) {
    lines.push("### Impacted Groups");
    lines.push("- None");
    lines.push("");
  } else {
    lines.push("### Impacted Groups");
    impactedGroups.forEach((group) => {
      const missing = [];
      if (group.docHits.length === 0) missing.push("docs");
      if (group.testHits.length === 0) missing.push("tests");
      const suffix = missing.length > 0 ? ` (missing: ${missing.join(", ")})` : "";
      lines.push(
        `- ${group.name}: spec/code=${group.specHits.length}, docs=${group.docHits.length}, tests=${group.testHits.length}${suffix}`
      );
    });
    lines.push("");
  }

  lines.push("### Checks");
  checks.forEach((check) => {
    const icon = check.ok ? "✅" : "❌";
    lines.push(`- ${icon} ${check.label}: \`${check.cmd}\``);
  });
  lines.push("");

  const failed = checks.filter((check) => !check.ok);
  if (failed.length > 0) {
    lines.push("### Result");
    lines.push("- ❌ verify:changed failed. See failed checks above.");
  } else {
    lines.push("### Result");
    lines.push("- ✅ verify:changed passed.");
  }

  return `${lines.join("\n")}\n`;
};

const main = () => {
  const map = JSON.parse(fs.readFileSync(specMapPath, "utf8"));
  const changedFiles = getChangedFiles(range);
  const impactedGroups = collectImpactedGroups(changedFiles, map);

  const relatedSources = changedFiles.filter(
    (file) =>
      file.startsWith("src/") &&
      (file.endsWith(".ts") || file.endsWith(".tsx") || file.endsWith(".js") || file.endsWith(".jsx"))
  );
  const shouldRunBuild = changedFiles.some(
    (file) =>
      file.startsWith("src/") ||
      file === "package.json" ||
      file === "package-lock.json" ||
      file === "yarn.lock" ||
      file === "vite.config.ts" ||
      file === "tsconfig.json"
  );

  const checks = [];
  checks.push(runCheck("Spec map coverage", `npm run docs:map -- ${quoteArg(range)}`));
  checks.push(runCheck("Docs drift", `npm run docs:drift -- ${quoteArg(range)}`));
  checks.push(runCheck("Spec-test sync", `npm run spec:test -- ${quoteArg(range)}`));
  checks.push(runCheck("Spec trust", "npm run spec:trust"));

  if (relatedSources.length > 0) {
    const quotedSources = relatedSources.map((file) => quoteArg(file)).join(" ");
    checks.push(
      runCheck(
        "Related unit tests",
        `CI=1 npx jest --findRelatedTests ${quotedSources} --passWithNoTests --watchman=false --runInBand`
      )
    );
  } else {
    checks.push({
      label: "Related unit tests",
      cmd: "CI=1 npx jest --findRelatedTests <changed src files> --passWithNoTests --watchman=false --runInBand",
      ok: true,
      skipped: true,
    });
  }

  if (shouldRunBuild) {
    checks.push(runCheck("Build", "npm run build"));
  } else {
    checks.push({
      label: "Build",
      cmd: "npm run build",
      ok: true,
      skipped: true,
    });
  }

  const summary = buildSummary({
    range,
    changedFiles,
    impactedGroups,
    checks,
    shouldRunBuild,
    relatedSources,
  });

  if (summaryFile) {
    fs.mkdirSync(path.dirname(path.resolve(repoRoot, summaryFile)), { recursive: true });
    fs.writeFileSync(path.resolve(repoRoot, summaryFile), summary, "utf8");
  }

  if (jsonFile) {
    const payload = {
      range,
      changedFiles,
      impactedGroups,
      checks,
      passed: checks.every((check) => check.ok),
      generatedAt: new Date().toISOString(),
    };
    fs.mkdirSync(path.dirname(path.resolve(repoRoot, jsonFile)), { recursive: true });
    fs.writeFileSync(path.resolve(repoRoot, jsonFile), JSON.stringify(payload, null, 2), "utf8");
  }

  process.stdout.write(summary);
  if (!checks.every((check) => check.ok)) {
    process.exit(1);
  }
};

main();
