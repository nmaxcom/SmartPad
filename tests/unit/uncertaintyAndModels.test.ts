import { defaultRegistry, type EvaluationContext } from "../../src/eval";
import { parseContent } from "../../src/parsing/astParser";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import type { Variable } from "../../src/state/types";
import { UNCERTAINTY_MODELS_TEMPLATE } from "../../src/templates/uncertaintyModelsTemplate";
import { UncertainValue } from "../../src/types";

const createContext = (): EvaluationContext => ({
  variableStore: new ReactiveVariableStore(),
  variableContext: new Map<string, Variable>(),
  functionStore: new Map(),
  modelStore: new Map(),
  equationStore: [],
  astNodes: [],
  lineNumber: 1,
  decimalPlaces: 6,
  plotSampleCount: 3,
  plotMinSamples: 3,
  plotMaxSamples: 3,
});

const evaluateDocument = (lines: string[]) => {
  const context = createContext();
  const nodes = parseContent(lines.join("\n"));
  context.astNodes = nodes;
  const results = nodes.map((node, index) => {
    context.lineNumber = index + 1;
    const result = defaultRegistry.evaluate(node, context);
    context.variableContext = new Map(
      context.variableStore
        .getAllVariables()
        .map((variable) => [variable.name, variable])
    );
    return result as any;
  });
  return { context, nodes, results };
};

describe("first-class uncertainty", () => {
  test("stores centre ± tolerance and propagates conservative typed bounds", () => {
    const { context, results } = evaluateDocument([
      "visits = 10000 ± 2000",
      "conversion = 3% ± 0.5%",
      "price = 49 EUR",
      "revenue = visits * conversion * price =>",
      "length = 10 m ± 1 m",
      "double length = length * 2 =>",
    ]);

    const visits = context.variableContext.get("visits")?.value;
    expect(visits).toBeInstanceOf(UncertainValue);
    expect(visits?.toString()).toBe("10000 ± 2000");
    expect(results[3].result).toBe("14700 EUR  [9800 EUR – 20580 EUR]");
    expect(results[5].result).toBe("20 m  [18 m – 22 m]");
  });

  test("maps safe functions and rejects invalid or unsafe intervals", () => {
    const { results } = evaluateDocument([
      "x = 100 ± 20",
      "root = sqrt(x) =>",
      "crosses zero = 1 ± 2",
      "ratio = 10 / crosses zero =>",
      "bad tolerance = 10 ± -2 =>",
      "oscillation = sin(x) =>",
    ]);

    expect(results[1].result).toBe("10  [8.944272 – 10.954451]");
    expect(results[3].error).toContain("containing zero");
    expect(results[4].error).toContain("zero or positive");
    expect(results[5].error).toContain("does not yet propagate");
  });

  test("exposes lower and upper samples for graph envelopes", () => {
    const { results } = evaluateDocument([
      "demand = 100 ± 10",
      "price = 2",
      "revenue = demand * price =>",
      "@view plot x=price y=revenue domain=1..3",
    ]);

    expect(results[3]).toMatchObject({
      type: "plotView",
      status: "connected",
      series: [
        {
          data: [
            { x: 1, y: 100, lower: 90, upper: 110 },
            { x: 2, y: 200, lower: 180, upper: 220 },
            { x: 3, y: 300, lower: 270, upper: 330 },
          ],
        },
      ],
    });
  });
});

describe("reusable model blocks", () => {
  test("evaluates sequential locals, defaults, named arguments, and unit-aware returns", () => {
    const { context, nodes, results } = evaluateDocument([
      "tax = 20%",
      "model Profit(revenue, costs, tax rate = tax):",
      "  gross = revenue - costs",
      "  tax cost = gross * tax rate",
      "  return gross - tax cost",
      "profit = Profit(12000 EUR, 8900 EUR) =>",
      "named = Profit(costs: 400 EUR, revenue: 1000 EUR, tax rate: 10%) =>",
    ]);

    expect(nodes.map((node) => node.type)).toEqual([
      "variableAssignment",
      "modelDefinition",
      "modelBody",
      "modelBody",
      "modelBody",
      "combinedAssignment",
      "combinedAssignment",
    ]);
    expect(results[5].result).toBe("2480 EUR");
    expect(results[6].result).toBe("540 EUR");
    expect(context.modelStore?.has("Profit")).toBe(true);
    expect(context.variableContext.has("gross")).toBe(false);
    expect(context.variableContext.has("tax cost")).toBe(false);
  });

  test("keeps uncertainty intact through a model call", () => {
    const { results } = evaluateDocument([
      "model Revenue(visits, conversion, price):",
      "  buyers = visits * conversion",
      "  return buyers * price",
      "visits = 10000 ± 2000",
      "conversion = 3% ± 0.5%",
      "price = 49 EUR",
      "forecast = Revenue(visits, conversion, price) =>",
    ]);

    expect(results[6].result).toBe("14700 EUR  [9800 EUR – 20580 EUR]");
    expect(results[6].semanticValue).toBeInstanceOf(UncertainValue);
  });

  test("reports malformed models and invalid calls at the source", () => {
    const missingReturn = parseContent(
      ["model Broken(x):", "  doubled = x * 2", "after = 3"].join("\n")
    );
    expect(missingReturn[0]).toMatchObject({
      type: "error",
      error: expect.stringContaining("final indented return"),
    });

    const duplicate = parseContent(
      ["model Broken(x, x):", "  return x"].join("\n")
    );
    expect(duplicate[0]).toMatchObject({
      type: "error",
      error: expect.stringContaining("Duplicate parameter"),
    });

    const { results } = evaluateDocument([
      "model One(x):",
      "  return x",
      "One(1, 2) =>",
      "One() =>",
      "One(1, x: 2) =>",
    ]);
    expect(results[2].error).toContain("expects at most 1 arguments");
    expect(results[3].error).toContain("Missing argument: x");
    expect(results[4].error).toContain("provided twice");
  });

  test("uses the latest callable definition when a function and model share a name", () => {
    const modelWins = evaluateDocument([
      "Double(x) = x * 2",
      "model Double(x):",
      "  return x * 3",
      "Double(4) =>",
    ]);
    expect(modelWins.results[3].result).toBe("12");

    const functionWins = evaluateDocument([
      "model Double(x):",
      "  return x * 3",
      "Double(x) = x * 2",
      "Double(4) =>",
    ]);
    expect(functionWins.results[3].result).toBe("8");
  });
});

describe("Uncertainty & Models discovery template", () => {
  test("evaluates every executable line without hiding a setup error", () => {
    const { context, results } = evaluateDocument(
      UNCERTAINTY_MODELS_TEMPLATE.split("\n")
    );
    const errors = results.filter((result) => result?.type === "error");
    const forecast = context.variableContext.get("forecast")?.value;
    const plot = results.find((result) => result?.type === "plotView");

    expect(errors).toEqual([]);
    expect(forecast?.toString()).toBe("14700 EUR  [9800 EUR – 20580 EUR]");
    expect(plot).toMatchObject({ status: "connected" });
    expect(plot.series[0].currentLower).toBeCloseTo(9800);
    expect(plot.series[0].currentUpper).toBeCloseTo(20580);
  });
});
