import { parseLine } from "../../src/parsing/astParser";
import "../../src/eval";
import { PlotViewEvaluator } from "../../src/eval/plotViewEvaluator";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import { EvaluationContext } from "../../src/eval/registry";
import { Variable } from "../../src/state/types";
import { CurrencyValue, ListValue, NumberValue, SemanticValue, UnitValue } from "../../src/types";
import { SmartPadQuantity } from "../../src/units/unitsnetAdapter";
import { FunctionDefinitionNode } from "../../src/parsing/ast";

const createVariable = (
  name: string,
  value: number | SemanticValue,
  rawValue?: string
): Variable => {
  const now = new Date();
  const semanticValue = typeof value === "number" ? NumberValue.from(value) : value;
  return {
    name,
    value: semanticValue,
    rawValue: rawValue ?? semanticValue.toString(),
    createdAt: now,
    updatedAt: now,
  };
};

const createNumberList = (values: number[]) =>
  ListValue.fromItems(values.map((value) => NumberValue.from(value)));

const createContext = (
  astNodes: ReturnType<typeof parseLine>[],
  variables: Map<string, Variable>,
  functionStore = new Map<string, FunctionDefinitionNode>()
): EvaluationContext => {
  const variableStore = new ReactiveVariableStore();
  variables.forEach((variable) => {
    variableStore.setVariableWithMetadata(variable);
  });
  return {
    variableStore,
    variableContext: variables,
    functionStore,
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

  test("anchors named y series to the source assignment when available", () => {
    const astNodes = [
      parseLine("distance = 120", 1),
      parseLine("time = 2", 2),
      parseLine("speed = distance / time =>", 3),
      parseLine("@view plot x=time y=speed domain=0..5", 4),
    ];
    const variables = new Map<string, Variable>([
      ["distance", createVariable("distance", 120)],
      ["time", createVariable("time", 2)],
      ["speed", createVariable("speed", 60, "distance / time")],
    ]);
    const evaluator = new PlotViewEvaluator();

    const result = evaluator.evaluate(astNodes[3], createContext(astNodes, variables));

    expect(result?.type).toBe("plotView");
    if (result?.type === "plotView") {
      expect(result.status).toBe("connected");
      expect(result.series?.[0]?.label).toBe("speed");
      expect(result.targetLine).toBe(3);
    }
  });

  test("plots named series backed by user-defined functions", () => {
    const functionNode = parseLine("area(r) = PI * r^2", 1);
    if (functionNode.type !== "functionDefinition") {
      throw new Error(`Expected functionDefinition, got ${functionNode.type}`);
    }
    const astNodes = [
      functionNode,
      parseLine("x = 30", 2),
      parseLine("arei = area(x)", 3),
      parseLine("@view plot x=x y=arei domain=0..30", 4),
    ];
    const variables = new Map<string, Variable>([
      ["x", createVariable("x", 30)],
      ["arei", createVariable("arei", 2827.433388, "area(x)")],
    ]);
    const functionStore = new Map<string, FunctionDefinitionNode>([["area", functionNode]]);
    const evaluator = new PlotViewEvaluator();

    const result = evaluator.evaluate(astNodes[3], createContext(astNodes, variables, functionStore));

    expect(result?.type).toBe("plotView");
    if (result?.type === "plotView") {
      expect(result.status).toBe("connected");
      expect(result.series?.[0]?.label).toBe("arei");
      expect(result.data?.length).toBeGreaterThan(2);
      const plottable = (result.data || []).filter((point) => point.y !== null);
      expect(plottable.length).toBeGreaterThan(2);
      expect(Math.max(...plottable.map((point) => point.y as number))).toBeGreaterThan(2500);
      expect(result.currentY).toBeCloseTo(Math.PI * 30 ** 2, 2);
    }
  });

  test("plots currency-backed FX helper functions over a numeric domain", () => {
    const astNodes = [
      parseLine("usd_total(month) = usd price * month", 1),
      parseLine("eur_total(month) = eur price * month", 2),
      parseLine("@view plot y=usd_total,eur_total domain=0..12 size=md", 3),
    ];
    const functionStore = new Map<string, FunctionDefinitionNode>([
      ["usd_total", astNodes[0] as FunctionDefinitionNode],
      ["eur_total", astNodes[1] as FunctionDefinitionNode],
    ]);
    const variables = new Map<string, Variable>([
      ["usd price", createVariable("usd price", CurrencyValue.fromString("$9.99"), "$9.99")],
      ["eur price", createVariable("eur price", CurrencyValue.fromString("8.33 EUR"), "usd price in EUR")],
    ]);
    const evaluator = new PlotViewEvaluator();

    const result = evaluator.evaluate(
      astNodes[2],
      createContext(astNodes, variables, functionStore)
    );

    expect(result?.type).toBe("plotView");
    if (result?.type === "plotView") {
      expect(result.status).toBe("connected");
      expect(result.series).toHaveLength(2);
      expect(result.series?.[0]?.label).toBe("usd_total(month)");
      expect(result.series?.[1]?.label).toBe("eur_total(month)");
      const usdData = result.series?.[0]?.data;
      const eurData = result.series?.[1]?.data;
      const usdLastY = usdData?.at(-1)?.y;
      const eurLastY = eurData?.at(-1)?.y;
      expect(usdLastY).toBeDefined();
      expect(eurLastY).toBeDefined();
      expect(usdLastY as number).toBeCloseTo(119.88, 2);
      expect(eurLastY as number).toBeCloseTo(99.96, 1);
    }
  });

  test("plots named function series with unit-valued inputs and outputs", () => {
    const functionNode = parseLine("area(r) = PI * r^2", 1);
    if (functionNode.type !== "functionDefinition") {
      throw new Error(`Expected functionDefinition, got ${functionNode.type}`);
    }
    const astNodes = [
      functionNode,
      parseLine("radius = 4 m", 2),
      parseLine("circle area = area(radius)", 3),
      parseLine("@view plot x=radius y=circle area size=md", 4),
    ];
    const variables = new Map<string, Variable>([
      [
        "radius",
        createVariable(
          "radius",
          new UnitValue(SmartPadQuantity.fromValueAndUnit(4, "m"))
        ),
      ],
    ]);
    const functionStore = new Map<string, FunctionDefinitionNode>([["area", functionNode]]);
    const evaluator = new PlotViewEvaluator();

    const result = evaluator.evaluate(astNodes[3], createContext(astNodes, variables, functionStore));

    expect(result?.type).toBe("plotView");
    if (result?.type === "plotView") {
      expect(result.status).toBe("connected");
      expect(result.series?.[0]?.label).toBe("circle area");
      const plottable = (result.data || []).filter((point) => point.y !== null);
      expect(plottable.length).toBeGreaterThan(2);
      expect(result.currentY).toBeCloseTo(Math.PI * 4 ** 2, 2);
    }
  });

  test("plots a one-argument function by name without requiring a document x variable", () => {
    const functionNode = parseLine("f(x) = 56*x + 7", 1);
    if (functionNode.type !== "functionDefinition") {
      throw new Error(`Expected functionDefinition, got ${functionNode.type}`);
    }
    const astNodes = [
      functionNode,
      parseLine("@view plot y=f domain=-2..2", 2),
    ];
    const functionStore = new Map<string, FunctionDefinitionNode>([["f", functionNode]]);
    const evaluator = new PlotViewEvaluator();

    const result = evaluator.evaluate(astNodes[1], createContext(astNodes, new Map(), functionStore));

    expect(result?.type).toBe("plotView");
    if (result?.type === "plotView") {
      expect(result.status).toBe("connected");
      expect(result.x).toBe("x");
      expect(result.expression).toBe("f(x)");
      expect(result.series?.[0]?.label).toBe("f(x)");
      expect(result.currentY).toBe(7);
      expect(result.data?.some((point) => point.x === 2 && point.y === 119)).toBe(true);
    }
  });

  test("plots a direct expression by inferring a virtual x variable", () => {
    const astNodes = [parseLine('@view plot y="x^3 + 4" domain=-2..2', 1)];
    const evaluator = new PlotViewEvaluator();

    const result = evaluator.evaluate(astNodes[0], createContext(astNodes, new Map()));

    expect(result?.type).toBe("plotView");
    if (result?.type === "plotView") {
      expect(result.status).toBe("connected");
      expect(result.x).toBe("x");
      expect(result.expression).toBe("x^3 + 4");
      expect(result.currentY).toBe(4);
      expect(result.data?.some((point) => point.x === 2 && point.y === 12)).toBe(true);
    }
  });

  test("plots function-backed assignments with a virtual x variable", () => {
    const functionNode = parseLine("f(x) = x^3 + 4", 1);
    if (functionNode.type !== "functionDefinition") {
      throw new Error(`Expected functionDefinition, got ${functionNode.type}`);
    }
    const astNodes = [
      functionNode,
      parseLine("ff = f(x)", 2),
      parseLine("@view plot x=x y=ff domain=-2..2", 3),
    ];
    const variables = new Map<string, Variable>([
      ["ff", createVariable("ff", 4, "f(x)")],
    ]);
    const functionStore = new Map<string, FunctionDefinitionNode>([["f", functionNode]]);
    const evaluator = new PlotViewEvaluator();

    const result = evaluator.evaluate(astNodes[2], createContext(astNodes, variables, functionStore));

    expect(result?.type).toBe("plotView");
    if (result?.type === "plotView") {
      expect(result.status).toBe("connected");
      expect(result.x).toBe("x");
      expect(result.currentY).toBe(4);
      expect(result.data?.some((point) => point.x === 2 && point.y === 12)).toBe(true);
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

  test("builds histogram data from a named numeric list", () => {
    const astNodes = [parseLine("@view hist y=waits size=md", 1)];
    const variables = new Map<string, Variable>([
      ["waits", createVariable("waits", createNumberList([3, 4, 4, 5, 8, 12]))],
    ]);
    const evaluator = new PlotViewEvaluator();

    const result = evaluator.evaluate(astNodes[0], createContext(astNodes, variables));

    expect(result?.type).toBe("plotView");
    if (result?.type === "plotView") {
      expect(result.status).toBe("connected");
      expect(result.kind).toBe("hist");
      expect(result.x).toBe("waits");
      expect(result.series?.[0]?.label).toBe("count");
      expect(result.data?.length).toBeGreaterThan(1);
      expect(result.data?.reduce((sum, point) => sum + (point.y || 0), 0)).toBe(6);
    }
  });

  test("builds a connected histogram for identical values", () => {
    const astNodes = [parseLine("@view hist y=waits size=sm", 1)];
    const variables = new Map<string, Variable>([
      ["waits", createVariable("waits", createNumberList([5, 5, 5, 5]))],
    ]);
    const evaluator = new PlotViewEvaluator();

    const result = evaluator.evaluate(astNodes[0], createContext(astNodes, variables));

    expect(result?.type).toBe("plotView");
    if (result?.type === "plotView") {
      expect(result.status).toBe("connected");
      expect(result.kind).toBe("hist");
      expect(result.data).toEqual([{ x: 5, y: 4 }]);
      expect(result.domain?.min).toBeLessThan(5);
      expect(result.domain?.max).toBeGreaterThan(5);
    }
  });

  test("disconnects histogram for scalar sources", () => {
    const astNodes = [parseLine("@view hist y=waits size=md", 1)];
    const variables = new Map<string, Variable>([["waits", createVariable("waits", 5)]]);
    const evaluator = new PlotViewEvaluator();

    const result = evaluator.evaluate(astNodes[0], createContext(astNodes, variables));

    expect(result?.type).toBe("plotView");
    if (result?.type === "plotView") {
      expect(result.status).toBe("disconnected");
      expect(result.message).toBe("Histogram needs a numeric list");
    }
  });

  test("builds scatter data from equal-length numeric lists", () => {
    const astNodes = [parseLine("@view scatter x=hours y=score size=md", 1)];
    const variables = new Map<string, Variable>([
      ["hours", createVariable("hours", createNumberList([2, 3, 4, 5]))],
      ["score", createVariable("score", createNumberList([58, 61, 68, 73]))],
    ]);
    const evaluator = new PlotViewEvaluator();

    const result = evaluator.evaluate(astNodes[0], createContext(astNodes, variables));

    expect(result?.type).toBe("plotView");
    if (result?.type === "plotView") {
      expect(result.status).toBe("connected");
      expect(result.kind).toBe("scatter");
      expect(result.x).toBe("hours");
      expect(result.series?.[0]?.label).toBe("score");
      expect(result.data).toEqual([
        { x: 2, y: 58 },
        { x: 3, y: 61 },
        { x: 4, y: 68 },
        { x: 5, y: 73 },
      ]);
    }
  });

  test("disconnects scatter when list lengths differ", () => {
    const astNodes = [parseLine("@view scatter x=hours y=score size=md", 1)];
    const variables = new Map<string, Variable>([
      ["hours", createVariable("hours", createNumberList([2, 3, 4]))],
      ["score", createVariable("score", createNumberList([58, 61, 68, 73]))],
    ]);
    const evaluator = new PlotViewEvaluator();

    const result = evaluator.evaluate(astNodes[0], createContext(astNodes, variables));

    expect(result?.type).toBe("plotView");
    if (result?.type === "plotView") {
      expect(result.status).toBe("disconnected");
      expect(result.message).toBe("Scatter lists must have the same length (3 vs 4)");
    }
  });

  test("disconnects scatter when x is not a list", () => {
    const astNodes = [parseLine("@view scatter x=hours y=score size=md", 1)];
    const variables = new Map<string, Variable>([
      ["hours", createVariable("hours", 2)],
      ["score", createVariable("score", createNumberList([58, 61, 68, 73]))],
    ]);
    const evaluator = new PlotViewEvaluator();

    const result = evaluator.evaluate(astNodes[0], createContext(astNodes, variables));

    expect(result?.type).toBe("plotView");
    if (result?.type === "plotView") {
      expect(result.status).toBe("disconnected");
      expect(result.message).toBe("Scatter needs numeric x and y lists");
    }
  });
});
