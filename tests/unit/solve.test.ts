import { defaultRegistry } from "../../src/eval";
import type { EvaluationContext } from "../../src/eval/registry";
import { parseLine } from "../../src/parsing/astParser";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import type { Variable } from "../../src/state/types";
import { recordEquationFromNode } from "../../src/solve/equationStore";

const createContext = (): EvaluationContext => ({
  variableStore: new ReactiveVariableStore(),
  variableContext: new Map<string, Variable>(),
  functionStore: new Map(),
  equationStore: [],
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
  const result = defaultRegistry.evaluate(node, context);
  recordEquationFromNode(node, context.equationStore ?? []);
  syncVariables(context);
  return result;
};

describe("Solve evaluator", () => {
  test("returns existing variable values without solving", () => {
    const context = createContext();
    evaluateLine("speed = 10", context, 1);
    const result = evaluateLine("speed =>", context, 2);
    expect(result?.type).toBe("mathResult");
    expect((result as any).result).toBe("10");
  });

  test("implicit solve returns symbolic expression when data is missing", () => {
    const context = createContext();
    evaluateLine("distance = v * time", context, 1);
    const result = evaluateLine("v =>", context, 2);
    expect(result?.type).toBe("mathResult");
    expect((result as any).result).toBe("distance / time");
  });

  test("implicit solve returns numeric result when data is available", () => {
    const context = createContext();
    evaluateLine("distance = v * time", context, 1);
    evaluateLine("distance = 40 m", context, 2);
    evaluateLine("time = 2 s", context, 3);
    const result = evaluateLine("v =>", context, 4);
    expect(result?.type).toBe("mathResult");
    expect((result as any).result).toBe("20 m/s");
  });

  test("implicit solve uses the closest equation above", () => {
    const context = createContext();
    evaluateLine("distance = v * time", context, 1);
    evaluateLine("speed = v + 5", context, 2);
    const result = evaluateLine("v =>", context, 3);
    expect((result as any).result).toBe("speed - 5");
  });

  test("implicit solve ignores equations below", () => {
    const context = createContext();
    const result = evaluateLine("v =>", context, 1);
    expect(result?.type).toBe("error");
    expect((result as any).error).toContain("no equation found");
  });

  test("implicit solve handles parentheses and subtraction", () => {
    const context = createContext();
    evaluateLine("distance = (v + 2) * time", context, 1);
    const result = evaluateLine("v =>", context, 2);
    expect((result as any).result).toBe("distance / time - 2");
  });

  test("implicit solve handles subtracting constants", () => {
    const context = createContext();
    evaluateLine("distance = v * time - 10 m", context, 1);
    const result = evaluateLine("v =>", context, 2);
    expect((result as any).result).toBe("(distance + 10 m) / time");
  });

  test("implicit solve handles target in denominator", () => {
    const context = createContext();
    evaluateLine("frequency = 1 / period", context, 1);
    const result = evaluateLine("period =>", context, 2);
    expect((result as any).result).toBe("1 / frequency");
  });

  test("implicit solve uses sqrt for square roots", () => {
    const context = createContext();
    evaluateLine("area = PI * r^2", context, 1);
    const result = evaluateLine("r =>", context, 2);
    expect((result as any).result).toBe("sqrt(area / PI)");
  });

  test("implicit solve errors on non-numeric exponents", () => {
    const context = createContext();
    evaluateLine("value = r^time", context, 1);
    const result = evaluateLine("r =>", context, 2);
    expect(result?.type).toBe("error");
    expect((result as any).error).toContain("exponent must be numeric");
  });

  test("implicit solve errors when variable appears on both sides", () => {
    const context = createContext();
    evaluateLine("v = v + 1", context, 1);
    const result = evaluateLine("v =>", context, 2);
    expect(result?.type).toBe("error");
    expect((result as any).error).toContain("variable appears on both sides");
  });

  test("explicit solve returns expression when data is missing", () => {
    const context = createContext();
    const result = evaluateLine("solve v in distance = v * time =>", context, 1);
    expect(result?.type).toBe("mathResult");
    expect((result as any).result).toBe("distance / time");
  });

  test("explicit solve returns numeric result when data exists", () => {
    const context = createContext();
    evaluateLine("distance = 40 m", context, 1);
    evaluateLine("time = 2 s", context, 2);
    const result = evaluateLine("solve v in distance = v * time =>", context, 3);
    expect((result as any).result).toBe("20 m/s");
  });

  test("explicit solve uses inline assumptions", () => {
    const context = createContext();
    const result = evaluateLine(
      "solve v in distance = v * time, time = 2 s, distance = 40 m =>",
      context,
      1
    );
    expect((result as any).result).toBe("20 m/s");
  });

  test("explicit solve accepts where clauses", () => {
    const context = createContext();
    const result = evaluateLine("solve r in area = PI * r^2 where r > 0 =>", context, 1);
    expect((result as any).result).toBe("sqrt(area / PI)");
  });

  test("explicit solve errors when target is missing", () => {
    const context = createContext();
    const result = evaluateLine("solve v in distance = speed * time =>", context, 1);
    expect(result?.type).toBe("error");
    expect((result as any).error).toContain("no equation found");
  });

  test("explicit solve errors on malformed syntax", () => {
    const context = createContext();
    const result = evaluateLine("solve v distance = v * time =>", context, 1);
    expect(result?.type).toBe("error");
    expect((result as any).error).toContain("equation is not valid");
  });

  test("explicit solve errors on incomplete equations", () => {
    const context = createContext();
    const result = evaluateLine("solve v in distance =>", context, 1);
    expect(result?.type).toBe("error");
    expect((result as any).error).toContain("equation is not valid");
  });

  test("explicit solve errors when multiple equations contain target", () => {
    const context = createContext();
    const result = evaluateLine(
      "solve v in distance = v * time, speed = v + 5 =>",
      context,
      1
    );
    expect(result?.type).toBe("error");
    expect((result as any).error).toContain("multiple equations");
  });

  test("implicit solve supports phrase variables", () => {
    const context = createContext();
    evaluateLine("distance = average speed * time", context, 1);
    evaluateLine("distance = 100 m", context, 2);
    evaluateLine("time = 2 s", context, 3);
    const result = evaluateLine("average speed =>", context, 4);
    expect((result as any).result).toBe("50 m/s");
  });

  test("explicit solve errors on trailing commas", () => {
    const context = createContext();
    const result = evaluateLine("solve v in distance = v * time, =>", context, 1);
    expect(result?.type).toBe("error");
    expect((result as any).error).toContain("equation is not valid");
  });

  test("explicit solve errors on missing assignment values", () => {
    const context = createContext();
    const result = evaluateLine("solve v in distance = v * time, time = =>", context, 1);
    expect(result?.type).toBe("error");
    expect((result as any).error).toContain("equation is not valid");
  });
});
