import { parseRuntimeModeParams } from "../../src/utils/runtimeMode";

describe("App runtime mode params", () => {
  it("detects embed mode when sp_embed=1", () => {
    expect(parseRuntimeModeParams("?sp_embed=1")).toEqual({
      embed: true,
      forceSpatialNeon: false,
    });
  });

  it("detects spatial neon force theme when sp_theme=spatial-neon", () => {
    expect(parseRuntimeModeParams("?sp_theme=spatial-neon")).toEqual({
      embed: false,
      forceSpatialNeon: true,
    });
  });

  it("supports both embed and spatial neon together", () => {
    expect(parseRuntimeModeParams("?sp_embed=1&sp_theme=spatial-neon")).toEqual({
      embed: true,
      forceSpatialNeon: true,
    });
  });

  it("defaults to non-embed without params", () => {
    expect(parseRuntimeModeParams("")).toEqual({
      embed: false,
      forceSpatialNeon: false,
    });
  });
});
