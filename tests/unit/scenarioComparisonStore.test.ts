import {
  MAX_SCENARIOS_PER_SHEET,
  SCENARIO_COMPARISON_STORAGE_KEY,
  captureScenario,
  clearScenarioComparison,
  compareStoredScenarioEntries,
  loadScenarioComparison,
  pinScenarioVariable,
  removeScenario,
  sanitizeScenarioName,
  suggestScenarioName,
} from "../../src/state/scenarioComparisonStore";
import type {
  VariableBaselineEntry,
  VariableBaselineSnapshot,
} from "../../src/state/variableBaselineStore";

const entry = (
  numericValue: number,
  displayValue = String(numericValue),
  semanticType = "number",
): VariableBaselineEntry => ({
  displayValue,
  numericValue,
  semanticType,
  role: "derived",
});

const snapshot = (profit: number): VariableBaselineSnapshot => ({
  capturedAt: Date.now(),
  entries: {
    profit: entry(profit, `${profit} EUR`, "currency"),
    margin: entry(profit / 100, `${profit}%`, "percentage"),
  },
});

describe("scenarioComparisonStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test("captures named scenarios per sheet and makes duplicate names unique", () => {
    const first = captureScenario(
      "sheet-a",
      "profit",
      " Higher ticket ",
      snapshot(1200),
    );
    const second = captureScenario(
      "sheet-a",
      "profit",
      "Higher   ticket",
      snapshot(1400),
    );

    expect(first?.scenarios[0].name).toBe("Higher ticket");
    expect(second?.scenarios.map((scenario) => scenario.name)).toEqual([
      "Higher ticket",
      "Higher ticket 2",
    ]);
    expect(loadScenarioComparison("sheet-a")).toEqual(second);
    expect(loadScenarioComparison("sheet-b")).toBeNull();
  });

  test("pins another output, removes individual scenarios, and clears the sheet", () => {
    const first = captureScenario(
      "sheet-a",
      "profit",
      "Base plan",
      snapshot(1000),
    );
    const second = captureScenario(
      "sheet-a",
      "profit",
      "Growth",
      snapshot(1500),
    );
    expect(pinScenarioVariable("sheet-a", "margin")?.pinnedVariable).toBe(
      "margin",
    );

    const afterRemove = removeScenario("sheet-a", first?.scenarios[0].id ?? "");
    expect(afterRemove?.scenarios.map((scenario) => scenario.name)).toEqual([
      "Growth",
    ]);

    removeScenario("sheet-a", second?.scenarios[1].id ?? "");
    expect(loadScenarioComparison("sheet-a")).toBeNull();

    captureScenario("sheet-a", "profit", "Again", snapshot(900));
    clearScenarioComparison("sheet-a");
    expect(loadScenarioComparison("sheet-a")).toBeNull();
  });

  test("limits saved scenarios and suggests the next available name", () => {
    for (let index = 1; index <= MAX_SCENARIOS_PER_SHEET; index += 1) {
      expect(
        captureScenario(
          "sheet-a",
          "profit",
          `Scenario ${index}`,
          snapshot(index),
        ),
      ).not.toBeNull();
    }
    expect(
      captureScenario("sheet-a", "profit", "One too many", snapshot(99)),
    ).toBeNull();
    expect(suggestScenarioName(loadScenarioComparison("sheet-a"))).toBe(
      "Scenario 7",
    );
    expect(sanitizeScenarioName("  A    careful plan  ")).toBe(
      "A careful plan",
    );
  });

  test("compares stored values semantically and recovers from corrupt storage", () => {
    expect(compareStoredScenarioEntries(entry(100), entry(125))).toEqual({
      changed: true,
      direction: "up",
      percentDelta: 25,
      typeChanged: false,
    });
    expect(
      compareStoredScenarioEntries(entry(0), entry(3, "3 EUR", "currency")),
    ).toMatchObject({
      changed: true,
      direction: "up",
      percentDelta: null,
      typeChanged: true,
    });

    window.localStorage.setItem(SCENARIO_COMPARISON_STORAGE_KEY, "{broken");
    expect(loadScenarioComparison("sheet-a")).toBeNull();
  });
});
