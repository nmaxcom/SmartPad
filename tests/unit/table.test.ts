import { defaultRegistry, type EvaluationContext } from "../../src/eval";
import { parseContent, parseLine } from "../../src/parsing/astParser";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import type { Variable } from "../../src/state/types";
import { ListValue, TableValue } from "../../src/types";

const createContext = (): EvaluationContext => ({
  variableStore: new ReactiveVariableStore(),
  variableContext: new Map<string, Variable>(),
  functionStore: new Map(),
  equationStore: [],
  astNodes: [],
  lineNumber: 1,
  decimalPlaces: 6,
});

const sync = (context: EvaluationContext) => {
  context.variableContext = new Map(
    context.variableStore.getAllVariables().map((variable) => [variable.name, variable])
  );
};

const evaluateDocument = (lines: string[]) => {
  const context = createContext();
  const nodes = parseContent(lines.join("\n"));
  context.astNodes = nodes;
  const results = nodes.map((node, index) => {
    context.lineNumber = index + 1;
    const result = defaultRegistry.evaluate(node, context);
    sync(context);
    return result;
  });
  return { context, nodes, results };
};

describe("SmartPad tables", () => {
  test("parses a canonical table as one document-level value", () => {
    const { context, nodes, results } = evaluateDocument([
      "Orders:",
      "  item | qty | price",
      "  A | 12 | 9 EUR",
      "  B | 5 | 14 EUR",
      "  C | 8 | 11 EUR",
    ]);

    expect(nodes.map((node) => node.type)).toEqual([
      "tableDeclaration",
      "tableRow",
      "tableRow",
      "tableRow",
      "tableRow",
    ]);
    expect((results[0] as any).result).toBe("3 rows × 3 columns");
    const table = context.variableContext.get("Orders")?.value;
    expect(table).toBeInstanceOf(TableValue);
    expect(context.variableContext.get("Orders.qty")?.value).toBeInstanceOf(ListValue);
    expect(context.variableContext.get("Orders.price")?.value.toString()).toBe(
      "9 EUR, 14 EUR, 11 EUR"
    );
  });

  test("adds a derived column and reuses it in aggregates and row-wise expressions", () => {
    const { results, context } = evaluateDocument([
      "Orders:",
      "  item | qty | price",
      "  A | 12 | 9 EUR",
      "  B | 5 | 14 EUR",
      "  C | 8 | 11 EUR",
      "Orders.total = Orders.qty * Orders.price",
      "sum(Orders.total) =>",
      "Orders.total / Orders.qty =>",
      "count(Orders.item) =>",
      "stddev(Orders.qty) =>",
    ]);

    expect((results[5] as any).result).toBe("108 EUR, 70 EUR, 88 EUR");
    expect((results[6] as any).result).toBe("266 EUR");
    expect((results[7] as any).result).toBe("9 EUR, 14 EUR, 11 EUR");
    expect((results[8] as any).result).toBe("3");
    expect((results[9] as any).result).toBe("2.8674");
    const table = context.variableContext.get("Orders")?.value as TableValue;
    expect(table.getColumns().map((column) => column.name)).toEqual([
      "item",
      "qty",
      "price",
      "total",
    ]);
  });

  test("connects table columns directly to scatter plots", () => {
    const { results } = evaluateDocument([
      "Data:",
      "  x | y",
      "  1 | 3",
      "  2 | 7",
      "  3 | 8",
      "@view scatter x=Data.x y=Data.y",
    ]);
    expect(results[5]).toMatchObject({
      type: "plotView",
      status: "connected",
      data: [
        { x: 1, y: 3 },
        { x: 2, y: 7 },
        { x: 3, y: 8 },
      ],
    });
  });

  test("reports row-width and mixed-type mistakes at the table source", () => {
    const width = evaluateDocument([
      "Bad data:",
      "  name | value",
      "  A | 2",
      "  B | 3 | extra",
    ]);
    expect((width.results[0] as any).error).toContain("expected 2");
    expect((width.results[0] as any).error).toContain("line 4");

    const mixed = evaluateDocument([
      "Mixed:",
      "  item | value",
      "  A | 2",
      "  B | unknown",
    ]);
    expect((mixed.results[0] as any).error).toContain("mixes text with calculated values");
  });

  test("does not reinterpret ordinary dotted prose as a table expression", () => {
    const context = createContext();
    const node = parseLine("Version 1.2 is ready", 1);
    const result = defaultRegistry.evaluate(node, context);
    expect(node.type).toBe("plainText");
    expect(result?.type).toBe("text");
  });
});
