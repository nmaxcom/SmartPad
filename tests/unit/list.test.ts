import { defaultRegistry } from "../../src/eval";
import type { EvaluationContext } from "../../src/eval/registry";
import { parseLine } from "../../src/parsing/astParser";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import type { Variable } from "../../src/state/types";
import { recordEquationFromNode } from "../../src/solve/equationStore";
import { ListValue } from "../../src/types";
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

  test("range aggregator returns difference", () => {
    const context = createContext();
    evaluateLine("costs = $12, $15, $9", context, 1);
    const result = evaluateLine("range(costs) =>", context, 2);
    expect((result as any).result).toBe("$6");
  });

  test("count errors when single argument not a list", () => {
    const context = createContext();
    evaluateLine("single = $12", context, 1);
    const result = evaluateLine("count(single) =>", context, 2);
    expect(result?.type).toBe("error");
    expect((result as any).displayText).toContain("count() expects a list");
  });

  test("where filters list values", () => {
    const context = createContext();
    evaluateLine("costs = $12, $15, $9, $100", context, 1);
    const result = evaluateLine("costs where > $10 =>", context, 2);
    expect((result as any).result).toBe("$12, $15, $100");
  });

  test("sort orders values and supports desc option", () => {
    const context = createContext();
    evaluateLine("costs = $12, $15, $9", context, 1);
    const asc = evaluateLine("sort(costs) =>", context, 2);
    expect((asc as any).result).toBe("$9, $12, $15");
    const desc = evaluateLine("sort(costs, desc) =>", context, 3);
    expect((desc as any).result).toBe("$15, $12, $9");
  });

  test("list indexing supports 1-based and negative access", () => {
    const context = createContext();
    evaluateLine("costs = $12, $15, $9", context, 1);
    const first = evaluateLine("costs[1] =>", context, 2);
    expect((first as any).result).toBe("$12");
    const last = evaluateLine("costs[-1] =>", context, 3);
    expect((last as any).result).toBe("$9");
    const zero = evaluateLine("costs[0] =>", context, 4);
    expect(zero?.type).toBe("error");
    expect((zero as any).displayText).toContain("Indexing starts at 1");
    const overflow = evaluateLine("costs[4] =>", context, 5);
    expect(overflow?.type).toBe("error");
    expect((overflow as any).displayText).toContain("Index out of range (size 3)");
  });

  test("slicing honors inclusive ranges and clamps bounds", () => {
    const context = createContext();
    evaluateLine("costs = $12, $15, $9", context, 1);
    const slice = evaluateLine("costs[1..2] =>", context, 2);
    expect((slice as any).result).toBe("$12, $15");
    const empty = evaluateLine("costs[2..1] =>", context, 3);
    expect(empty?.type).toBe("error");
    expect((empty as any).displayText).toContain("Range can't go downwards");
    const clamp = evaluateLine("costs[1..10] =>", context, 4);
    expect((clamp as any).result).toBe("$12, $15, $9");
  });

  test("list limit is enforced", () => {
    setListMaxLength(3);
    const context = createContext();
    const result = evaluateLine("long = 1, 2, 3, 4 =>", context, 1);
    expect(result?.type).toBe("error");
    expect((result as any).displayText).toContain("Can't create lists longer than");
    setListMaxLength(100);
  });

  test("unit conversion works over lists", () => {
    const context = createContext();
    evaluateLine("lengths = 3 m, 25 m, 48 km", context, 1);
    const result = evaluateLine("lengths to m =>", context, 2);
    expect((result as any).result).toBe("3 m, 25 m, 48000 m");
  });

  test("percentage on/off applies element-wise", () => {
    const context = createContext();
    evaluateLine("tax = 8%", context, 1);
    evaluateLine("items = $10, $20, $30", context, 2);
    const result = evaluateLine("tax on items =>", context, 3);
    expect((result as any).result).toBe("$10.8, $21.6, $32.4");
  });

  test("where predicate fails for incompatible units", () => {
    const context = createContext();
    evaluateLine("vals = 3 m, 2 s", context, 1);
    const result = evaluateLine("vals where > 1 m =>", context, 2);
    expect(result?.type).toBe("error");
    expect((result as any).displayText).toContain("Cannot compare: incompatible units");
  });
});
