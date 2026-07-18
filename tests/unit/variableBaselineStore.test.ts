import { NumberValue } from "../../src/types/NumberValue";
import { PercentageValue } from "../../src/types/PercentageValue";
import type { Variable } from "../../src/state/types";
import {
  VARIABLE_BASELINE_STORAGE_KEY,
  classifyVariableRole,
  clearVariableBaseline,
  compareVariableWithBaseline,
  createVariableBaselineEntry,
  loadVariableBaseline,
  saveVariableBaseline,
  type VariableBaselineSnapshot,
} from "../../src/state/variableBaselineStore";

const variable = (
  name: string,
  rawValue: string,
  value: Variable["value"],
): Variable => ({
  name,
  rawValue,
  value,
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

describe("variable baseline store", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test("classifies literal assumptions separately from derived formulas", () => {
    expect(classifyVariableRole("32 EUR")).toBe("input");
    expect(classifyVariableRole("EUR 32")).toBe("input");
    expect(classifyVariableRole("12%")).toBe("input");
    expect(classifyVariableRole("4.5 km/h")).toBe("input");
    expect(classifyVariableRole("attendees * ticket price")).toBe("derived");
    expect(classifyVariableRole("revenue - variable cost")).toBe("derived");
  });

  test("captures semantic numeric values and reports meaningful deltas", () => {
    const baselineVariable = variable(
      "discount",
      "12%",
      new PercentageValue(12),
    );
    const baseline = createVariableBaselineEntry(baselineVariable, "12%");
    expect(baseline).toEqual({
      displayValue: "12%",
      numericValue: 0.12,
      semanticType: "percentage",
      role: "input",
    });

    const comparison = compareVariableWithBaseline(
      baseline!,
      variable("discount", "15%", new PercentageValue(15)),
    );
    expect(comparison).toMatchObject({
      changed: true,
      direction: "up",
      percentDelta: 25,
      typeChanged: false,
    });
  });

  test("persists independent snapshots per sheet and clears only the active one", () => {
    const first: VariableBaselineSnapshot = {
      capturedAt: 1,
      entries: {
        attendees: {
          displayValue: "140",
          numericValue: 140,
          semanticType: "number",
          role: "input",
        },
      },
    };
    const second: VariableBaselineSnapshot = {
      capturedAt: 2,
      entries: {
        result: {
          displayValue: "20",
          numericValue: 20,
          semanticType: "number",
          role: "derived",
        },
      },
    };

    saveVariableBaseline("sheet-a", first);
    saveVariableBaseline("sheet-b", second);
    expect(loadVariableBaseline("sheet-a")).toEqual(first);
    expect(loadVariableBaseline("sheet-b")).toEqual(second);

    clearVariableBaseline("sheet-a");
    expect(loadVariableBaseline("sheet-a")).toBeNull();
    expect(loadVariableBaseline("sheet-b")).toEqual(second);

    clearVariableBaseline("sheet-b");
    expect(
      window.localStorage.getItem(VARIABLE_BASELINE_STORAGE_KEY),
    ).toBeNull();
  });

  test("ignores corrupt persisted data", () => {
    window.localStorage.setItem(VARIABLE_BASELINE_STORAGE_KEY, "not-json");
    expect(loadVariableBaseline("sheet-a")).toBeNull();

    window.localStorage.setItem(
      VARIABLE_BASELINE_STORAGE_KEY,
      JSON.stringify({
        "sheet-a": { capturedAt: 1, entries: { broken: true } },
      }),
    );
    expect(loadVariableBaseline("sheet-a")).toBeNull();
  });

  test("treats a zero baseline as changed without inventing an infinite percentage", () => {
    const baseline = createVariableBaselineEntry(
      variable("growth", "0", new NumberValue(0)),
      "0",
    );
    const comparison = compareVariableWithBaseline(
      baseline!,
      variable("growth", "5", new NumberValue(5)),
    );

    expect(comparison).toMatchObject({
      changed: true,
      direction: "up",
      percentDelta: null,
    });
  });

  test("flags semantic type changes instead of presenting a numeric delta", () => {
    const baseline = createVariableBaselineEntry(
      variable("rate", "0.12", new NumberValue(0.12)),
      "0.12",
    );
    const comparison = compareVariableWithBaseline(
      baseline!,
      variable("rate", "12%", new PercentageValue(12)),
    );

    expect(comparison).toMatchObject({
      changed: true,
      direction: "same",
      percentDelta: null,
      typeChanged: true,
    });
  });
});
