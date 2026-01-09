import { defaultRegistry } from "../../src/eval";
import type { EvaluationContext } from "../../src/eval/registry";
import { parseLine } from "../../src/parsing/astParser";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import type { Variable } from "../../src/state/types";
import { recordEquationFromNode } from "../../src/solve/equationStore";
import { setListMaxLength } from "../../src/types/listConfig";

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

describe("Range-generated lists", () => {
  afterEach(() => {
    setListMaxLength(100);
  });

  test("basic inclusive range produces list", () => {
    const context = createContext();
    const result = evaluateLine("1..5 =>", context, 1);
    expect((result as any).result).toBe("1, 2, 3, 4, 5");
  });

  test("step ranges honor alignment and direction", () => {
    const context = createContext();
    const even = evaluateLine("0..10 step 2 =>", context, 1);
    expect((even as any).result).toBe("0, 2, 4, 6, 8, 10");
    const odd = evaluateLine("0..10 step 3 =>", context, 2);
    expect((odd as any).result).toBe("0, 3, 6, 9");
  });

  test("increasing, decreasing and single-element defaults", () => {
    const context = createContext();
    expect((evaluateLine("2..6 =>", context, 1) as any).result).toBe(
      "2, 3, 4, 5, 6"
    );
    expect((evaluateLine("6..2 =>", context, 2) as any).result).toBe(
      "6, 5, 4, 3, 2"
    );
    expect((evaluateLine("5..5 =>", context, 3) as any).result).toBe("5");
  });

  test("step validation errors", () => {
    const context = createContext();
    const zeroStep = evaluateLine("0..10 step 0 =>", context, 1);
    expect(zeroStep?.type).toBe("error");
    expect((zeroStep as any).displayText).toContain("step cannot be 0");

    const wrongSign = evaluateLine("0..10 step -2 =>", context, 2);
    expect((wrongSign as any).displayText).toContain(
      "step must be positive for an increasing range"
    );

    const reverseSign = evaluateLine("10..0 step 2 =>", context, 3);
    expect((reverseSign as any).displayText).toContain(
      "step must be negative for a decreasing range"
    );
  });

  test("integer validation errors", () => {
    const context = createContext();
    const fractional = evaluateLine("0.5..3 =>", context, 1);
    expect((fractional as any).displayText).toContain(
      "range endpoints must be integers (got 0.5)"
    );

    const fractionalStep = evaluateLine("1..5 step 0.5 =>", context, 2);
    expect((fractionalStep as any).displayText).toContain(
      "step must be an integer (got 0.5)"
    );
  });

  test("variable endpoints respect dimensional rules", () => {
    const context = createContext();
    evaluateLine("a = 1", context, 1);
    evaluateLine("b = 5", context, 2);
    expect((evaluateLine("a..b =>", context, 3) as any).result).toBe(
      "1, 2, 3, 4, 5"
    );

    evaluateLine("a = 1 m", context, 4);
    evaluateLine("b = 5 m", context, 5);
    const badUnits = evaluateLine("a..b =>", context, 6);
    expect((badUnits as any).displayText).toContain(
      "range endpoints must be unitless integers"
    );
  });

  test("guardrail rejects enormous ranges", () => {
    const context = createContext();
    const result = evaluateLine("1..100000 =>", context, 1);
    expect(result?.type).toBe("error");
    expect((result as any).displayText).toContain(
      "range too large (100000 elements; max 10000)"
    );
  });

  test("range values compose with arithmetic and functions", () => {
    const context = createContext();
    const scaled = evaluateLine("(1..5) * 2 =>", context, 1);
    expect((scaled as any).result).toBe("2, 4, 6, 8, 10");

    const summed = evaluateLine("sum(1..5) =>", context, 2);
    expect((summed as any).result).toBe("15");
  });
});
