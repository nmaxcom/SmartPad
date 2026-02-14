import { parseEmbedPreviewParams, parseRuntimeModeParams } from "../../src/utils/runtimeMode";

describe("App runtime mode params", () => {
  it("detects embed mode when sp_embed=1", () => {
    expect(parseRuntimeModeParams("?sp_embed=1")).toEqual({
      embed: true,
      forceSpatialNeon: false,
      shouldImportExample: false,
    });
  });

  it("detects spatial neon force theme when sp_theme=spatial-neon", () => {
    expect(parseRuntimeModeParams("?sp_theme=spatial-neon")).toEqual({
      embed: false,
      forceSpatialNeon: true,
      shouldImportExample: false,
    });
  });

  it("supports both embed and spatial neon together", () => {
    expect(parseRuntimeModeParams("?sp_embed=1&sp_theme=spatial-neon&sp_import=1")).toEqual({
      embed: true,
      forceSpatialNeon: true,
      shouldImportExample: true,
    });
  });

  it("defaults to non-embed without params", () => {
    expect(parseRuntimeModeParams("")).toEqual({
      embed: false,
      forceSpatialNeon: false,
      shouldImportExample: false,
    });
  });
});

describe("Embed preview params", () => {
  it("decodes preview content/title", () => {
    expect(
      parseEmbedPreviewParams(
        `?sp_preview=${encodeURIComponent("a = 1\nb = 2")}&sp_preview_title=${encodeURIComponent("Demo")}`,
      ),
    ).toEqual({
      previewContent: "a = 1\nb = 2",
      previewTitle: "Demo",
    });
  });

  it("returns null preview content when not provided", () => {
    expect(parseEmbedPreviewParams("")).toEqual({
      previewContent: null,
      previewTitle: "Docs Preview",
    });
  });
});
