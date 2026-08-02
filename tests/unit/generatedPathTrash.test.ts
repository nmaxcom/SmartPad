const path = require("node:path");
const {
  moveGeneratedPathToTrash,
} = require("../../scripts/generated-path-trash");

describe("generated-path trash handling", () => {
  test("uses the system trash command when it succeeds", () => {
    const spawnSync = jest.fn(() => ({ status: 0 }));
    const renameSync = jest.fn();

    const result = moveGeneratedPathToTrash("/repo/website/docs/specs", {
      existsSync: () => true,
      spawnSync,
      renameSync,
    });

    expect(result).toEqual({ method: "trash" });
    expect(spawnSync).toHaveBeenCalledWith(
      "trash",
      ["/repo/website/docs/specs"],
      { encoding: "utf8" },
    );
    expect(renameSync).not.toHaveBeenCalled();
  });

  test("preserves generated output in a temporary backup when trash is unavailable", () => {
    const mkdirSync = jest.fn();
    const renameSync = jest.fn();
    const warn = jest.fn();

    const result = moveGeneratedPathToTrash("/repo/website/docs/specs", {
      existsSync: () => true,
      spawnSync: () => ({
        status: null,
        error: new Error("spawn trash ENOENT"),
      }),
      tmpdir: () => "/tmp",
      mkdirSync,
      renameSync,
      now: () => 1234,
      pid: 42,
      randomToken: () => "fixed",
      warn,
    });

    const backupRoot = path.join("/tmp", "smartpad-generated-trash");
    const backupPath = path.join(backupRoot, "specs-1234-42-fixed");
    expect(result).toEqual({ method: "fallback", backupPath });
    expect(mkdirSync).toHaveBeenCalledWith(backupRoot, { recursive: true });
    expect(renameSync).toHaveBeenCalledWith(
      "/repo/website/docs/specs",
      backupPath,
    );
    expect(warn).toHaveBeenCalledWith(
      `System trash unavailable; preserved generated path at ${backupPath}`,
    );
  });
});
