import { parseLine } from "../../src/parsing/astParser";
import { CombinedAssignmentEvaluatorV2 } from "../../src/eval/combinedAssignmentEvaluatorV2";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import { NumberValue, UnitValue } from "../../src/types";
import { Variable } from "../../src/state/types";

describe("CombinedAssignmentEvaluatorV2 substitutions", () => {
  const createContext = (variables: Array<[string, Variable]>) => {
    return {
      variableStore: new ReactiveVariableStore(),
      variableContext: new Map<string, Variable>(variables),
      lineNumber: 1,
      decimalPlaces: 6,
    };
  };

  test("substitutes known numeric values in symbolic results", () => {
    const now = new Date();
    const context = createContext([
      [
        "price",
        {
          name: "price",
          value: NumberValue.from(3),
          rawValue: "3",
          createdAt: now,
          updatedAt: now,
        },
      ],
    ]);

    const node = parseLine("total = price * qty =>", 1);
    const evaluator = new CombinedAssignmentEvaluatorV2();
    const result = evaluator.evaluate(node, context);

    expect(result?.type).toBe("combined");
    if (result?.type === "combined") {
      expect(result.result).toBe("3 * qty");
    }
  });

  test("substitutes values from the variable store when context is stale", () => {
    const context = createContext([]);
    context.variableStore.setVariableWithSemanticValue(
      "price",
      NumberValue.from(3),
      "3"
    );

    const node = parseLine("total = price * qty =>", 1);
    const evaluator = new CombinedAssignmentEvaluatorV2();
    const result = evaluator.evaluate(node, context);

    expect(result?.type).toBe("combined");
    if (result?.type === "combined") {
      expect(result.result).toBe("3 * qty");
    }
  });

  test("substitutes known unit values in symbolic results", () => {
    const now = new Date();
    const context = createContext([
      [
        "distance",
        {
          name: "distance",
          value: UnitValue.fromString("40 m"),
          rawValue: "40 m",
          createdAt: now,
          updatedAt: now,
        },
      ],
    ]);

    const node = parseLine("speed = distance / time =>", 1);
    const evaluator = new CombinedAssignmentEvaluatorV2();
    const result = evaluator.evaluate(node, context);

    expect(result?.type).toBe("combined");
    if (result?.type === "combined") {
      expect(result.result).toBe("40 m / time");
    }
  });

  test("treats undefined variables as symbolic in complex expressions", () => {
    const context = createContext([]);
    const node = parseLine("x = (((z+3)^2)+2)/4 =>", 1);
    const evaluator = new CombinedAssignmentEvaluatorV2();
    const result = evaluator.evaluate(node, context);

    expect(result?.type).toBe("combined");
    if (result?.type === "combined") {
      expect(result.result).toBe("(((z+3)^2)+2)/4");
    }
  });
});
