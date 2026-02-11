import { shouldShowLiveForAssignmentValue } from "../../src/eval/liveResultPreview";
import type { Variable } from "../../src/state/types";

const buildVariable = (name: string): Variable => ({
  name,
  value: null as any,
  rawValue: "",
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe("shouldShowLiveForAssignmentValue", () => {
  test("returns false for plain literal assignment values", () => {
    const variableContext = new Map<string, Variable>();
    const functionStore = new Map<string, any>();
    expect(shouldShowLiveForAssignmentValue("15%", variableContext, functionStore)).toBe(false);
    expect(shouldShowLiveForAssignmentValue("$120.50", variableContext, functionStore)).toBe(false);
    expect(shouldShowLiveForAssignmentValue("42", variableContext, functionStore)).toBe(false);
  });

  test("returns true for math, conversion, and phrase operators", () => {
    const variableContext = new Map<string, Variable>();
    const functionStore = new Map<string, any>();
    expect(shouldShowLiveForAssignmentValue("discount * 2", variableContext, functionStore)).toBe(
      true
    );
    expect(
      shouldShowLiveForAssignmentValue("101 kPa to psi", variableContext, functionStore)
    ).toBe(true);
    expect(
      shouldShowLiveForAssignmentValue("tax on final price", variableContext, functionStore)
    ).toBe(true);
  });

  test("returns true when value references known variables or functions", () => {
    const variableContext = new Map<string, Variable>([
      ["discount", buildVariable("discount")],
      ["base price", buildVariable("base price")],
    ]);
    const functionStore = new Map<string, any>([["myFunc", {}]]);

    expect(
      shouldShowLiveForAssignmentValue("discount off base price", variableContext, functionStore)
    ).toBe(true);
    expect(shouldShowLiveForAssignmentValue("myFunc(2)", variableContext, functionStore)).toBe(
      true
    );
  });
});
