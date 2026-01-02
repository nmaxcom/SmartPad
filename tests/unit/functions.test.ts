import { defaultRegistry } from "../../src/eval";
import type { EvaluationContext } from "../../src/eval/registry";
import { parseLine } from "../../src/parsing/astParser";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import type { Variable } from "../../src/state/types";

const createContext = (): EvaluationContext => ({
  variableStore: new ReactiveVariableStore(),
  variableContext: new Map<string, Variable>(),
  functionStore: new Map(),
  lineNumber: 1,
  decimalPlaces: 6,
});

const syncVariables = (context: EvaluationContext) => {
  context.variableContext.clear();
  context.variableStore.getAllVariables().forEach((variable) => {
    context.variableContext.set(variable.name, variable);
  });
};

const evaluateLine = (line: string, context: EvaluationContext, lineNumber: number) => {
  const node = parseLine(line, lineNumber);
  context.lineNumber = lineNumber;
  return defaultRegistry.evaluate(node, context);
};

describe("User-defined functions", () => {
  test("parses function definitions", () => {
    const node = parseLine("area(r) = PI * r^2", 1);
    if (node.type !== "functionDefinition") {
      throw new Error(`Expected functionDefinition, got ${node.type}`);
    }
    expect(node.functionName).toBe("area");
    expect(node.params).toHaveLength(1);
    expect(node.params[0].name).toBe("r");
    expect(node.expression).toBe("PI * r^2");
  });

  test("evaluates functions with defaults and named args", () => {
    const context = createContext();

    evaluateLine("tip(bill, rate=15%) = bill * rate", context, 1);
    const result = evaluateLine("tip(rate: 20%, bill: 50) =>", context, 2);

    expect(result?.type).toBe("mathResult");
    expect((result as any).result).toBe("10");
  });

  test("uses dynamic scope for external variables", () => {
    const context = createContext();

    evaluateLine("rate = 10%", context, 1);
    syncVariables(context);
    evaluateLine("tax(amount) = amount * rate", context, 2);

    const first = evaluateLine("tax(100) =>", context, 3);
    expect((first as any).result).toBe("10");

    evaluateLine("rate = 20%", context, 4);
    syncVariables(context);

    const second = evaluateLine("tax(100) =>", context, 5);
    expect((second as any).result).toBe("20");
  });

  test("returns helpful errors for missing arguments", () => {
    const context = createContext();
    evaluateLine("square(x) = x * x", context, 1);

    const result = evaluateLine("square() =>", context, 2);
    expect(result?.type).toBe("error");
    expect((result as any).error).toContain("Missing argument");
  });

  test("allows zero-argument functions", () => {
    const context = createContext();
    evaluateLine("magic() = 42", context, 1);

    const result = evaluateLine("magic() =>", context, 2);
    expect(result?.type).toBe("mathResult");
    expect((result as any).result).toBe("42");
  });

  test("defaults evaluate in the current scope", () => {
    const context = createContext();
    evaluateLine("rate = 25%", context, 1);
    syncVariables(context);
    evaluateLine("tax(amount, rate=rate) = amount * rate", context, 2);

    const result = evaluateLine("tax(200) =>", context, 3);
    expect((result as any).result).toBe("50");
  });

  test("named args report unknown arguments", () => {
    const context = createContext();
    evaluateLine("add(a, b) = a + b", context, 1);
    const result = evaluateLine("add(c: 1, a: 2) =>", context, 2);
    expect(result?.type).toBe("error");
    expect((result as any).error).toContain("Unknown argument");
  });

  test("functions accept unit arguments", () => {
    const context = createContext();
    evaluateLine("speed(distance, time) = distance / time", context, 1);

    const result = evaluateLine("speed(150 m, 12 s) =>", context, 2);
    expect(result?.type).toBe("mathResult");
    expect((result as any).result).toContain("m/s");
  });

  test("functions support currency rates for unit costs", () => {
    const context = createContext();
    evaluateLine("paint_area(width, height) = width * height", context, 1);
    evaluateLine(
      "paint_cost(width, height, price_per_m2) = paint_area(width, height) * price_per_m2",
      context,
      2
    );

    const compound = evaluateLine("paint_cost(3 m, 2.5 m, $8) =>", context, 3);
    expect(compound?.type).toBe("mathResult");
    expect((compound as any).result).toBe("$60*m^2");

    const perUnit = evaluateLine("paint_cost(3 m, 2.5 m, $8/m^2) =>", context, 4);
    expect((perUnit as any).result).toBe("$60");

    const perKeyword = evaluateLine("paint_cost(3 m, 2.5 m, $8 per m^2) =>", context, 5);
    expect((perKeyword as any).result).toBe("$60");

    const unitRate = evaluateLine("paint_cost(3 m, 2.5 m, 16/m^2) =>", context, 6);
    expect((unitRate as any).result).toBe("120");
  });
});
