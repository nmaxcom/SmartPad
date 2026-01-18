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

describe("Modulo operator", () => {
  test("evaluates mod in expressions", () => {
    const context = createContext();
    const result = evaluateLine("10 mod 3 =>", context, 1);
    expect(result?.type).toBe("mathResult");
    expect((result as any).result).toBe("1");
  });

  test("mod works inside parentheses", () => {
    const context = createContext();
    const result = evaluateLine("(44 mod 4) + 5 =>", context, 1);
    expect(result?.type).toBe("mathResult");
    expect((result as any).result).toBe("5");
  });

  test("mod works with variables", () => {
    const context = createContext();
    evaluateLine("modu = 39", context, 1);
    const result = evaluateLine("modu mod 4 =>", context, 2);
    expect(result?.type).toBe("mathResult");
    expect((result as any).result).toBe("3");
  });

  test("mod respects multiplication precedence", () => {
    const context = createContext();
    const result = evaluateLine("10 mod 3 * 2 =>", context, 1);
    expect(result?.type).toBe("mathResult");
    expect((result as any).result).toBe("2");
  });

  test("mod handles negative dividends", () => {
    const context = createContext();
    const result = evaluateLine("-10 mod 3 =>", context, 1);
    expect(result?.type).toBe("mathResult");
    expect((result as any).result).toBe("-1");
  });
});
