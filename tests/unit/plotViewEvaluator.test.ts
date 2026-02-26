import { parseLine } from "../../src/parsing/astParser";
import { PlotViewEvaluator } from "../../src/eval/plotViewEvaluator";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import { EvaluationContext } from "../../src/eval/registry";
import { Variable } from "../../src/state/types";
import { NumberValue } from "../../src/types";

const createVariable = (name: string, value: number): Variable => {
  const now = new Date();
  return {
    name,
    value: NumberValue.from(value),
    rawValue: String(value),
    createdAt: now,
    updatedAt: now,
  };
};

const createContext = (astNodes: ReturnType<typeof parseLine>[], variables: Map<string, Variable>): EvaluationContext => ({
  variableStore: new ReactiveVariableStore(),
  variableContext: variables,
  astNodes,
  lineNumber: astNodes.length,
  decimalPlaces: 6,
});

describe("PlotViewEvaluator", () => {
  test("supports unanchored @view with explicit y series", () => {
    const astNodes = [parseLine("@view plot x=x y=x^2 domain=0..5", 1)];
    const variables = new Map<string, Variable>([["x", createVariable("x", 2)]]);
    const evaluator = new PlotViewEvaluator();

    const result = evaluator.evaluate(astNodes[0], createContext(astNodes, variables));

    expect(result?.type).toBe("plotView");
    if (result?.type === "plotView") {
      expect(result.status).toBe("connected");
      expect(result.expression).toBe("x^2");
      expect(result.targetLine).toBeUndefined();
    }
  });

  test("falls back to nearest prior expression when y is omitted", () => {
    const astNodes = [
      parseLine("x = 2", 1),
      parseLine("x^2 =>", 2),
      parseLine("# note", 3),
      parseLine("@view plot x=x domain=0..5", 4),
    ];
    const variables = new Map<string, Variable>([["x", createVariable("x", 2)]]);
    const evaluator = new PlotViewEvaluator();

    const result = evaluator.evaluate(astNodes[3], createContext(astNodes, variables));

    expect(result?.type).toBe("plotView");
    if (result?.type === "plotView") {
      expect(result.status).toBe("connected");
      expect(result.expression).toBe("x^2");
      expect(result.targetLine).toBe(2);
    }
  });
});
