import { parseContent } from "../../src/parsing/astParser";
import { setupDefaultEvaluators } from "../../src/eval";
import { defaultRegistry, EvaluationContext } from "../../src/eval/registry";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import { Variable } from "../../src/state/types";

type EvalOverrides = Partial<EvaluationContext>;

const evaluateExpression = (expression: string, overrides?: EvalOverrides) => {
  const variableStore = new ReactiveVariableStore();
  const context: EvaluationContext = {
    variableStore,
    variableContext: new Map<string, Variable>(),
    lineNumber: 1,
    decimalPlaces: 6,
    scientificUpperThreshold: 1e12,
    scientificLowerThreshold: 1e-4,
    ...overrides,
  };

  const nodes = parseContent(expression);
  const nonEmptyNodes = nodes.filter(
    (node: any) => !(node.type === "plainText" && node.content === "")
  );
  if (nonEmptyNodes.length === 0) return null;

  const node = nonEmptyNodes[0];
  const result = defaultRegistry.evaluate(node, context);

  // Sync variable context for completeness, even though these tests use one-line inputs.
  context.variableStore.getAllVariables().forEach((variable) => {
    context.variableContext.set(variable.name, variable);
  });

  return result;
};

describe("Scientific notation formatting", () => {
  beforeEach(() => {
    setupDefaultEvaluators();
  });

  test("small values use scientific notation below lower threshold even with 0 decimals", () => {
    const result = evaluateExpression("1e-3 =>", {
      decimalPlaces: 0,
      scientificLowerThreshold: 1e-2,
    });
    expect(result?.type).toBe("mathResult");
    if (result?.type === "mathResult") {
      expect(result.result).toMatch(/e-3/);
      expect(result.result).not.toBe("0");
    }
  });

  test("changing lower threshold updates formatting", () => {
    const scientific = evaluateExpression("1e-3 =>", {
      decimalPlaces: 6,
      scientificLowerThreshold: 1e-2,
    });
    const standard = evaluateExpression("1e-3 =>", {
      decimalPlaces: 6,
      scientificLowerThreshold: 1e-6,
    });
    expect(scientific?.type).toBe("mathResult");
    expect(standard?.type).toBe("mathResult");
    if (scientific?.type === "mathResult" && standard?.type === "mathResult") {
      expect(scientific.result).toMatch(/e-3/);
      expect(standard.result).toBe("0.001");
    }
  });

  test("changing upper threshold updates formatting", () => {
    const scientific = evaluateExpression("1e6 =>", {
      scientificUpperThreshold: 1e6,
    });
    const standard = evaluateExpression("1e6 =>", {
      scientificUpperThreshold: 1e9,
    });
    expect(scientific?.type).toBe("mathResult");
    expect(standard?.type).toBe("mathResult");
    if (scientific?.type === "mathResult" && standard?.type === "mathResult") {
      expect(scientific.result).toMatch(/e\+?6/);
      expect(standard.result).toBe("1000000");
    }
  });

  test("decimal places apply to non-scientific values", () => {
    const result = evaluateExpression("1.234567 =>", {
      decimalPlaces: 2,
      scientificLowerThreshold: 1e-8,
      scientificUpperThreshold: 1e8,
    });
    expect(result?.type).toBe("mathResult");
    if (result?.type === "mathResult") {
      expect(result.result).toBe("1.23");
    }
  });

  test("nonzero values never round down to zero when thresholds suppress scientific notation", () => {
    const result = evaluateExpression("1e-4 =>", {
      decimalPlaces: 0,
      scientificLowerThreshold: 1e-6,
    });
    expect(result?.type).toBe("mathResult");
    if (result?.type === "mathResult") {
      expect(result.result).toMatch(/e-4/);
    }
  });

  test("unit values use scientific notation below lower threshold", () => {
    const result = evaluateExpression("1e-6 J =>", {
      scientificLowerThreshold: 1e-4,
    });
    expect(result?.type).toBe("mathResult");
    if (result?.type === "mathResult") {
      expect(result.result).toMatch(/e-6\s*J$/);
    }
  });

  test("unit values refresh with lower threshold changes", () => {
    const scientific = evaluateExpression("1e-6 J =>", {
      scientificLowerThreshold: 1e-4,
    });
    const standard = evaluateExpression("1e-6 J =>", {
      scientificLowerThreshold: 1e-8,
    });
    expect(scientific?.type).toBe("mathResult");
    expect(standard?.type).toBe("mathResult");
    if (scientific?.type === "mathResult" && standard?.type === "mathResult") {
      expect(scientific.result).toMatch(/e-6/);
      expect(standard.result).toBe("0.000001 J");
    }
  });
});
