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

describe("Bug-hunt regression fixes", () => {
  test("reports explicit errors for malformed comma list literals", () => {
    const context = createContext();
    const first = evaluateLine("1,,2=>", context, 1);
    const second = evaluateLine("1, ,2=>", context, 2);

    expect(first?.type).toBe("error");
    expect((first as any).displayText).toContain("Cannot create list: empty value");
    expect(second?.type).toBe("error");
    expect((second as any).displayText).toContain("Cannot create list: empty value");
  });

  test("treats dangling to/in conversion keywords as hard errors", () => {
    const context = createContext();
    const toResult = evaluateLine("1,2 to =>", context, 1);
    const inResult = evaluateLine("1,2 in =>", context, 2);

    expect(toResult?.type).toBe("error");
    expect((toResult as any).displayText).toContain("Expected unit after 'to'");
    expect(inResult?.type).toBe("error");
    expect((inResult as any).displayText).toContain("Expected unit after 'in'");
  });

  test("rejects triple-dot range typos", () => {
    const context = createContext();
    const result = evaluateLine("1...5=>", context, 1);
    expect(result?.type).toBe("error");
    expect((result as any).displayText).toContain('Invalid range expression near "1...5"');
  });

  test("rejects malformed where comparators", () => {
    const context = createContext();
    evaluateLine("xs=1,2,3", context, 1);
    const result = evaluateLine("xs where >== 2=>", context, 2);
    expect(result?.type).toBe("error");
    expect((result as any).displayText).toContain("Unsupported where predicate");
  });

  test("requires list arguments for aggregators", () => {
    const context = createContext();
    const sumResult = evaluateLine("sum()=>", context, 1);
    const avgResult = evaluateLine("avg()=>", context, 2);

    expect(sumResult?.type).toBe("error");
    expect((sumResult as any).displayText).toContain("sum() expects a list");
    expect(avgResult?.type).toBe("error");
    expect((avgResult as any).displayText).toContain("avg() expects a list");
  });

  test("blocks zero-denominator scaled conversion targets", () => {
    const context = createContext();
    evaluateLine("speed=9m/s", context, 1);
    const result = evaluateLine("speed to m/(0 s)=>", context, 2);
    expect(result?.type).toBe("error");
    expect((result as any).displayText).toContain(
      "Invalid conversion target: denominator must be non-zero"
    );
  });

  test("surfaces divide-by-zero solve errors instead of symbolic output", () => {
    const context = createContext();
    evaluateLine("distance=v*time", context, 1);
    evaluateLine("distance=10m", context, 2);
    evaluateLine("time=0s", context, 3);
    const result = evaluateLine("v=>", context, 4);
    expect(result?.type).toBe("error");
    expect((result as any).displayText).toContain("Division by zero");
  });

  test("supports where filters nested inside list aggregators", () => {
    const context = createContext();
    evaluateLine("costs=10,20,30 to $", context, 1);
    const result = evaluateLine("sum(costs where > $15)=>", context, 2);
    expect(result?.type).toBe("mathResult");
    expect((result as any).result).toBe("$50");
  });

  test("supports percentage-on with nested aggregator base expressions", () => {
    const context = createContext();
    evaluateLine("costs=10,20,30 to $", context, 1);
    evaluateLine("tax=8%", context, 2);
    const result = evaluateLine("tax on sum(costs)=>", context, 3);
    expect(result?.type).toBe("mathResult");
    expect((result as any).result).toBe("$64.8");
  });

  test("supports conversion expressions inside nested function arguments", () => {
    const context = createContext();
    evaluateLine("r=2m,4m,6m", context, 1);
    evaluateLine("f(x)=x*2", context, 2);
    const result = evaluateLine("f(sum(r to cm))=>", context, 3);
    expect(result?.type).toBe("mathResult");
    expect((result as any).result).toContain("24");
  });

  test("normalizes invalid ISO date literals to user-facing parse errors", () => {
    const context = createContext();
    const result = evaluateLine("2024-02-30=>", context, 1);
    expect(result?.type).toBe("error");
    expect((result as any).displayText).toContain("Invalid date literal");
  });

  test("accepts positive compact duration steps and rejects negative temporal steps", () => {
    const context = createContext();
    const positive = evaluateLine("2026-01-01..2026-01-03 step 25h=>", context, 1);
    const negative = evaluateLine("2026-01-05..2026-01-01 step -1 day=>", context, 2);

    expect(positive?.type).toBe("mathResult");
    expect((positive as any).result).toContain("2026-01-01");
    expect(negative?.type).toBe("error");
    expect((negative as any).displayText).toContain(
      "Invalid range step: expected a positive duration"
    );
  });
});
