import { parseLine } from "../../src/parsing/astParser";
import { defaultRegistry, setupDefaultEvaluators } from "../../src/eval";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import { Variable } from "../../src/state/types";

const evaluateLine = (line: string) => {
  const node = parseLine(line, 1);
  const variableStore = new ReactiveVariableStore();
  const variableContext = new Map<string, Variable>();

  return defaultRegistry.evaluate(node, {
    variableStore,
    variableContext,
    lineNumber: 1,
    decimalPlaces: 6,
  });
};

describe("Unit suffix after numeric expressions", () => {
  beforeEach(() => {
    setupDefaultEvaluators();
  });

  test("3^2m => 9 m", () => {
    const result = evaluateLine("3^2m =>");
    expect(result?.type).toBe("mathResult");
    if (result?.type === "mathResult") {
      expect(result.result).toBe("9 m");
    }
  });

  test("3m => 3 m", () => {
    const result = evaluateLine("3m =>");
    expect(result?.type).toBe("mathResult");
    if (result?.type === "mathResult") {
      expect(result.result).toBe("3 m");
    }
  });

  test("3+2m => 5 m", () => {
    const result = evaluateLine("3+2m =>");
    expect(result?.type).toBe("mathResult");
    if (result?.type === "mathResult") {
      expect(result.result).toBe("5 m");
    }
  });

  test("3*4m => 12 m", () => {
    const result = evaluateLine("3*4m =>");
    expect(result?.type).toBe("mathResult");
    if (result?.type === "mathResult") {
      expect(result.result).toBe("12 m");
    }
  });

  test("3^2*1km => 9 km", () => {
    const result = evaluateLine("3^2*1km =>");
    expect(result?.type).toBe("mathResult");
    if (result?.type === "mathResult") {
      expect(result.result).toBe("9 km");
    }
  });

  test("(3+2)m => 5 m", () => {
    const result = evaluateLine("(3+2)m =>");
    expect(result?.type).toBe("mathResult");
    if (result?.type === "mathResult") {
      expect(result.result).toBe("5 m");
    }
  });
});
