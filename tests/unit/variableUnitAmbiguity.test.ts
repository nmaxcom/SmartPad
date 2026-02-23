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

describe("Variable vs implicit-unit ambiguity", () => {
  test("deferred variable dependencies stay symbolic until resolved", () => {
    const context = createContext();
    evaluateLine("x = 2*y", context, 1);

    const before = evaluateLine("x=>", context, 2);
    expect(before?.type).toBe("mathResult");
    expect((before as any).result).toContain("y");
    expect((before as any).result).not.toContain("year");

    evaluateLine("y = 3", context, 3);
    const after = evaluateLine("x=>", context, 4);
    expect(after?.type).toBe("mathResult");
    expect((after as any).result).toBe("6");
  });

  test("known compact unit literals still parse as units", () => {
    const context = createContext();
    evaluateLine("force = 2N", context, 1);
    const result = evaluateLine("force=>", context, 2);
    expect(result?.type).toBe("mathResult");
    expect((result as any).result).toContain("2 N");
  });
});
