export interface RuntimeModeParams {
  embed: boolean;
  forceSpatialNeon: boolean;
  shouldImportExample: boolean;
}

export function parseRuntimeModeParams(search: string): RuntimeModeParams {
  const params = new URLSearchParams(search);
  return {
    embed: params.get("sp_embed") === "1",
    forceSpatialNeon: params.get("sp_theme") === "spatial-neon",
    shouldImportExample: params.get("sp_import") === "1",
  };
}

export interface EmbedPreviewParams {
  previewContent: string | null;
  previewTitle: string;
}

export function parseEmbedPreviewParams(search: string): EmbedPreviewParams {
  const params = new URLSearchParams(search);
  const raw = params.get("sp_preview");
  const rawTitle = params.get("sp_preview_title");
  return {
    previewContent: raw ? decodeURIComponent(raw).replace(/\r\n?/g, "\n").trim() : null,
    previewTitle: decodeURIComponent(rawTitle || "Docs Preview"),
  };
}
