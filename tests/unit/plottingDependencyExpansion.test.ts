import { expandPlotExpressionDependencies } from "../../src/plotting/plottingUtils";
import { parseLine } from "../../src/parsing/astParser";
import { isExpressionNode } from "../../src/parsing/ast";
import { CurrencyValue, NumberValue } from "../../src/types";
import type { Variable } from "../../src/state/types";

const variable = (name: string, rawValue: string, value: Variable["value"]): Variable => ({
  name,
  rawValue,
  value,
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

describe("plot dependency expansion", () => {
  test("inlines derived formulas while leaving the interactive x variable live", () => {
    const node = parseLine("revenue - variable costs - fixed costs =>", 7);
    expect(isExpressionNode(node)).toBe(true);
    if (!isExpressionNode(node)) return;

    const variables = new Map<string, Variable>([
      ["customers", variable("customers", "100", new NumberValue(100))],
      ["price", variable("price", "50 EUR", new CurrencyValue("EUR", 50))],
      ["cost per customer", variable("cost per customer", "10 EUR", new CurrencyValue("EUR", 10))],
      ["fixed costs", variable("fixed costs", "1000 EUR", new CurrencyValue("EUR", 1000))],
      ["revenue", variable("revenue", "customers * price", new CurrencyValue("EUR", 5000))],
      [
        "variable costs",
        variable("variable costs", "customers * cost per customer", new CurrencyValue("EUR", 1000)),
      ],
    ]);

    const expanded = expandPlotExpressionDependencies(node, "price", variables);

    expect(expanded.expression).toContain("price");
    expect(expanded.expression).not.toContain("revenue");
    expect(expanded.expression).not.toContain("variable costs");
    expect(expanded.expression).toContain("1000 EUR");
  });

  test("stops safely at circular formula references", () => {
    const node = parseLine("a + price =>", 3);
    expect(isExpressionNode(node)).toBe(true);
    if (!isExpressionNode(node)) return;
    const variables = new Map<string, Variable>([
      ["a", variable("a", "b + 1", new NumberValue(2))],
      ["b", variable("b", "a + 1", new NumberValue(1))],
      ["price", variable("price", "10", new NumberValue(10))],
    ]);

    const expanded = expandPlotExpressionDependencies(node, "price", variables);
    expect(expanded.expression).toContain("price");
    expect(expanded.expression.length).toBeLessThan(100);
  });
});
