import { parseLine } from "../../src/parsing/astParser";
import { parseExpressionComponents } from "../../src/parsing/expressionComponents";
import { hasUnresolvedLiveIdentifiers } from "../../src/eval/liveResultPreview";
import { defaultRegistry } from "../../src/eval";
import type { EvaluationContext } from "../../src/eval/registry";
import type { Variable } from "../../src/state/types";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import { NumberValue, SemanticParsers } from "../../src/types";
import { sanitizeReferencePlaceholdersForDisplay } from "../../src/references/referenceIds";

const createContext = (variableContext: Map<string, Variable>): EvaluationContext => ({
  variableStore: new ReactiveVariableStore(),
  variableContext,
  lineNumber: 1,
  decimalPlaces: 2,
});

describe("result reference placeholders", () => {
  test("parses reference placeholders as resultReference components", () => {
    const components = parseExpressionComponents("__sp_ref_ab12cd__ * 0.15");
    expect(components[0]).toMatchObject({
      type: "resultReference",
      value: "__sp_ref_ab12cd__",
    });
  });

  test("parseLine preserves resultReference components in expression nodes", () => {
    const node = parseLine("__sp_ref_ab12cd__ + 1 =>", 1);
    expect(node.type).toBe("expression");
    if (node.type !== "expression") {
      throw new Error("Expected expression node");
    }
    expect(node.components.some((component) => component.type === "resultReference")).toBe(true);
  });

  test("unresolved detection includes resultReference placeholders", () => {
    const node = parseLine("__sp_ref_ab12cd__ + 1 =>", 1);
    expect(node.type).toBe("expression");
    if (node.type !== "expression") {
      throw new Error("Expected expression node");
    }

    const emptyContext = new Map<string, Variable>();
    expect(hasUnresolvedLiveIdentifiers(node.components, emptyContext)).toBe(true);

    const resolvedContext = new Map<string, Variable>([
      [
        "__sp_ref_ab12cd__",
        {
          name: "__sp_ref_ab12cd__",
          value: NumberValue.from(120),
          rawValue: "120",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);
    expect(hasUnresolvedLiveIdentifiers(node.components, resolvedContext)).toBe(false);
  });

  test("default registry resolves resultReference placeholders numerically", () => {
    const node = parseLine("__sp_ref_ab12cd__ / 2 =>", 1);
    expect(node.type).toBe("expression");
    if (node.type !== "expression") {
      throw new Error("Expected expression node");
    }

    const variableContext = new Map<string, Variable>([
      [
        "__sp_ref_ab12cd__",
        {
          name: "__sp_ref_ab12cd__",
          value: NumberValue.from(120),
          rawValue: "120",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);
    const result = defaultRegistry.evaluate(node, createContext(variableContext));
    expect(result?.type).toBe("mathResult");
    expect((result as any)?.result).toBe("60");
  });

  test("display sanitization strips internal placeholder ids", () => {
    expect(
      sanitizeReferencePlaceholdersForDisplay("__sp_ref_ab12cd__ * 0.15")
    ).toBe("result * 0.15");
    expect(
      sanitizeReferencePlaceholdersForDisplay(
        "__sp_ref_ab12cd__ + __sp_ref_ef34gh__"
      )
    ).toBe("result + result");
  });

  test("grouped thousands display values parse as numbers for reference propagation", () => {
    const parsed = SemanticParsers.parse("1,660");
    expect(parsed).toBeInstanceOf(NumberValue);
    expect((parsed as NumberValue).getNumericValue()).toBe(1660);
  });
});
