import {
  clearSensitivityAnalysis,
  loadSensitivityAnalysis,
  saveSensitivityAnalysis,
  SENSITIVITY_ANALYSIS_STORAGE_KEY,
} from "../../src/state/sensitivityAnalysisStore";

describe("sensitivity analysis store", () => {
  beforeEach(() => window.localStorage.clear());

  test("persists one pinned analysis per sheet", () => {
    saveSensitivityAnalysis("sheet-a", {
      sourceLineId: "line-profit",
      sourceLine: 5,
      targetName: "profit",
    });
    saveSensitivityAnalysis("sheet-b", {
      sourceLineId: "line-margin",
      sourceLine: 7,
      targetName: "margin",
      variation: 0.2,
    });

    expect(loadSensitivityAnalysis("sheet-a")).toMatchObject({
      sourceLineId: "line-profit",
      sourceLine: 5,
      targetName: "profit",
      variation: 0.1,
    });
    expect(loadSensitivityAnalysis("sheet-b")).toMatchObject({
      targetName: "margin",
      variation: 0.2,
    });
  });

  test("clears only the requested sheet and ignores malformed storage", () => {
    saveSensitivityAnalysis("sheet-a", {
      sourceLineId: "line-a",
      sourceLine: 1,
      targetName: "output a",
    });
    saveSensitivityAnalysis("sheet-b", {
      sourceLineId: "line-b",
      sourceLine: 2,
      targetName: "output b",
    });
    clearSensitivityAnalysis("sheet-a");

    expect(loadSensitivityAnalysis("sheet-a")).toBeNull();
    expect(loadSensitivityAnalysis("sheet-b")?.targetName).toBe("output b");

    window.localStorage.setItem(SENSITIVITY_ANALYSIS_STORAGE_KEY, "not-json");
    expect(loadSensitivityAnalysis("sheet-b")).toBeNull();
  });
});
