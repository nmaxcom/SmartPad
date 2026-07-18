import type {
  VariableBaselineEntry,
  VariableBaselineSnapshot,
} from "./variableBaselineStore";

export const SCENARIO_COMPARISON_STORAGE_KEY =
  "smartpad-scenario-comparisons-v1";
export const MAX_SCENARIOS_PER_SHEET = 6;
export const MAX_SCENARIO_NAME_LENGTH = 48;

export interface SavedScenario {
  id: string;
  name: string;
  capturedAt: number;
  entries: Record<string, VariableBaselineEntry>;
}

export interface SheetScenarioComparison {
  pinnedVariable: string;
  scenarios: SavedScenario[];
}

export interface StoredScenarioComparison {
  changed: boolean;
  direction: "up" | "down" | "same";
  percentDelta: number | null;
  typeChanged: boolean;
}

type ScenarioComparisonCollection = Record<string, SheetScenarioComparison>;

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

const isValidScenario = (value: unknown): value is SavedScenario => {
  if (!value || typeof value !== "object") return false;
  const scenario = value as Partial<SavedScenario>;
  return (
    typeof scenario.id === "string" &&
    scenario.id.length > 0 &&
    typeof scenario.name === "string" &&
    scenario.name.length > 0 &&
    typeof scenario.capturedAt === "number" &&
    Boolean(scenario.entries) &&
    typeof scenario.entries === "object" &&
    Object.values(scenario.entries ?? {}).every(isValidEntry)
  );
};

const isValidComparison = (
  value: unknown,
): value is SheetScenarioComparison => {
  if (!value || typeof value !== "object") return false;
  const comparison = value as Partial<SheetScenarioComparison>;
  return (
    typeof comparison.pinnedVariable === "string" &&
    Array.isArray(comparison.scenarios) &&
    comparison.scenarios.every(isValidScenario)
  );
};

const getStorage = (): Storage | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

const readCollection = (storage: Storage): ScenarioComparisonCollection => {
  try {
    const raw = storage.getItem(SCENARIO_COMPARISON_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, SheetScenarioComparison] =>
          isValidComparison(entry[1]),
      ),
    );
  } catch {
    return {};
  }
};

const writeCollection = (
  storage: Storage,
  collection: ScenarioComparisonCollection,
): void => {
  if (Object.keys(collection).length === 0) {
    storage.removeItem(SCENARIO_COMPARISON_STORAGE_KEY);
    return;
  }
  storage.setItem(SCENARIO_COMPARISON_STORAGE_KEY, JSON.stringify(collection));
};

export const sanitizeScenarioName = (value: string): string =>
  value.replace(/\s+/g, " ").trim().slice(0, MAX_SCENARIO_NAME_LENGTH);

export const suggestScenarioName = (
  comparison: SheetScenarioComparison | null,
): string => {
  const used = new Set(
    (comparison?.scenarios ?? []).map((scenario) =>
      scenario.name.toLocaleLowerCase(),
    ),
  );
  let index = 1;
  while (used.has(`scenario ${index}`)) index += 1;
  return `Scenario ${index}`;
};

const makeUniqueScenarioName = (
  requestedName: string,
  scenarios: SavedScenario[],
): string => {
  const base = sanitizeScenarioName(requestedName) || "Scenario";
  const used = new Set(
    scenarios.map((scenario) => scenario.name.toLocaleLowerCase()),
  );
  if (!used.has(base.toLocaleLowerCase())) return base;

  let suffix = 2;
  while (
    used.has(
      `${base} ${suffix}`
        .slice(0, MAX_SCENARIO_NAME_LENGTH)
        .toLocaleLowerCase(),
    )
  ) {
    suffix += 1;
  }
  return `${base} ${suffix}`.slice(0, MAX_SCENARIO_NAME_LENGTH);
};

export const loadScenarioComparison = (
  sheetId: string,
): SheetScenarioComparison | null => {
  const storage = getStorage();
  if (!storage || !sheetId) return null;
  return readCollection(storage)[sheetId] ?? null;
};

export const captureScenario = (
  sheetId: string,
  pinnedVariable: string,
  requestedName: string,
  snapshot: VariableBaselineSnapshot,
): SheetScenarioComparison | null => {
  const storage = getStorage();
  const variableName = pinnedVariable.trim();
  if (!storage || !sheetId || !variableName) return null;

  try {
    const collection = readCollection(storage);
    const current = collection[sheetId] ?? {
      pinnedVariable: variableName,
      scenarios: [],
    };
    if (current.scenarios.length >= MAX_SCENARIOS_PER_SHEET) return null;

    const name = makeUniqueScenarioName(requestedName, current.scenarios);
    const scenario: SavedScenario = {
      id: `scenario_${Date.now().toString(36)}_${Math.random()
        .toString(36)
        .slice(2, 8)}`,
      name,
      capturedAt: snapshot.capturedAt,
      entries: snapshot.entries,
    };
    const next: SheetScenarioComparison = {
      pinnedVariable: variableName,
      scenarios: [...current.scenarios, scenario],
    };
    collection[sheetId] = next;
    writeCollection(storage, collection);
    return next;
  } catch {
    return null;
  }
};

export const pinScenarioVariable = (
  sheetId: string,
  variableName: string,
): SheetScenarioComparison | null => {
  const storage = getStorage();
  const pinnedVariable = variableName.trim();
  if (!storage || !sheetId || !pinnedVariable) return null;
  try {
    const collection = readCollection(storage);
    const current = collection[sheetId];
    if (!current || current.scenarios.length === 0) return null;
    const next = { ...current, pinnedVariable };
    collection[sheetId] = next;
    writeCollection(storage, collection);
    return next;
  } catch {
    return null;
  }
};

export const removeScenario = (
  sheetId: string,
  scenarioId: string,
): SheetScenarioComparison | null => {
  const storage = getStorage();
  if (!storage || !sheetId || !scenarioId) return null;
  try {
    const collection = readCollection(storage);
    const current = collection[sheetId];
    if (!current) return null;
    const scenarios = current.scenarios.filter(
      (scenario) => scenario.id !== scenarioId,
    );
    if (scenarios.length === 0) {
      delete collection[sheetId];
      writeCollection(storage, collection);
      return null;
    }
    const next = { ...current, scenarios };
    collection[sheetId] = next;
    writeCollection(storage, collection);
    return next;
  } catch {
    return null;
  }
};

export const clearScenarioComparison = (sheetId: string): void => {
  const storage = getStorage();
  if (!storage || !sheetId) return;
  try {
    const collection = readCollection(storage);
    delete collection[sheetId];
    writeCollection(storage, collection);
  } catch {}
};

export const compareStoredScenarioEntries = (
  baseline: VariableBaselineEntry,
  current: VariableBaselineEntry,
): StoredScenarioComparison => {
  const typeChanged = baseline.semanticType !== current.semanticType;
  const difference = current.numericValue - baseline.numericValue;
  const tolerance =
    Math.max(
      1,
      Math.abs(current.numericValue),
      Math.abs(baseline.numericValue),
    ) * 1e-9;
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
