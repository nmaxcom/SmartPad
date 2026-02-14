const fs = require("node:fs");
const path = require("node:path");

const repoRoot = process.cwd();
const docsBuildDir = path.join(repoRoot, "website", "build");
const publicDocsDir = path.join(repoRoot, "public", "docs");

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function main() {
  if (!fs.existsSync(docsBuildDir)) {
    console.error("Docusaurus build output not found. Run `npm run docs:docusaurus:build` first.");
    process.exit(1);
  }

  fs.rmSync(publicDocsDir, { recursive: true, force: true });
  copyDirRecursive(docsBuildDir, publicDocsDir);
  console.log("Synced Docusaurus build to public/docs");
}

main();
