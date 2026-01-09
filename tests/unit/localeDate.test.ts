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

describe("Locale-aware date literals", () => {
  test("es-ES dates parse as ISO dates", () => {
    const context = createContext();
    context.dateLocale = "es-ES";
    const result = evaluateLine("d = 01-02-2023 =>", context, 1);
    expect(result?.type).toBe("mathResult");
    expect((result as any).result).toContain("2023-02-01");
  });

  test("invalid es-ES value reports literal error", () => {
    const context = createContext();
    context.dateLocale = "es-ES";
    const result = evaluateLine("d = 32-02-2023 =>", context, 1);
    expect(result?.type).toBe("error");
    expect((result as any).displayText).toContain('Invalid date literal "32-02-2023"');
  });

  test("range with es-ES dates still evaluates without solver errors", () => {
    const context = createContext();
    context.dateLocale = "es-ES";
    const result = evaluateLine(
      "slots = 01-02-2023 09:00..03-02-2023 09:00 step 1 day =>",
      context,
      1
    );
    expect(result?.type).toBe("mathResult");
    const display = (result as any).result as string;
    expect(display).toContain("2023-02-01");
    expect(display).not.toContain("Cannot solve");
  });
});
