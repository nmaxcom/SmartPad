import { DEFAULT_SENSITIVITY_VARIATION } from "../analysis/sensitivityAnalysis";

export const SENSITIVITY_ANALYSIS_STORAGE_KEY =
  "smartpad-sensitivity-analyses-v1";

export interface PinnedSensitivityAnalysis {
  sourceLineId: string;
  sourceLine: number;
  targetName: string;
  variation: number;
  createdAt: number;
}

type SensitivityAnalysisState = Record<string, PinnedSensitivityAnalysis>;

const getStorage = (): Storage | null => {
  if (typeof window === "undefined") return null;
  return window.localStorage;
};

const isValidSelection = (
  value: unknown,
): value is PinnedSensitivityAnalysis => {
  if (!value || typeof value !== "object") return false;
  const selection = value as Partial<PinnedSensitivityAnalysis>;
  return (
    typeof selection.sourceLineId === "string" &&
    typeof selection.sourceLine === "number" &&
    selection.sourceLine >= 0 &&
    typeof selection.targetName === "string" &&
    selection.targetName.trim().length > 0 &&
    typeof selection.variation === "number" &&
    selection.variation > 0 &&
    typeof selection.createdAt === "number"
  );
};

const readState = (storage: Storage): SensitivityAnalysisState => {
  try {
    const parsed = JSON.parse(
      storage.getItem(SENSITIVITY_ANALYSIS_STORAGE_KEY) || "{}",
    ) as Record<string, unknown>;
    const state: SensitivityAnalysisState = {};
    Object.entries(parsed).forEach(([sheetId, value]) => {
      if (isValidSelection(value)) state[sheetId] = value;
    });
    return state;
  } catch {
    return {};
  }
};

const writeState = (storage: Storage, state: SensitivityAnalysisState) => {
  storage.setItem(SENSITIVITY_ANALYSIS_STORAGE_KEY, JSON.stringify(state));
};

export const loadSensitivityAnalysis = (
  sheetId: string,
): PinnedSensitivityAnalysis | null => {
  const storage = getStorage();
  if (!storage || !sheetId) return null;
  return readState(storage)[sheetId] || null;
};

export const saveSensitivityAnalysis = (
  sheetId: string,
  selection: Omit<PinnedSensitivityAnalysis, "variation" | "createdAt"> & {
    variation?: number;
  },
): PinnedSensitivityAnalysis | null => {
  const storage = getStorage();
  if (!storage || !sheetId || !selection.targetName.trim()) return null;
  const next: PinnedSensitivityAnalysis = {
    sourceLineId: selection.sourceLineId.trim(),
    sourceLine: Math.max(0, selection.sourceLine),
    targetName: selection.targetName.trim(),
    variation:
      selection.variation && selection.variation > 0
        ? selection.variation
        : DEFAULT_SENSITIVITY_VARIATION,
    createdAt: Date.now(),
  };
  writeState(storage, { ...readState(storage), [sheetId]: next });
  return next;
};

export const clearSensitivityAnalysis = (sheetId: string): void => {
  const storage = getStorage();
  if (!storage || !sheetId) return;
  const state = readState(storage);
  if (!state[sheetId]) return;
  delete state[sheetId];
  writeState(storage, state);
};
