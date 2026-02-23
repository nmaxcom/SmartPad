import { parseContent } from "../../src/parsing/astParser";
import { setupDefaultEvaluators, defaultRegistry, EvaluationContext } from "../../src/eval";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import { Variable } from "../../src/state/types";
import { NumberValue, CurrencyValue } from "../../src/types";
import type { RenderNode } from "../../src/eval/renderNodes";

type EvalOverrides = Partial<EvaluationContext>;

const evaluateExpression = (
  expression: string,
  overrides?: EvalOverrides
): RenderNode | null => {
  const variableStore = new ReactiveVariableStore();
  const context: EvaluationContext = {
    variableStore,
    variableContext: new Map<string, Variable>(),
    lineNumber: 1,
    decimalPlaces: 6,
    scientificUpperThreshold: 1e12,
    scientificLowerThreshold: 1e-4,
    groupThousands: false,
    ...overrides,
  };

  const nodes = parseContent(expression);
  const nonEmptyNodes = nodes.filter((node: any) => !(node.type === "plainText" && node.content === ""));
  if (nonEmptyNodes.length === 0) {
    return null;
  }

  return defaultRegistry.evaluate(nonEmptyNodes[0], context);
};

describe("Thousands grouping formatting", () => {
  beforeEach(() => {
    setupDefaultEvaluators();
  });

  test("NumberValue obeys groupThousands flag", () => {
    const raw = NumberValue.from(1234567.89);
    const defaultFormatted = raw.toString({ precision: 2 });
    const groupedFormatted = raw.toString({ precision: 2, groupThousands: true });

    expect(defaultFormatted).toBe("1234567.89");
    expect(groupedFormatted).toBe("1,234,567.89");
  });

  test("CurrencyValue obeys groupThousands flag", () => {
    const euros = new CurrencyValue("€", 30000);
    const defaultFormatted = euros.toString();
    const groupedFormatted = euros.toString({ groupThousands: true });

    expect(defaultFormatted).toBe("€30000");
    expect(groupedFormatted).toBe("€30,000");
  });

  test("Evaluation result strings update with grouping setting", () => {
    const defaultResult = evaluateExpression("1000000 =>");
    const groupedResult = evaluateExpression("1000000 =>", { groupThousands: true });

    expect(defaultResult?.type).toBe("mathResult");
    expect(groupedResult?.type).toBe("mathResult");

    if (defaultResult?.type === "mathResult") {
      expect(defaultResult.result).toBe("1000000");
    }
    if (groupedResult?.type === "mathResult") {
      expect(groupedResult.result).toBe("1,000,000");
    }
  });

  test("Re-evaluating the same AST node updates grouping", () => {
    const nodes = parseContent("999999 =>");
    const nonEmptyNodes = nodes.filter(
      (node: any) => !(node.type === "plainText" && node.content === "")
    );
    expect(nonEmptyNodes.length).toBeGreaterThan(0);
    const node = nonEmptyNodes[0];

    const context: EvaluationContext = {
      variableStore: new ReactiveVariableStore(),
      variableContext: new Map<string, Variable>(),
      lineNumber: 1,
      decimalPlaces: 6,
      scientificUpperThreshold: 1e12,
      scientificLowerThreshold: 1e-4,
      groupThousands: false,
    };

    const noGroup = defaultRegistry.evaluate(node, context);
    context.groupThousands = true;
    const grouped = defaultRegistry.evaluate(node, context);

    expect(noGroup?.type).toBe("mathResult");
    expect(grouped?.type).toBe("mathResult");
    if (noGroup?.type === "mathResult") {
      expect(noGroup.result).toBe("999999");
    }
    if (grouped?.type === "mathResult") {
      expect(grouped.result).toBe("999,999");
    }
  });

  test("Grouped numeric input in assignments shows explicit validation error", () => {
    const result = evaluateExpression("b=2,000=>");
    expect(result?.type).toBe("error");
    expect((result as any).displayText).toContain(
      "Thousands separators in input are not supported"
    );
  });
});
