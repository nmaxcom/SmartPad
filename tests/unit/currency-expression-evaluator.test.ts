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
      "price per m = $8 per m",
      "length = 7.5 m",
      "total3 = length * price per m =>",
      "price per m2b = $8/m^2",
      "total4 = area * price per m2b =>",
      "rate per km = $2 per km",
      "distance = 12 km",
      "total5 = distance * rate per km =>",
      "rate per kg = $3 per kg",
      "mass = 4 kg",
      "total6 = mass * rate per kg =>",
      "rate per s = $0.5 per s",
      "time = 8 s",
      "total7 = time * rate per s =>",
      "rate per ft = $8/ft",
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
    expect(results.total3).toBe("$60");
    expect(results.total4).toBe("$60");
    expect(results.total5).toBe("$24");
    expect(results.total6).toBe("$12");
    expect(results.total7).toBe("$4");

    const conversionContext = new Map<string, Variable>();
    reactiveStore.getAllVariables().forEach((variable) => {
      conversionContext.set(variable.name, variable);
    });

    const toNode = parseLine("rate per ft to $/m =>", lines.length + 1);
    const toResult = defaultRegistry.evaluate(toNode, {
      variableStore: reactiveStore,
      variableContext: conversionContext,
      lineNumber: lines.length + 1,
      decimalPlaces: 6,
    });

    expect(toResult?.type).toBe("mathResult");
    expect((toResult as any).result).toContain("/m");
    expect((toResult as any).result).toContain("$26.246719");

    const inNode = parseLine("rate per ft in $/m =>", lines.length + 2);
    const inResult = defaultRegistry.evaluate(inNode, {
      variableStore: reactiveStore,
      variableContext: conversionContext,
      lineNumber: lines.length + 2,
      decimalPlaces: 6,
    });

    expect(inResult?.type).toBe("mathResult");
    expect((inResult as any).result).toContain("/m");
    expect((inResult as any).result).toContain("$26.246719");
  });

  test("unit rates without currency are parsed as units", () => {
    setupDefaultEvaluators();
    const reactiveStore = new ReactiveVariableStore();
    const lines = [
      "pp = 16 / m^2",
      "area = 3 m * 2.5 m",
      "total = area * pp =>",
      "freq = 2 per s",
      "duration = 7 s",
      "cycles = freq * duration =>",
      "density = 0.5 per kg",
      "mass = 8 kg",
      "unitless = density * mass =>",
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
    expect(results.cycles).toBe("14");
    expect(results.unitless).toBe("4");
  });

  test("currency rate converts when multiplied by other units", () => {
    setupDefaultEvaluators();
    const reactiveStore = new ReactiveVariableStore();
    const node = parseLine("4 m * $8/ft =>", 1);
    const variableContext = new Map<string, Variable>();

    const result = defaultRegistry.evaluate(node, {
      variableStore: reactiveStore,
      variableContext,
      lineNumber: 1,
      decimalPlaces: 6,
    });

    expect(result?.type).toBe("mathResult");
    expect((result as any).result).toContain("$104.986");
  });

  test("camelCase variables with currency and percent stay resolvable", () => {
    setupDefaultEvaluators();
    const reactiveStore = new ReactiveVariableStore();
    const lines = [
      "HrsPerMonth = 160",
      "RatePerHour = $4",
      "Cost = HrsPerMonth * RatePerHour",
      "Total = Cost + Cost * 17% =>",
      "HrsPerMonth =>",
    ];

    const results: Record<string, any> = {};

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

      if (result?.type === "variable") {
        results[result.variableName] = (result as any).value;
      } else if (result && "variableName" in result && "result" in result) {
        results[result.variableName] = result.result;
      }
      if (result && result.type === "mathResult") {
        results.math = result.result;
      }
    });

    expect(results.Cost).toBe("$640");
    expect(results.Total).toBe("$748.8");
    expect(results.math).toBe("160");
  });
});
