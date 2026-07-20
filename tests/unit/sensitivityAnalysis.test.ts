import {
  buildSensitivityInsight,
  calculateSensitivity,
  collectLeafSensitivityInputs,
  findSensitivityBreakEven,
  resolveSensitivityBarPercent,
} from "../../src/analysis/sensitivityAnalysis";

describe("sensitivity analysis", () => {
  test("ranks inputs by their maximum one-at-a-time output impact", () => {
    const coefficients: Record<string, number> = {
      price: 600,
      customers: 250,
      fixedCosts: -80,
    };
    const analysis = calculateSensitivity({
      baseline: { numericValue: 10000, displayValue: "10,000 EUR" },
      candidates: Object.keys(coefficients).map((name) => ({
        name,
        baseInput: 100,
      })),
      evaluate: (name, factor) => {
        const delta = coefficients[name] * (factor - 1) * 10;
        return {
          numericValue: 10000 + delta,
          displayValue: `${10000 + delta} EUR`,
        };
      },
    });

    expect(analysis.impacts.map((impact) => impact.name)).toEqual([
      "price",
      "customers",
      "fixedCosts",
    ]);
    expect(analysis.impacts[0]).toMatchObject({
      minusDelta: -600,
      plusDelta: 600,
      maxAbsDelta: 600,
      relativeImpactPercent: 6,
    });
  });

  test("keeps failed evaluations visible without corrupting the ranking", () => {
    const analysis = calculateSensitivity({
      baseline: { numericValue: 0, displayValue: "0" },
      candidates: [
        { name: "working", baseInput: 2 },
        { name: "broken", baseInput: 4 },
      ],
      evaluate: (name, factor) =>
        name === "broken"
          ? null
          : { numericValue: factor - 1, displayValue: String(factor - 1) },
    });

    expect(analysis.impacts).toHaveLength(1);
    expect(analysis.impacts[0].relativeImpactPercent).toBeNull();
    expect(analysis.failedInputs).toEqual(["broken"]);
  });

  test("expands derived variables to numeric leaf assumptions", () => {
    const dependencyMap = new Map([
      ["profit", ["revenue", "costs"]],
      ["revenue", ["customers", "price"]],
      ["costs", ["variable costs", "fixed costs"]],
      ["variable costs", ["customers", "cost per customer"]],
    ]);
    const numericVariables = new Set([
      "profit",
      "revenue",
      "costs",
      "customers",
      "price",
      "variable costs",
      "fixed costs",
      "cost per customer",
    ]);

    expect(
      collectLeafSensitivityInputs({
        targetDependencies: ["revenue", "costs"],
        dependencyMap,
        numericVariables,
        excludedVariables: new Set(["profit"]),
      }),
    ).toEqual(["customers", "price", "cost per customer", "fixed costs"]);
  });

  test("scales tornado bars against the largest observed delta", () => {
    expect(resolveSensitivityBarPercent(25, 100)).toBe(12.5);
    expect(resolveSensitivityBarPercent(-100, 100)).toBe(50);
    expect(resolveSensitivityBarPercent(10, 0)).toBe(0);
  });

  test("turns the strongest impact into a concise automatic insight", () => {
    const analysis = calculateSensitivity({
      baseline: { numericValue: 20, displayValue: "20 EUR" },
      candidates: [{ name: "price", baseInput: 10 }],
      evaluate: (_name, factor) => {
        const value = Math.round(20 + (factor - 1) * 100);
        return { numericValue: value, displayValue: `${value} EUR` };
      },
    });
    expect(buildSensitivityInsight(analysis, "profit")).toBe(
      "price is the strongest local driver: +10% raises profit to 30 EUR.",
    );
  });

  test("finds a deterministic break-even between sampled outputs", () => {
    expect(
      findSensitivityBreakEven({
        inputName: "customers",
        evaluate: (factor) => ({
          numericValue: factor * 100 - 50,
          displayValue: String(factor * 100 - 50),
        }),
      }),
    ).toEqual({ inputName: "customers", inputFactor: 0.5 });
  });
});
