import { parseLine } from "../../src/parsing/astParser";
import { PlotViewEvaluator } from "../../src/eval/plotViewEvaluator";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import { EvaluationContext } from "../../src/eval/registry";
import { Variable } from "../../src/state/types";
import { NumberValue } from "../../src/types";

const createVariable = (name: string, value: number, rawValue?: string): Variable => {
  const now = new Date();
  return {
    name,
    value: NumberValue.from(value),
    rawValue: rawValue ?? String(value),
    createdAt: now,
    updatedAt: now,
  };
};

const createContext = (
  astNodes: ReturnType<typeof parseLine>[],
  variables: Map<string, Variable>
): EvaluationContext => {
  const variableStore = new ReactiveVariableStore();
  variables.forEach((variable) => {
    variableStore.setVariableWithMetadata(variable);
  });
  return {
    variableStore,
    variableContext: variables,
    astNodes,
    lineNumber: astNodes.length,
    decimalPlaces: 6,
  };
};

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

  test("resolves named y series through the variable raw expression", () => {
    const astNodes = [parseLine("@view plot x=time y=speed domain=0..5", 1)];
    const variables = new Map<string, Variable>([
      ["distance", createVariable("distance", 120)],
      ["time", createVariable("time", 2)],
      ["speed", createVariable("speed", 60, "distance / time")],
    ]);
    const evaluator = new PlotViewEvaluator();

    const result = evaluator.evaluate(astNodes[0], createContext(astNodes, variables));

    expect(result?.type).toBe("plotView");
    if (result?.type === "plotView") {
      expect(result.status).toBe("connected");
      expect(result.expression).toBe("distance / time");
      expect(result.series?.[0]?.label).toBe("speed");
      expect(result.series?.[0]?.expression).toBe("distance / time");
    }
  });

  test("named y series follows edited source formulas without changing the directive", () => {
    const astNodes = [parseLine("@view plot x=time y=speed domain=0..5", 1)];
    const variables = new Map<string, Variable>([
      ["distance", createVariable("distance", 120)],
      ["time", createVariable("time", 2)],
      ["speed", createVariable("speed", 30, "distance / (time * 2)")],
    ]);
    const evaluator = new PlotViewEvaluator();

    const result = evaluator.evaluate(astNodes[0], createContext(astNodes, variables));

    expect(result?.type).toBe("plotView");
    if (result?.type === "plotView") {
      expect(result.status).toBe("connected");
      expect(result.originalRaw).toBe("@view plot x=time y=speed domain=0..5");
      expect(result.expression).toBe("distance / (time * 2)");
      expect(result.series?.[0]?.label).toBe("speed");
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

  test("applies supported plot sizes from @view params", () => {
    const astNodes = [
      parseLine("x = 2", 1),
      parseLine("x^2 =>", 2),
      parseLine("@view plot x=x size=lg domain=0..5", 3),
    ];
    const variables = new Map<string, Variable>([["x", createVariable("x", 2)]]);
    const evaluator = new PlotViewEvaluator();

    const result = evaluator.evaluate(astNodes[2], createContext(astNodes, variables));

    expect(result?.type).toBe("plotView");
    if (result?.type === "plotView") {
      expect(result.status).toBe("connected");
      expect(result.size).toBe("lg");
    }
  });

  test("normalizes size with whitespace, case, and trailing punctuation", () => {
    const astNodes = [
      parseLine("x = 2", 1),
      parseLine("x^2 =>", 2),
      parseLine("@view plot x=x size = LG, domain=0..5", 3),
    ];
    const variables = new Map<string, Variable>([["x", createVariable("x", 2)]]);
    const evaluator = new PlotViewEvaluator();

    const result = evaluator.evaluate(astNodes[2], createContext(astNodes, variables));

    expect(result?.type).toBe("plotView");
    if (result?.type === "plotView") {
      expect(result.status).toBe("connected");
      expect(result.size).toBe("lg");
    }
  });

  test("normalizes kind token case", () => {
    const astNodes = [
      parseLine("x = 2", 1),
      parseLine("x^2 =>", 2),
      parseLine("@view PLOT x=x size=md domain=0..5", 3),
    ];
    const variables = new Map<string, Variable>([["x", createVariable("x", 2)]]);
    const evaluator = new PlotViewEvaluator();

    const result = evaluator.evaluate(astNodes[2], createContext(astNodes, variables));

    expect(result?.type).toBe("plotView");
    if (result?.type === "plotView") {
      expect(result.status).toBe("connected");
      expect(result.kind).toBe("plot");
      expect(result.size).toBe("md");
    }
  });

  test("supports xl size token", () => {
    const astNodes = [
      parseLine("x = 2", 1),
      parseLine("x^2 =>", 2),
      parseLine("@view plot x=x size=xl domain=0..5", 3),
    ];
    const variables = new Map<string, Variable>([["x", createVariable("x", 2)]]);
    const evaluator = new PlotViewEvaluator();

    const result = evaluator.evaluate(astNodes[2], createContext(astNodes, variables));

    expect(result?.type).toBe("plotView");
    if (result?.type === "plotView") {
      expect(result.status).toBe("connected");
      expect(result.size).toBe("xl");
    }
  });
});
