/**
 * Currency Expression Evaluator Tests
 *
 * Ensures chained arithmetic preserves currency semantics.
 */

import { parseLine } from "../../src/parsing/astParser";
import { CombinedAssignmentEvaluatorV2 } from "../../src/eval/combinedAssignmentEvaluatorV2";
import { ExpressionEvaluatorV2 } from "../../src/eval/expressionEvaluatorV2";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import { CurrencyValue } from "../../src/types";
import { Variable } from "../../src/state/types";

describe("Currency Expression Evaluation", () => {
  const createCurrencyContext = () => {
    const now = new Date();
    const variableContext = new Map<string, Variable>([
      [
        "base plan",
        {
          name: "base plan",
          value: new CurrencyValue("$", 45),
          rawValue: "$45",
          createdAt: now,
          updatedAt: now,
        },
      ],
      [
        "line access",
        {
          name: "line access",
          value: new CurrencyValue("$", 10),
          rawValue: "$10",
          createdAt: now,
          updatedAt: now,
        },
      ],
      [
        "data overage fee",
        {
          name: "data overage fee",
          value: new CurrencyValue("$", 5),
          rawValue: "$5",
          createdAt: now,
          updatedAt: now,
        },
      ],
    ]);

    return {
      variableContext,
      variableStore: new ReactiveVariableStore(),
    };
  };

  test("combined assignment preserves currency for chained additions", () => {
    const { variableContext, variableStore } = createCurrencyContext();
    const astNode = parseLine("subtotal = base plan + line access + data overage fee =>", 1);

    const evaluator = new CombinedAssignmentEvaluatorV2();
    const result = evaluator.evaluate(astNode, {
      variableStore,
      variableContext,
      lineNumber: 1,
      decimalPlaces: 6,
    });

    expect(result?.type).toBe("combined");
    if (result?.type === "combined") {
      expect(result.result).toBe("$60");
    }

    const stored = variableStore.getVariable("subtotal");
    expect(stored?.value.toString()).toBe("$60");
  });

  test("expression evaluator preserves currency for chained additions", () => {
    const { variableContext, variableStore } = createCurrencyContext();
    const astNode = parseLine("base plan + line access + data overage fee =>", 1);

    const evaluator = new ExpressionEvaluatorV2();
    const result = evaluator.evaluate(astNode, {
      variableStore,
      variableContext,
      lineNumber: 1,
      decimalPlaces: 6,
    });

    expect(result?.type).toBe("mathResult");
    if (result?.type === "mathResult") {
      expect(result.result).toBe("$60");
    }
  });
});
