import type { Variable } from "./types";

export const VARIABLE_BASELINE_STORAGE_KEY = "smartpad-variable-baselines-v1";

export type VariableRole = "input" | "derived";

export interface VariableBaselineEntry {
  displayValue: string;
  numericValue: number;
  semanticType: string;
  role: VariableRole;
}

export interface VariableBaselineSnapshot {
  capturedAt: number;
  entries: Record<string, VariableBaselineEntry>;
}

export interface VariableBaselineComparison {
  changed: boolean;
  direction: "up" | "down" | "same";
  percentDelta: number | null;
  typeChanged: boolean;
}

type VariableBaselineCollection = Record<string, VariableBaselineSnapshot>;

const LITERAL_ASSUMPTION_REGEX =
  /^\s*(?:(?:[$€£¥₹₿]\s*|[A-Z]{3}\s+))?[+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:e[+-]?\d+)?(?:\s*(?:%|[A-Za-zµμ°$€£¥₹₿][A-Za-z0-9µμ°$€£¥₹₿/*^_.-]*))?\s*$/i;

const isValidEntry = (value: unknown): value is VariableBaselineEntry => {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<VariableBaselineEntry>;
  return (
    typeof entry.displayValue === "string" &&
    typeof entry.numericValue === "number" &&
    Number.isFinite(entry.numericValue) &&
    typeof entry.semanticType === "string" &&
    (entry.role === "input" || entry.role === "derived")
  );
};

const isValidSnapshot = (value: unknown): value is VariableBaselineSnapshot => {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<VariableBaselineSnapshot>;
  return (
    typeof snapshot.capturedAt === "number" &&
    Boolean(snapshot.entries) &&
    typeof snapshot.entries === "object" &&
    Object.values(snapshot.entries ?? {}).every(isValidEntry)
  );
};

const readCollection = (storage: Storage): VariableBaselineCollection => {
  try {
    const raw = storage.getItem(VARIABLE_BASELINE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};

    const validEntries = Object.entries(parsed).filter(
      (entry): entry is [string, VariableBaselineSnapshot] =>
        isValidSnapshot(entry[1]),
    );
    return Object.fromEntries(validEntries);
  } catch {
    return {};
  }
};

const getStorage = (): Storage | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

export const classifyVariableRole = (rawValue: string): VariableRole =>
  LITERAL_ASSUMPTION_REGEX.test(rawValue.trim()) ? "input" : "derived";

export const getFiniteNumericValue = (variable: Variable): number | null => {
  try {
    if (!variable.value?.isNumeric?.()) return null;
    const numericValue = variable.value.getNumericValue();
    return Number.isFinite(numericValue) ? numericValue : null;
  } catch {
    return null;
  }
};

export const createVariableBaselineEntry = (
  variable: Variable,
  displayValue: string,
): VariableBaselineEntry | null => {
  const numericValue = getFiniteNumericValue(variable);
  if (numericValue === null) return null;

  return {
    displayValue,
    numericValue,
    semanticType: variable.value.getType(),
    role: classifyVariableRole(variable.rawValue || ""),
  };
};

export const compareVariableWithBaseline = (
  baseline: VariableBaselineEntry,
  variable: Variable,
): VariableBaselineComparison | null => {
  const currentValue = getFiniteNumericValue(variable);
  if (currentValue === null) return null;

  const currentType = variable.value.getType();
  const typeChanged = currentType !== baseline.semanticType;
  const difference = currentValue - baseline.numericValue;
  const tolerance =
    Math.max(1, Math.abs(currentValue), Math.abs(baseline.numericValue)) * 1e-9;
  const changed = typeChanged || Math.abs(difference) > tolerance;
  const direction =
    !changed || Math.abs(difference) <= tolerance
      ? "same"
      : difference > 0
        ? "up"
        : "down";
  const percentDelta =
    typeChanged || Math.abs(baseline.numericValue) <= tolerance
      ? null
      : (difference / Math.abs(baseline.numericValue)) * 100;

  return { changed, direction, percentDelta, typeChanged };
};

export const loadVariableBaseline = (
  sheetId: string,
): VariableBaselineSnapshot | null => {
  const storage = getStorage();
  if (!storage || !sheetId) return null;
  return readCollection(storage)[sheetId] ?? null;
};

export const saveVariableBaseline = (
  sheetId: string,
  snapshot: VariableBaselineSnapshot,
): void => {
  const storage = getStorage();
  if (!storage || !sheetId) return;
  try {
    const collection = readCollection(storage);
    collection[sheetId] = snapshot;
    storage.setItem(VARIABLE_BASELINE_STORAGE_KEY, JSON.stringify(collection));
  } catch {}
};

export const clearVariableBaseline = (sheetId: string): void => {
  const storage = getStorage();
  if (!storage || !sheetId) return;
  try {
    const collection = readCollection(storage);
    delete collection[sheetId];
    if (Object.keys(collection).length === 0) {
      storage.removeItem(VARIABLE_BASELINE_STORAGE_KEY);
    } else {
      storage.setItem(
        VARIABLE_BASELINE_STORAGE_KEY,
        JSON.stringify(collection),
      );
    }
  } catch {}
};
