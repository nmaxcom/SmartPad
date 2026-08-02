import {
  computeSelectionInsightGroups,
  extractSelectionSemanticValues,
} from "../../src/analysis/selectionInsights";
import { buildSubstitutionLens } from "../../src/analysis/substitutionLens";
import type { Variable } from "../../src/state/types";
import {
  CurrencyValue,
  NumberValue,
  PercentageValue,
  UncertainValue,
} from "../../src/types";

const variable = (name: string, value: Variable["value"]): Variable => ({
  name,
  value,
  rawValue: value.toString(),
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

describe("selection insights", () => {
  test("extracts visible scalar values and computes insertable statistics", () => {
    const groups = computeSelectionInsightGroups(
      "first = 10\nsecond = 20\nthird = 5"
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      key: "number",
      count: 3,
      literals: ["10", "20", "5"],
    });
    expect(groups[0].sum.toString()).toBe("35");
    expect(groups[0].mean.toString()).toBe("11.666667");
    expect(groups[0].min.toString()).toBe("5");
    expect(groups[0].max.toString()).toBe("20");
  });

  test("groups compatible currencies and units without mixing them", () => {
    const groups = computeSelectionInsightGroups(
      "9 EUR | 14 EUR | 11 EUR\n2 m | 3 m\n$5 | $7"
    );

    expect(groups.map((group) => `${group.label}:${group.count}`)).toEqual(
      expect.arrayContaining(["EUR:3", "m:2", "$:2"])
    );
    const euros = groups.find((group) => group.label === "EUR");
    expect(euros?.sum.toString()).toBe("34 EUR");
    expect(extractSelectionSemanticValues("nothing numeric here")).toEqual([]);
    expect(extractSelectionSemanticValues("demand = 100 ± 10")).toEqual([]);
    expect(extractSelectionSemanticValues("Q1 item2 v1.2.3 2026-08-02")).toEqual([]);
  });
});

describe("caret substitution lens", () => {
  test("substitutes longest variable names while respecting identifier and quote boundaries", () => {
    const context = new Map<string, Variable>([
      ["price", variable("price", new CurrencyValue("EUR", 49))],
      ["conversion rate", variable("conversion rate", new PercentageValue(3))],
      ["x", variable("x", new NumberValue(4))],
    ]);

    const lens = buildSubstitutionLens(
      'price * conversion rate + max(x, 2) + "price"',
      new CurrencyValue("EUR", 50.47),
      context
    );

    expect(lens).toMatchObject({
      substitutedExpression: '49 EUR * 3% + max(4, 2) + "price"',
      result: "50.47 EUR",
      replacementCount: 3,
    });
    expect(buildSubstitutionLens("pixel + xray", "0", context)).toBeNull();
  });

  test("shows current uncertainty without mutating the expression", () => {
    const uncertain = UncertainValue.plusMinus(
      new NumberValue(100),
      new NumberValue(10)
    );
    const context = new Map<string, Variable>([["demand", variable("demand", uncertain)]]);
    const lens = buildSubstitutionLens("demand * 2", uncertain.multiply(new NumberValue(2)), context);

    expect(lens?.expression).toBe("demand * 2");
    expect(lens?.substitutedExpression).toBe("(100 ± 10) * 2");
    expect(lens?.result).toBe("200  [180 – 220]");
  });
});
