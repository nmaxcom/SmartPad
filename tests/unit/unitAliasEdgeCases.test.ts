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

const evaluateLine = (
  line: string,
  context: EvaluationContext,
  lineNumber: number
) => {
  const node = parseLine(line, lineNumber);
  context.lineNumber = lineNumber;
  const result = defaultRegistry.evaluate(node, context);
  recordEquationFromNode(node, context.equationStore ?? []);
  syncVariables(context);
  return result;
};

describe("Unit alias edge cases", () => {
  test("expands aliases used directly in unit positions", () => {
    const context = createContext();
    evaluateLine("workweek = 40 h", context, 1);

    const result = evaluateLine("2 workweek to h =>", context, 2);
    expect(result?.type).toBe("mathResult");
    expect((result as any).result).toMatch(/80\s*h/);
  });

  test("converts into a user-defined alias target", () => {
    const context = createContext();
    evaluateLine("workweek = 40 h", context, 1);
    evaluateLine("hours = 80 h", context, 2);

    const result = evaluateLine("hours in workweek =>", context, 3);
    expect(result?.type).toBe("mathResult");
    expect((result as any).result).toMatch(/2(\.0+)?\s*workweek/);
  });

  test("supports alias chaining (alias-of-alias)", () => {
    const context = createContext();
    evaluateLine("workday = 8 h", context, 1);
    evaluateLine("workweek = 5 workday", context, 2);

    const result = evaluateLine("1 workweek to h =>", context, 3);
    expect(result?.type).toBe("mathResult");
    expect((result as any).result).toMatch(/40\s*h/);
  });

  test("plural alias forms resolve to the singular alias", () => {
    const context = createContext();
    evaluateLine("bundle = 12 m", context, 1);

    const result = evaluateLine("2 bundles to m =>", context, 2);
    expect(result?.type).toBe("mathResult");
    expect((result as any).result).toMatch(/24\s*m/);
  });

  test("scaled aliases behave like units", () => {
    const context = createContext();
    evaluateLine("ksec = 1000 s", context, 1);

    const result = evaluateLine("30 s in ksec =>", context, 2);
    expect(result?.type).toBe("mathResult");
    expect((result as any).result).toMatch(/0\.03\s*ksec/);

    const back = evaluateLine("1 ksec to s =>", context, 3);
    expect(back?.type).toBe("mathResult");
    expect((back as any).result).toMatch(/1000\s*s/);
  });

  test("numeric-only aliases do not block count-based units", () => {
    const context = createContext();
    evaluateLine("dozen = 12", context, 1);

    const result = evaluateLine("3 dozen =>", context, 2);
    expect(result?.type).toBe("mathResult");
    if (result?.type === "mathResult") {
      expect((result as any).result).toMatch(/3\s*dozens?/);
    }
  });

  test("supports scaled conversion targets with numeric factors", () => {
    const context = createContext();
    evaluateLine("speed = 6 m/s", context, 1);

    const result = evaluateLine("speed to m/(1000 s) =>", context, 2);
    expect(result?.type).toBe("mathResult");
    expect((result as any).result).toMatch(/6000/);
    expect((result as any).result).toMatch(/m\/\(1000 s\)/);
  });
});

describe("Unit prefix equivalence", () => {
  test("treats 0.75kW and 750W as the same power", () => {
    const context = createContext();

    const compact = evaluateLine("0.75kW to W =>", context, 1);
    expect(compact?.type).toBe("mathResult");
    expect((compact as any).result).toMatch(/750\s*W/);

    const expanded = evaluateLine("750W to W =>", context, 2);
    expect(expanded?.type).toBe("mathResult");
    expect((expanded as any).result).toMatch(/750\s*W/);
  });
});
