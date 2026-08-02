const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function trashFailureMessage(result) {
  return (
    result?.stderr ||
    result?.stdout ||
    result?.error?.message ||
    "`trash` command failed"
  );
}

function moveGeneratedPathToTrash(targetPath, overrides = {}) {
  const existsSync = overrides.existsSync || fs.existsSync;
  if (!existsSync(targetPath)) return { method: "missing" };

  const runTrash = overrides.spawnSync || spawnSync;
  let result;
  try {
    result = runTrash("trash", [targetPath], { encoding: "utf8" });
  } catch (error) {
    result = { status: null, error };
  }

  if (result?.status === 0) return { method: "trash" };

  const tmpdir = overrides.tmpdir || os.tmpdir;
  const mkdirSync = overrides.mkdirSync || fs.mkdirSync;
  const renameSync = overrides.renameSync || fs.renameSync;
  const now = overrides.now || Date.now;
  const pid = overrides.pid ?? process.pid;
  const randomToken =
    overrides.randomToken || (() => Math.random().toString(36).slice(2, 10));
  const warn = overrides.warn || console.warn;
  const fallbackRoot = path.join(tmpdir(), "smartpad-generated-trash");
  const fallbackPath = path.join(
    fallbackRoot,
    `${path.basename(targetPath)}-${now()}-${pid}-${randomToken()}`,
  );

  try {
    mkdirSync(fallbackRoot, { recursive: true });
    renameSync(targetPath, fallbackPath);
  } catch (fallbackError) {
    throw new Error(
      `Unable to preserve generated path before regeneration: ${targetPath}\n` +
        `Trash failure: ${trashFailureMessage(result)}\n` +
        `Fallback move failure: ${fallbackError.message}`,
    );
  }

  warn(`System trash unavailable; preserved generated path at ${fallbackPath}`);
  return { method: "fallback", backupPath: fallbackPath };
}

module.exports = { moveGeneratedPathToTrash };
