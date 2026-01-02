/**
 * Currency Expression Evaluator Tests
 *
 * Ensures chained arithmetic preserves currency semantics.
 */

import { parseContent, parseLine } from "../../src/parsing/astParser";
import { CombinedAssignmentEvaluatorV2 } from "../../src/eval/combinedAssignmentEvaluatorV2";
import { ExpressionEvaluatorV2 } from "../../src/eval/expressionEvaluatorV2";
import { VariableEvaluatorV2 } from "../../src/eval/variableEvaluatorV2";
import { defaultRegistry, setupDefaultEvaluators } from "../../src/eval";
import { ReactiveVariableStore } from "../../src/state/variableStore";
import { CurrencyValue, NumberValue } from "../../src/types";
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

  test("combined assignment preserves currency from trailing symbols", () => {
    const variableStore = new ReactiveVariableStore();
    variableStore.setVariable("pc", "13$");
    variableStore.setVariable("fr", "14");

    const pcVar = variableStore.getVariable("pc");
    const frVar = variableStore.getVariable("fr");
    if (!pcVar || !frVar) {
      throw new Error("Failed to seed variable context for currency test");
    }

    const variableContext = new Map<string, Variable>([
      ["pc", pcVar],
      ["fr", frVar],
    ]);

    const astNode = parseLine("subt = pc * fr =>", 1);
    const evaluator = new CombinedAssignmentEvaluatorV2();
    const result = evaluator.evaluate(astNode, {
      variableStore,
      variableContext,
      lineNumber: 1,
      decimalPlaces: 6,
    });

    expect(result?.type).toBe("combined");
    if (result?.type === "combined") {
      expect(result.result).toBe("$182");
    }

    const stored = variableStore.getVariable("subt");
    expect(stored?.value.toString()).toBe("$182");
  });

  test("variable assignment preserves currency for arithmetic without =>", () => {
    const now = new Date();
    const variableStore = new ReactiveVariableStore();
    const variableContext = new Map<string, Variable>([
      [
        "HrsPerMonth",
        {
          name: "HrsPerMonth",
          value: NumberValue.from(160),
          rawValue: "160",
          createdAt: now,
          updatedAt: now,
        },
      ],
      [
        "RatePerHour",
        {
          name: "RatePerHour",
          value: new CurrencyValue("$", 4),
          rawValue: "$4",
          createdAt: now,
          updatedAt: now,
        },
      ],
    ]);

    const astNode = parseLine("Cost = HrsPerMonth * RatePerHour", 1);
    const evaluator = new VariableEvaluatorV2();
    const result = evaluator.evaluate(astNode, {
      variableStore,
      variableContext,
      lineNumber: 1,
      decimalPlaces: 6,
    });

    expect(result?.type).toBe("variable");
    const stored = variableStore.getVariable("Cost");
    expect(stored?.value.toString()).toBe("$640");
  });

  test("AST pipeline preserves currency across assignment and combined evaluation", () => {
    setupDefaultEvaluators();
    const reactiveStore = new ReactiveVariableStore();
    const lines = [
      "HrsPerMonth = 160",
      "RatePerHour = $4",
      "Cost = HrsPerMonth * RatePerHour",
      "Total = Cost + Cost * 0.05 =>",
    ];

    let lastResult: any = null;

    lines.forEach((line, index) => {
      const nodes = parseContent(line);
      const node = nodes[0];
      const variableContext = new Map<string, Variable>();
      reactiveStore.getAllVariables().forEach((variable) => {
        variableContext.set(variable.name, variable);
      });

      const result = defaultRegistry.evaluate(node, {
        variableStore: reactiveStore,
        variableContext,
        lineNumber: index + 1,
        decimalPlaces: 6,
      });

      if (result) {
        lastResult = result;
      }
    });

    expect(lastResult?.type).toBe("combined");
    if (lastResult?.type === "combined") {
      expect(lastResult.result).toBe("$672");
    }

    const stored = reactiveStore.getVariable("Total");
    expect(stored?.value.toString()).toBe("$672");
  });

  test("percent literal matches decimal literal for currency math", () => {
    setupDefaultEvaluators();
    const reactiveStore = new ReactiveVariableStore();
    const lines = [
      "HrsPerMonth = 160",
      "RatePerHour = $4",
      "Cost = HrsPerMonth * RatePerHour",
      "TotalA = Cost + Cost * 0.05 =>",
      "TotalB = Cost + Cost * 5% =>",
    ];

    const results: Record<string, string> = {};

    lines.forEach((line, index) => {
      const nodes = parseContent(line);
      const node = nodes[0];
      const variableContext = new Map<string, Variable>();
      reactiveStore.getAllVariables().forEach((variable) => {
        variableContext.set(variable.name, variable);
      });

      const result = defaultRegistry.evaluate(node, {
        variableStore: reactiveStore,
        variableContext,
        lineNumber: index + 1,
        decimalPlaces: 6,
      });

      if (result && "variableName" in result && "result" in result) {
        results[result.variableName] = String(result.result);
      }
    });

    expect(results.TotalA).toBe("$672");
    expect(results.TotalB).toBe("$672");
  });

  test("currency rates can be assigned and reused", () => {
    setupDefaultEvaluators();
    const reactiveStore = new ReactiveVariableStore();
    const lines = [
      "price per m2 = $8 / m^2",
      "area = 3 m * 2.5 m",
      "total = area * price per m2 =>",
      "rate per m2 = $8 per m^2",
      "total2 = area * rate per m2 =>",
    ];

    const results: Record<string, string> = {};

    lines.forEach((line, index) => {
      const nodes = parseContent(line);
      const node = nodes[0];
      const variableContext = new Map<string, Variable>();
      reactiveStore.getAllVariables().forEach((variable) => {
        variableContext.set(variable.name, variable);
      });

      const result = defaultRegistry.evaluate(node, {
        variableStore: reactiveStore,
        variableContext,
        lineNumber: index + 1,
        decimalPlaces: 6,
      });

      if (result && "variableName" in result && "result" in result) {
        results[result.variableName] = String(result.result);
      }
    });

    expect(results.total).toBe("$60");
    expect(results.total2).toBe("$60");
  });

  test("unit rates without currency are parsed as units", () => {
    setupDefaultEvaluators();
    const reactiveStore = new ReactiveVariableStore();
    const lines = [
      "pp = 16 / m^2",
      "area = 3 m * 2.5 m",
      "total = area * pp =>",
    ];

    const results: Record<string, string> = {};

    lines.forEach((line, index) => {
      const nodes = parseContent(line);
      const node = nodes[0];
      const variableContext = new Map<string, Variable>();
      reactiveStore.getAllVariables().forEach((variable) => {
        variableContext.set(variable.name, variable);
      });

      const result = defaultRegistry.evaluate(node, {
        variableStore: reactiveStore,
        variableContext,
        lineNumber: index + 1,
        decimalPlaces: 6,
      });

      if (result && "variableName" in result && "result" in result) {
        results[result.variableName] = String(result.result);
      }
    });

    expect(results.total).toBe("120");
  });
});
