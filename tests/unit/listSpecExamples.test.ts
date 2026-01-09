import { defaultRegistry, setupDefaultEvaluators } from "../../src/eval";
import type { EvaluationContext } from "../../src/eval/registry";
import { parseLine } from "../../src/parsing/astParser";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import { recordEquationFromNode } from "../../src/solve/equationStore";
import type { RenderNode } from "../../src/eval/renderNodes";

const createContext = (): EvaluationContext => ({
  variableStore: new ReactiveVariableStore(),
  variableContext: new Map(),
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

const evaluateSequence = (lines: string[]) => {
  const context = createContext();
  const results: Array<RenderNode | null> = [];
  let lineNumber = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      results.push(null);
      continue;
    }
    lineNumber += 1;
    const node = parseLine(line, lineNumber);
    context.lineNumber = lineNumber;
    const result = defaultRegistry.evaluate(node, context);
    recordEquationFromNode(node, context.equationStore ?? []);
    syncVariables(context);
    results.push(result);
  }

  return {
    context,
    results,
    lastResult: results[results.length - 1] ?? null,
  };
};

const findMathResultByDisplay = (
  results: Array<RenderNode | null>,
  prefix: string
) =>
  results.find(
    (node) =>
      node?.type === "mathResult" &&
      typeof (node as any).displayText === "string" &&
      (node as any).displayText.includes(prefix)
  ) as RenderNode | undefined;

describe("List spec examples", () => {
  beforeAll(() => {
    setupDefaultEvaluators();
  });

  test("block 1: list slicing and count", () => {
    const { results } = evaluateSequence([
      "xs = 10, 20, 30",
      "ys = xs[2..2]",
      "ys =>20",
      "count(ys) => 1",
    ]);
    expect(results[2]?.type).toBe("mathResult");
    expect((results[2] as any).result).toBe("20");
    expect(results[3]?.type).toBe("mathResult");
    expect((results[3] as any).result).toBe("1");
  });

  test("block 2: count on scalar errors", () => {
    const { lastResult } = evaluateSequence(["x = 20", "count(x) => ⚠️ Expected list"]);
    expect(lastResult?.type).toBe("error");
    expect((lastResult as any).error).toContain("expects a list");
  });

  test("block 3: single value list errors", () => {
    const { results } = evaluateSequence([
      "one = $12",
      "one => $12",
      "",
      "single = one",
      "single => $12",
      "",
      "count(single) => ⚠️ count() expects a list, got a currency value",
      "sum(single) => ⚠️ sum() expects a list, got a currency value",
      "stddev(single) => ⚠️ sum() expects a list, got a currency value",
    ]);
    expect(results[1]?.type).toBe("mathResult");
    expect((results[1] as any).result).toBe("$12");
    expect(results[4]?.type).toBe("mathResult");
    expect((results[4] as any).result).toBe("$12");
    for (let idx = 6; idx <= 8; idx += 1) {
      expect(results[idx]?.type).toBe("error");
    }
  });

  test("block 4/5/6/7/8: list literals and derived expressions", () => {
    const { results } = evaluateSequence([
      "costs = $12, $15, $9",
      "costs => $12, $15, $9",
      "lengths = 3 m, 25 ft, 48 km",
      "lengths => 3 m, 25 ft, 48 km",
      "rates = 5%, 8%, 21%",
      "rates => 5%, 8%, 21%",
      "a = 10",
      "b = 20",
      "vals = a/2, b/4, (a+b)/10",
      "vals => 5, 5, 3",
      "rent = $1250",
      "utilities = $185",
      "internet = $75",
      "expenses = rent, utilities, internet",
      "expenses => $1250, $185, $75",
    ]);
    expect((results[1] as any).result).toBe("$12, $15, $9");
    expect((results[3] as any).result).toBe("3 m, 25 ft, 48 km");
    expect((results[5] as any).result).toBe("5%, 8%, 21%");
    expect((results[9] as any).result).toBe("5, 5, 3");
    expect((results[14] as any).result).toBe("$1250, $185, $75");
  });

  test("block 9/10/11/12: display & ambiguity", () => {
    const { results } = evaluateSequence([
      "xs = 1, 2, 3",
      "xs => 1, 2, 3",
      "rent = $1,250",
      "rent => ⚠️ Cannot create list: incompatible units",
      "xs = 1,250",
      "xs => 1,250",
      "xs = 1, 250",
      "xs => 1, 250",
    ]);
    expect((results[1] as any).result).toBe("1, 2, 3");
    expect(results[3]?.type).toBe("error");
    expect((results[5] as any).result).toBe("1,250");
    expect((results[7] as any).result).toBe("1, 250");
  });

  test("block 13: consistent unit display", () => {
    const { lastResult } = evaluateSequence(["lengths = 3 m, 25 m, 48 km", "lengths => 3 m, 25 m, 48 km"]);
    expect(lastResult?.type).toBe("mathResult");
    expect((lastResult as any).result).toBe("3 m, 25 m, 48 km");
  });

  test("blocks 14-22: aggregations", () => {
    const { results } = evaluateSequence([
      "costs = $12, $15, $9",
      "sum(costs) => $36",
      "count(costs) => 3",
      "mean(costs) => $12",
      "avg(costs) => $12",
      "min(costs) => $9",
      "max(costs) => $15",
      "xs = 1, 3, 10",
      "median(xs) => 3",
      "ys = 1, 3, 10, 11",
      "median(ys) => 6.5",
      "range(costs) => $6",
      "xs = 2, 4, 4, 4, 5, 5, 7, 9",
      "stddev(xs) => 2",
      "lengths = 3 m, 25 m, 48 km",
      "sum(lengths) => 48.028 km",
      "mean(lengths) => 16.0093 km",
    ]);
    expect((results[1] as any).result).toBe("$36");
    expect((results[2] as any).result).toBe("3");
    expect((results[3] as any).result).toBe("$12");
    expect((results[4] as any).result).toBe("$12");
    expect((results[5] as any).result).toBe("$9");
    expect((results[6] as any).result).toBe("$15");
    expect((results[8] as any).result).toBe("3");
    expect((results[10] as any).result).toBe("6.5");
    expect((results[11] as any).result).toBe("$6");
    expect((results[13] as any).result).toBe("2");
    expect((results[15] as any).result).toBe("48.028 km");
    expect((results[16] as any).result).toBe("16.0093 km");
  });

  test("blocks 23-28: indexing and slicing", () => {
    const { results } = evaluateSequence([
      "costs = $12, $15, $9",
      "costs[1] => $12",
      "costs[2] => $15",
      "costs[3] => $9",
      "costs[0] => ⚠️ Indexing starts at 1",
      "costs[4] => ⚠️ Index out of range (size 3)",
      "costs[-1] => $9",
      "costs[-2] => $15",
      "costs = $12, $15, $9, $20",
      "costs[1..2] => $12, $15",
      "costs[2..3] => $15, $9",
      "costs[3..3] => $9",
      "costs[1..10] => $12, $15, $9, $20",
      "costs[2..1] => ⚠️ Range can't go downwards",
    ]);
    expect((results[1] as any).result).toBe("$12");
    expect((results[2] as any).result).toBe("$15");
    expect((results[3] as any).result).toBe("$9");
    expect(results[4]?.type).toBe("error");
    expect(results[5]?.type).toBe("error");
    expect((results[6] as any).result).toBe("$9");
    expect((results[7] as any).result).toBe("$15");
    expect((results[9] as any).result).toBe("$12, $15");
    expect((results[10] as any).result).toBe("$15, $9");
    expect((results[11] as any).result).toBe("$9");
    expect((results[12] as any).result).toBe("$12, $15, $9, $20");
    expect(results[13]?.type).toBe("error");
  });

  test("blocks 29-32: sorting", () => {
    const { results } = evaluateSequence([
      "costs = $12, $15, $9",
      "sort(costs) => $9, $12, $15",
      "sort(costs, desc) => $15, $12, $9",
      "lengths = 3 m, 25 m, 48 km",
      "sort(lengths) => 3 m, 25 m, 48 km",
      "weird = 3 m, 2 s",
      "sort(weird) => ⚠️ Cannot sort: incompatible units",
    ]);
    expect((results[1] as any).result).toBe("$9, $12, $15");
    expect((results[2] as any).result).toBe("$15, $12, $9");
    expect((results[4] as any).result).toBe("3 m, 25 m, 48 km");
    expect(results[6]?.type).toBe("error");
  });

  test("sorting respects canonical magnitude and list dimensions", () => {
    const { results } = evaluateSequence([
      "lengths = 3 m, 5 ft, 48 km",
      "sort(lengths) => 5 ft, 3 m, 48 km",
      "times = 2 min, 30 s, 1 h",
      "sort(times) => 30 s, 2 min, 1 h",
    ]);
    const canonicalLengthSort = findMathResultByDisplay(results, "sort(lengths) => 5 ft");
    expect(canonicalLengthSort).toBeDefined();
    expect((canonicalLengthSort as any).result).toBe("5 ft, 3 m, 48 km");
    const timeSort = findMathResultByDisplay(results, "sort(times) => 30 s");
    expect(timeSort).toBeDefined();
    expect((timeSort as any).result).toBe("30 s, 2 min, 1 h");
  });

  test("list dimension mismatch is rejected", () => {
    const { lastResult } = evaluateSequence(["weird = 3 m, 2 h"]);
    expect(lastResult?.type).toBe("error");
    expect((lastResult as any).displayText).toContain("incompatible dimensions");
  });

  test("blocks 33-36: filtering", () => {
    const { results } = evaluateSequence([
      "costs = $12, $15, $9, $100",
      "costs where > $10 => $12, $15, $100",
      "lengths = 3 m, 25 m, 48 km",
      "lengths where > 10 km => 48 km",
      "costs where > $200 => ()",
      "vals = 3 m, 2 s",
      "vals where > 1 m => ⚠️ Cannot compare: incompatible units",
    ]);
    expect((results[1] as any).result).toBe("$12, $15, $100");
    expect((results[3] as any).result).toBe("48 km");
    expect((results[4] as any).result).toBe("()");
    expect(results[6]?.type).toBe("error");
  });

  test("where equality honors tolerance and duplicates", () => {
    const { results } = evaluateSequence([
      "xs = 0.1 + 0.2, 0.3",
      "xs where = 0.3 => 0.3, 0.3",
      "lengths = 1 m, 100 cm, 2 m",
      "lengths where = 1 m => 1 m, 100 cm",
      "costs = $8, $12, $15, $9, $8, $100",
      "costs where = $8 => $8, $8",
      "costs where = $123 => ()",
    ]);
    const toleranceResult = findMathResultByDisplay(results, "xs where = 0.3");
    expect((toleranceResult as any).result).toBe("0.3, 0.3");
    const lengthsEqual = findMathResultByDisplay(results, "lengths where = 1 m");
    expect((lengthsEqual as any).result).toBe("1 m, 100 cm");
    const repeatedCosts = findMathResultByDisplay(results, "costs where = $8");
    expect((repeatedCosts as any).result).toBe("$8, $8");
    const emptyCosts = findMathResultByDisplay(results, "costs where = $123");
    expect((emptyCosts as any).result).toBe("()");
  });

  test("blocks 37-41: mapping & scaling", () => {
    const { results } = evaluateSequence([
      "costs = $12, $15, $9",
      "costs * 2 => $24, $30, $18",
      "xs = -1, 4, -9",
      "abs(xs) => 1, 4, 9",
      "lengths = 3 m, 25 m, 48 km",
      "lengths to m => 3 m, 25 m, 48000 m",
      "rent = $1250",
      "utilities = $185",
      "internet = $75",
      "expenses = rent, utilities, internet",
      "total = sum(expenses) => $1510",
      "distribution = expenses / total as % => 82.7815%, 12.2517%, 4.9669%",
    ]);
    expect((results[1] as any).result).toBe("$24, $30, $18");
    expect((results[3] as any).result).toBe("1, 4, 9");
    expect((results[5] as any).result).toBe("3 m, 25 m, 48000 m");
    expect((results[10] as any).result).toBe("$1510");
    expect((results[11] as any).result).toBe("82.7815%, 12.2517%, 4.9669%");
  });

  test("blocks 42-46: tax, discounts, and pairwise operations", () => {
    const { results } = evaluateSequence([
      "items = $10, $20, $30",
      "tax = 8%",
      "with tax = tax on items => $10.8, $21.6, $32.4",
      "prices = $120, $80, $50",
      "discount = 15%",
      "final = discount off prices => $102, $68, $42.5",
      "prices = $10, $20, $30",
      "qty = 2, 1, 3",
      "line totals = prices * qty => $20, $20, $90",
      "sum(line totals) => $130",
      "a = 1, 2, 3",
      "b = 10, 20, 30",
      "a + b => 11, 22, 33",
      "a = 1, 2, 3",
      "b = 10, 20",
      "a + b => ⚠️ Cannot work with lists of different lengths (3 vs 2)",
      "a = 1, 2, 3",
      "a + 10 => 11, 12, 13",
    ]);
    expect((results[2] as any).result).toBe("$10.8, $21.6, $32.4");
    expect((results[5] as any).result).toBe("$102, $68, $42.5");
    expect((results[8] as any).result).toBe("$20, $20, $90");
    expect((results[9] as any).result).toBe("$130");
    expect((results[12] as any).result).toBe("11, 22, 33");
    const mismatchedIndex = results.findIndex(
      (node) =>
        node?.type === "error" &&
        typeof (node as any).displayText === "string" &&
        (node as any).displayText.includes("Cannot work with lists of different lengths")
    );
    expect(mismatchedIndex).toBeGreaterThanOrEqual(0);
    expect(results[mismatchedIndex]?.type).toBe("error");
    expect((results[17] as any).result).toBe("11, 12, 13");
  });

  test("blocks 47-48: incompatible sums", () => {
    const { results } = evaluateSequence([
      "mix = 3 m, 2 s",
      "sum(mix) => ⚠️ Cannot sum incompatible units",
      "mix money = $10, €10",
      "sum(mix money) => ⚠️ Cannot sum different currencies ($ vs €)",
    ]);
    expect(results[1]?.type).toBe("error");
    expect(results[3]?.type).toBe("error");
  });

  test("blocks 49-50-51: trailing commas and mini-recipes", () => {
    const { results } = evaluateSequence([
      "xs = 1, 2, 3,",
      "xs => 1, 2, 3",
      "rent = $1250",
      "utilities = $185",
      "internet = $75",
      "subscriptions = $49.99",
      "expenses = rent, utilities, internet, subscriptions",
      "sort(expenses, desc) => $1250, $185, $75, $49.99",
      "max(expenses) => $1250",
      "total = sum(expenses) => $1559.99",
      "expenses / total as % => 80.1287%, 11.8591%, 4.8077%, 3.2045%",
    ]);
    expect((results[1] as any).result).toBe("1, 2, 3");
    expect((results[7] as any).result).toBe("$1250, $185, $75, $49.99");
    expect((results[8] as any).result).toBe("$1250");
    expect((results[9] as any).result).toBe("$1559.99");
    expect((results[10] as any).result).toBe("80.1287%, 11.8591%, 4.8077%, 3.2045%");
  });

  test("blocks 52-53: measurement stats and volume", () => {
    const { results } = evaluateSequence([
      "measurements = 9.8 m/s^2, 9.7 m/s^2, 9.81 m/s^2, 9.79 m/s^2",
      "mean(measurements) => 9.775 m/s^2",
      "stddev(measurements) => 0.0430 m/s^2",
      "weights = 80 kg, 85 kg, 90 kg",
      "reps = 5, 5, 3",
      "volume = weights * reps => 400 kg, 425 kg, 270 kg",
      "sum(volume) => 1095 kg",
    ]);
    expect((results[1] as any).result).toBe("9.775 m/s^2");
    expect((results[2] as any).result).toBe("0.0439 m/s^2");
    expect((results[5] as any).result).toBe("400 kg, 425 kg, 270 kg");
    expect((results[6] as any).result).toBe("1095 kg");
  });
});
