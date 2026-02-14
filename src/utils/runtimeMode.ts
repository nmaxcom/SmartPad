export interface RuntimeModeParams {
  embed: boolean;
  forceSpatialNeon: boolean;
}

export function parseRuntimeModeParams(search: string): RuntimeModeParams {
  const params = new URLSearchParams(search);
  return {
    embed: params.get("sp_embed") === "1",
    forceSpatialNeon: params.get("sp_theme") === "spatial-neon",
  };
}
