import { defaultRegistry } from "../../src/eval";
import type { EvaluationContext } from "../../src/eval/registry";
import { parseLine } from "../../src/parsing/astParser";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import type { Variable } from "../../src/state/types";
import { recordEquationFromNode } from "../../src/solve/equationStore";
import { ListValue } from "../../src/types";

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

describe("List & statistical helpers", () => {
  test("comma-separated assignment produces ListValue", () => {
    const context = createContext();
    evaluateLine("costs = $12, $15, $9", context, 1);
    const variable = context.variableContext.get("costs");
    expect(variable).toBeDefined();
    expect(variable?.value).toBeInstanceOf(ListValue);
    const list = variable?.value as ListValue;
    expect(list.getItems()).toHaveLength(3);
  });

  test("total of inline list", () => {
    const context = createContext();
    const result = evaluateLine("total(10, 20, 30) =>", context, 1);
    expect(result?.type).toBe("mathResult");
    expect((result as any).result).toBe("60");
  });

  test("phrase variable total plus shipping", () => {
    const context = createContext();
    evaluateLine("costs = $12, $15, $9", context, 1);
    const result = evaluateLine("total(costs) + $5 =>", context, 2);
    expect((result as any).result).toBe("$41");
  });

  test("single-item average behaves correctly", () => {
    const context = createContext();
    const result = evaluateLine("avg(50) =>", context, 1);
    expect((result as any).result).toBe("50");
  });

  test("mixed-unit sum normalizes to first unit", () => {
    const context = createContext();
    const result = evaluateLine("sum(10m, 100cm) =>", context, 1);
    expect((result as any).result).toBe("11 m");
  });

  test("empty argument average returns zero", () => {
    const context = createContext();
    const result = evaluateLine("mean() =>", context, 1);
    expect((result as any).result).toBe("0");
  });

  test("non-numeric noise ignored in total", () => {
    const context = createContext();
    const result = evaluateLine('total(10, "hello", 20) =>', context, 1);
    expect((result as any).result).toBe("30");
  });

  test("double list flattening", () => {
    const context = createContext();
    const result = evaluateLine("sum((10, 20), (30, 40)) =>", context, 1);
    expect((result as any).result).toBe("100");
  });

  test("phrase nesting works and retains units", () => {
    const context = createContext();
    evaluateLine("rent = 1200", context, 1);
    evaluateLine("utilities = 200", context, 2);
    evaluateLine("expenses = rent, utilities, 50", context, 3);
    const result = evaluateLine("sum(expenses) =>", context, 4);
    expect((result as any).result).toBe("1450");
  });

  test("solve supports unknowns inside lists", () => {
    const context = createContext();
    evaluateLine("goal = total(50, 20, x)", context, 1);
    evaluateLine("goal => 100", context, 2);
    const result = evaluateLine("x =>", context, 3);
    expect((result as any).result).toBe("30");
  });

  test("combined assignment list displays values", () => {
    const context = createContext();
    const result = evaluateLine("costs = $12, $15, $9 =>", context, 1);
    expect(result?.type).toBe("combined");
    expect((result as any).result).toBe("$12, $15, $9");
  });

  test("list variable renders stored values", () => {
    const context = createContext();
    evaluateLine("numbers = 3, 5, 4, 3, 2", context, 1);
    const result = evaluateLine("numbers =>", context, 2);
    expect(result?.type).toBe("mathResult");
    expect((result as any).result).toBe("3, 5, 4, 3, 2");
  });
});
