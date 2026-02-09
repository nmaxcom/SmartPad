import type { SyntaxThemeId, UIThemeId } from "../state/types";

export interface UIThemeOption {
  id: UIThemeId;
  label: string;
  tone: "dark" | "light";
  preview: readonly string[];
}

export interface SyntaxThemeOption {
  id: SyntaxThemeId;
  label: string;
  tone: "dark" | "light";
  preview: readonly string[];
}

export const UI_THEME_OPTIONS: UIThemeOption[] = [
  {
    id: "spatial-dark",
    label: "Spatial Canvas",
    tone: "dark",
    preview: ["#1b1a2e", "#252542", "#7c5dfa", "#00d9c0"],
  },
  {
    id: "graphite-dark",
    label: "Graphite Grid",
    tone: "dark",
    preview: ["#131a24", "#1d2633", "#5a8dff", "#39c6b6"],
  },
  {
    id: "obsidian-ember-dark",
    label: "Obsidian Ember",
    tone: "dark",
    preview: ["#0b090d", "#17121d", "#ff7a18", "#36d9b5"],
  },
  {
    id: "paper-light",
    label: "Paper Studio",
    tone: "light",
    preview: ["#f4f6fb", "#ffffff", "#4d5dd4", "#0f7f7f"],
  },
  {
    id: "sunrise-light",
    label: "Sunrise Ledger",
    tone: "light",
    preview: ["#fff7ef", "#fffdf9", "#be6230", "#1b7f68"],
  },
  {
    id: "mint-breeze-light",
    label: "Mint Breeze",
    tone: "light",
    preview: ["#e9fff6", "#fcfffe", "#007a5a", "#007d8b"],
  },
];

export const SYNTAX_THEME_OPTIONS: SyntaxThemeOption[] = [
  {
    id: "spatial-syntax",
    label: "Spatial Neon",
    tone: "dark",
    preview: ["#00d9c0", "#ffd93d", "#7c5dfa", "#ff6b9d"],
  },
  {
    id: "neon-syntax",
    label: "Neon Circuit",
    tone: "dark",
    preview: ["#46f4ff", "#ffe36c", "#9c7cff", "#ff6f97"],
  },
  {
    id: "ember-syntax",
    label: "Ember Contrast",
    tone: "dark",
    preview: ["#46f2c2", "#ffd36f", "#ff9d3b", "#ff6b8f"],
  },
  {
    id: "ink-syntax",
    label: "Ink Contrast",
    tone: "light",
    preview: ["#00697a", "#7c5a00", "#1d4ed8", "#b42318"],
  },
  {
    id: "sunset-syntax",
    label: "Sunset Markup",
    tone: "light",
    preview: ["#2f8f79", "#9a6f00", "#c45a1f", "#a6374f"],
  },
  {
    id: "mint-syntax",
    label: "Mint Markup",
    tone: "light",
    preview: ["#007f93", "#7f6a00", "#007a5a", "#b0416b"],
  },
];

const UI_THEME_IDS = new Set(UI_THEME_OPTIONS.map((theme) => theme.id));
const SYNTAX_THEME_IDS = new Set(SYNTAX_THEME_OPTIONS.map((theme) => theme.id));

export function isUIThemeId(value: string): value is UIThemeId {
  return UI_THEME_IDS.has(value as UIThemeId);
}

export function isSyntaxThemeId(value: string): value is SyntaxThemeId {
  return SYNTAX_THEME_IDS.has(value as SyntaxThemeId);
}

export function normalizeUIThemeId(value: unknown, fallback: UIThemeId): UIThemeId {
  if (typeof value === "string" && isUIThemeId(value)) return value;
  return fallback;
}

export function normalizeSyntaxThemeId(value: unknown, fallback: SyntaxThemeId): SyntaxThemeId {
  if (typeof value === "string" && isSyntaxThemeId(value)) return value;
  return fallback;
}
