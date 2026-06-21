import { defaultRegistry } from "../../src/eval";
import type { EvaluationContext } from "../../src/eval/registry";
import { parseLine } from "../../src/parsing/astParser";
import { recordEquationFromNode } from "../../src/solve/equationStore";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import type { Variable } from "../../src/state/types";

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

describe("mixed currency arithmetic", () => {
  test("converts the left currency into the last typed currency for addition", () => {
    const context = createContext();
    evaluateLine("EUR = 1.10 USD", context, 1);

    const result = evaluateLine("€30 + $20 =>", context, 2);

    expect(result?.type).toBe("mathResult");
    expect((result as any).result).toBe("$53");
  });

  test("converts the left currency into the last typed currency for subtraction", () => {
    const context = createContext();
    evaluateLine("EUR = 1.10 USD", context, 1);

    const result = evaluateLine("€30 - $20 =>", context, 2);

    expect(result?.type).toBe("mathResult");
    expect((result as any).result).toBe("$13");
  });
});
