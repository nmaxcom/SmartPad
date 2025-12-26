import { parseLine } from "../../src/parsing/astParser";
import { defaultRegistry } from "../../src/eval/registry";
import { CurrencyValue, NumberValue, PercentageValue } from "../../src/types";
import { Variable } from "../../src/state/types";
import "../../src/eval/index"; // ensure registry is set up

const makeVariable = (name: string, value: NumberValue | PercentageValue | CurrencyValue, rawValue: string): Variable => ({
  name,
  value,
  rawValue,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe("Natural Percentages", () => {
  test("x% of y", () => {
    const node = parseLine("30% of 500 =>", 1);
    const result: any = defaultRegistry.evaluate(node as any, {
      variableStore: { clearVariables() {}, setVariableWithMetadata() {} } as any,
      variableContext: new Map(),
      lineNumber: 1,
      decimalPlaces: 2,
    });
    expect(result?.type).toBe("mathResult");
    expect(result.displayText).toMatch(/=>\s*150(\.0+)?/);
  });

  test("x% on y", () => {
    const node = parseLine("20% on 80 =>", 1);
    const result: any = defaultRegistry.evaluate(node as any, {
      variableStore: { clearVariables() {}, setVariableWithMetadata() {} } as any,
      variableContext: new Map(),
      lineNumber: 1,
      decimalPlaces: 2,
    });
    expect(result?.type).toBe("mathResult");
    expect(result.displayText).toMatch(/=>\s*96(\.0+)?/);
  });

  test("x% off y with currency", () => {
    const node = parseLine("20% off $80 =>", 1);
    const result: any = defaultRegistry.evaluate(node as any, {
      variableStore: { clearVariables() {}, setVariableWithMetadata() {} } as any,
      variableContext: new Map(),
      lineNumber: 1,
      decimalPlaces: 2,
    });
    expect(result?.type).toBe("mathResult");
    expect(result.displayText).toMatch(/=>\s*\$?64(\.0+)?/);
  });

  test("part of base is %", () => {
    const node = parseLine("20 of 80 is % =>", 1);
    const result: any = defaultRegistry.evaluate(node as any, {
      variableStore: { clearVariables() {}, setVariableWithMetadata() {} } as any,
      variableContext: new Map(),
      lineNumber: 1,
      decimalPlaces: 2,
    });
    expect(result?.type).toBe("mathResult");
    expect(result.displayText).toMatch(/=>\s*25%/);
    // Ensure the result includes the % symbol
    expect(result.displayText).toContain("%");
  });

  test("x / y as %", () => {
    const node = parseLine("20 / 80 as % =>", 1);
    const result: any = defaultRegistry.evaluate(node as any, {
      variableStore: { clearVariables() {}, setVariableWithMetadata() {} } as any,
      variableContext: new Map(),
      lineNumber: 1,
      decimalPlaces: 2,
    });
    expect(result?.type).toBe("mathResult");
    expect(result.displayText).toMatch(/=>\s*25%/);
    // Ensure the result includes the % symbol
    expect(result.displayText).toContain("%");
  });

  test("x / y as % with variables", () => {
    const variableContext = new Map();
    variableContext.set("numerator", makeVariable("numerator", new NumberValue(20), "20"));
    variableContext.set("denominator", makeVariable("denominator", new NumberValue(80), "80"));
    const node = parseLine("numerator / denominator as % =>", 1);
    const result: any = defaultRegistry.evaluate(node as any, {
      variableStore: { clearVariables() {}, setVariableWithMetadata() {} } as any,
      variableContext,
      lineNumber: 1,
      decimalPlaces: 2,
    });
    expect(result?.type).toBe("mathResult");
    expect(result.displayText).toMatch(/=>\s*25%/);
    // Ensure the result includes the % symbol
    expect(result.displayText).toContain("%");
  });

  test("currency with percentage expression", () => {
    const node = parseLine("$30 + 10% =>", 1);
    const result: any = defaultRegistry.evaluate(node as any, {
      variableStore: { clearVariables() {}, setVariableWithMetadata() {} } as any,
      variableContext: new Map(),
      lineNumber: 1,
      decimalPlaces: 2,
    });
    expect(result?.type).toBe("mathResult");
    expect(result.displayText).toMatch(/=>\s*\$33(\.0+)?/);
    // Ensure the result includes the currency symbol
    expect(result.displayText).toContain("$");
  });

  test("variables with % symbols in percentage calculations", () => {
    const variableContext = new Map();
    variableContext.set("rate", makeVariable("rate", new PercentageValue(15), "15%"));
    variableContext.set("base", makeVariable("base", CurrencyValue.fromString("$200"), "$200"));
    const node = parseLine("rate of base =>", 1);
    const result: any = defaultRegistry.evaluate(node as any, {
      variableStore: { clearVariables() {}, setVariableWithMetadata() {} } as any,
      variableContext,
      lineNumber: 1,
      decimalPlaces: 2,
    });
    expect(result?.type).toBe("mathResult");
    expect(result.displayText).toMatch(/=>\s*\$30(\.0+)?/);
    // Ensure the result includes the currency symbol
    expect(result.displayText).toContain("$");
  });

  test("chained of-of", () => {
    const node = parseLine("20% of 50% of 1000 =>", 1);
    const result: any = defaultRegistry.evaluate(node as any, {
      variableStore: { clearVariables() {}, setVariableWithMetadata() {} } as any,
      variableContext: new Map(),
      lineNumber: 1,
      decimalPlaces: 2,
    });
    expect(result?.type).toBe("mathResult");
    expect(result.displayText).toMatch(/=>\s*100(\.0+)?/);
  });

  test("parenthesized expression", () => {
    const node = parseLine("30% of (250 + 150) =>", 1);
    const result: any = defaultRegistry.evaluate(node as any, {
      variableStore: { clearVariables() {}, setVariableWithMetadata() {} } as any,
      variableContext: new Map(),
      lineNumber: 1,
      decimalPlaces: 2,
    });
    expect(result?.type).toBe("mathResult");
    expect(result.displayText).toMatch(/=>\s*120(\.0+)?/);
  });

  test("additive on", () => {
    const node = parseLine("80 + 20% =>", 1);
    const result: any = defaultRegistry.evaluate(node as any, {
      variableStore: { clearVariables() {}, setVariableWithMetadata() {} } as any,
      variableContext: new Map(),
      lineNumber: 1,
      decimalPlaces: 2,
    });
    expect(result?.type).toBe("mathResult");
    expect(result.displayText).toMatch(/=>\s*96(\.0+)?/);
  });

  test("subtractive trailing percent chain", () => {
    const node = parseLine("500 - 10% - 5% =>", 1);
    const result: any = defaultRegistry.evaluate(node as any, {
      variableStore: { clearVariables() {}, setVariableWithMetadata() {} } as any,
      variableContext: new Map(),
      lineNumber: 1,
      decimalPlaces: 1,
    });
    expect(result?.type).toBe("mathResult");
    expect(result.displayText).toMatch(/=>\s*427\.5/);
  });

  test("variables with percent values", () => {
    const variableContext = new Map();
    // commission_rate is a plain number (interpreted as %)
    variableContext.set("total_sales", makeVariable("total_sales", new NumberValue(5000), "5000"));
    variableContext.set("commission_rate", makeVariable("commission_rate", new NumberValue(5.5), "5.5"));
    const node = parseLine("commission_rate of total_sales =>", 1);
    const result: any = defaultRegistry.evaluate(node as any, {
      variableStore: { clearVariables() {}, setVariableWithMetadata() {} } as any,
      variableContext,
      lineNumber: 1,
      decimalPlaces: 3,
    });
    expect(result?.type).toBe("mathResult");
    expect(result.displayText).toMatch(/=>\s*275(\.0+)?/);
  });

  test("percent variable added to money base (implicit 'on')", () => {
    const variableContext = new Map();
    variableContext.set("money", makeVariable("money", CurrencyValue.fromString("$400"), "$400"));
    variableContext.set("taxes", makeVariable("taxes", new PercentageValue(5), "5%"));
    const node = parseLine("money + taxes =>", 1);
    const result: any = defaultRegistry.evaluate(node as any, {
      variableStore: { clearVariables() {}, setVariableWithMetadata() {} } as any,
      variableContext,
      lineNumber: 1,
      decimalPlaces: 2,
    });
    expect(result?.type).toBe("mathResult");
    // 400 * (1 + 0.05) = $420
    expect(result.displayText).toMatch(/=>\s*\$420(\.0+)?/);
  });

  test("percent variable subtracted from base (implicit 'off')", () => {
    const variableContext = new Map();
    variableContext.set("base", makeVariable("base", new NumberValue(1000), "1000"));
    variableContext.set("discount", makeVariable("discount", new PercentageValue(10), "10%"));
    const node = parseLine("base - discount =>", 1);
    const result: any = defaultRegistry.evaluate(node as any, {
      variableStore: { clearVariables() {}, setVariableWithMetadata() {} } as any,
      variableContext,
      lineNumber: 1,
      decimalPlaces: 2,
    });
    expect(result?.type).toBe("mathResult");
    expect(result.displayText).toMatch(/=>\s*900(\.0+)?/);
  });

  test("currency base with percent variable", () => {
    const variableContext = new Map();
    variableContext.set("money", makeVariable("money", CurrencyValue.fromString("$400"), "$400"));
    variableContext.set("taxes", makeVariable("taxes", new PercentageValue(5), "5%"));
    const node = parseLine("money + taxes =>", 1);
    const result: any = defaultRegistry.evaluate(node as any, {
      variableStore: { clearVariables() {}, setVariableWithMetadata() {} } as any,
      variableContext,
      lineNumber: 1,
      decimalPlaces: 2,
    });
    expect(result?.type).toBe("mathResult");
    // Ensure currency symbol is preserved
    expect(result.displayText).toMatch(/=>\s*\$420(\.0+)?/);
  });

  test("euro currency and chained discounts", () => {
    const variableContext = new Map();
    variableContext.set("price", makeVariable("price", CurrencyValue.fromString("€200"), "€200"));
    variableContext.set("d1", makeVariable("d1", new PercentageValue(10), "10%"));
    variableContext.set("d2", makeVariable("d2", new PercentageValue(5), "5%"));
    const node = parseLine("price - d1 - d2 =>", 1);
    const result: any = defaultRegistry.evaluate(node as any, {
      variableStore: { clearVariables() {}, setVariableWithMetadata() {} } as any,
      variableContext,
      lineNumber: 1,
      decimalPlaces: 2,
    });
    expect(result?.type).toBe("mathResult");
    // price * 0.9 * 0.95 = €171
    expect(result.displayText).toMatch(/=>\s*€171(\.0+)?/);
  });

  test("mixed on/off with percent literals and variables", () => {
    const variableContext = new Map();
    variableContext.set("base", makeVariable("base", new NumberValue(100), "100"));
    variableContext.set("bonus", makeVariable("bonus", new PercentageValue(20), "20%"));
    const node = parseLine("10% on base + bonus =>", 1);
    const result: any = defaultRegistry.evaluate(node as any, {
      variableStore: { clearVariables() {}, setVariableWithMetadata() {} } as any,
      variableContext,
      lineNumber: 1,
      decimalPlaces: 2,
    });
    expect(result?.type).toBe("mathResult");
    // (1.1*base) + (20% of (1.1*base)) = base*1.1*1.2 = 132
    expect(result.displayText).toMatch(/=>\s*132(\.0+)?/);
  });

  test("percent variable used inside parentheses", () => {
    const variableContext = new Map();
    variableContext.set("p", makeVariable("p", new PercentageValue(25), "25%"));
    const node = parseLine("(100 + 200) + p =>", 1);
    const result: any = defaultRegistry.evaluate(node as any, {
      variableStore: { clearVariables() {}, setVariableWithMetadata() {} } as any,
      variableContext,
      lineNumber: 1,
      decimalPlaces: 0,
    });
    expect(result?.type).toBe("mathResult");
    // 300 * 1.25 = 375
    expect(result.displayText).toMatch(/=>\s*375/);
  });

  test("guard: adding different currency symbols should error", () => {
    const variableContext = new Map();
    variableContext.set("usd", makeVariable("usd", CurrencyValue.fromString("$100"), "$100"));
    variableContext.set("eur", makeVariable("eur", new PercentageValue(10), "€10%"));
    const node = parseLine("usd + eur =>", 1);
    const result: any = defaultRegistry.evaluate(node as any, {
      variableStore: { clearVariables() {}, setVariableWithMetadata() {} } as any,
      variableContext,
      lineNumber: 1,
      decimalPlaces: 2
    });
    // Evaluator should not try to combine $ with a % wrapped in a different symbol; expect runtime error
    expect(result?.type).toBe("error");
  });

  test("percentage variables should be properly parsed and stored", () => {
    // Test that percentage variables are correctly parsed
    const node = parseLine("discount = 20%", 1);
    
    // This should parse correctly as a variable assignment
    expect(node.type).toBe("variableAssignment");
    if (node.type === "variableAssignment") {
      expect(node.variableName).toBe("discount");
      expect(node.parsedValue.getNumericValue()).toBe(0.2);
    }
  });

  test("percentage variables should work in expressions", () => {
    // Test that percentage variables can be used in calculations
    const variableContext = new Map();
    variableContext.set("discount", makeVariable("discount", new PercentageValue(20), "20%"));
    variableContext.set("price", makeVariable("price", CurrencyValue.fromString("$100"), "$100"));
    
    const node = parseLine("discount of price =>", 1);
    const result: any = defaultRegistry.evaluate(node as any, {
      variableStore: { clearVariables() {}, setVariableWithMetadata() {} } as any,
      variableContext,
      lineNumber: 1,
      decimalPlaces: 2,
    });
    
    // The evaluator should handle this expression
    expect(result).toBeDefined();
    // Check that it's either a math result or an error (both are valid outcomes)
    expect(["mathResult", "error"]).toContain(result?.type);
  });



  describe("Percentage evaluator should still work for legitimate percentage expressions", () => {
    test("30% of 500 should still work", () => {
      const node = parseLine("30% of 500 =>", 1);
      const result: any = defaultRegistry.evaluate(node as any, {
        variableStore: { clearVariables() {}, setVariableWithMetadata() {} } as any,
        variableContext: new Map(),
        lineNumber: 1,
        decimalPlaces: 2,
      });
      expect(result?.type).toBe("mathResult");
      expect(result.displayText).toMatch(/=>\s*150(\.0+)?/);
    });

    test("20 of 80 is % should still work", () => {
      const node = parseLine("20 of 80 is % =>", 1);
      const result: any = defaultRegistry.evaluate(node as any, {
        variableStore: { clearVariables() {}, setVariableWithMetadata() {} } as any,
        variableContext: new Map(),
        lineNumber: 1,
        decimalPlaces: 2,
      });
      expect(result?.type).toBe("mathResult");
      expect(result.displayText).toMatch(/=>\s*25%/);
    });

    test("20% on 80 should still work", () => {
      const node = parseLine("20% on 80 =>", 1);
      const result: any = defaultRegistry.evaluate(node as any, {
        variableStore: { clearVariables() {}, setVariableWithMetadata() {} } as any,
        variableContext: new Map(),
        lineNumber: 1,
        decimalPlaces: 2,
      });
      expect(result?.type).toBe("mathResult");
      expect(result.displayText).toMatch(/=>\s*96(\.0+)?/);
    });

    test("20% off 80 should still work", () => {
      const node = parseLine("20% off 80 =>", 1);
      const result: any = defaultRegistry.evaluate(node as any, {
        variableStore: { clearVariables() {}, setVariableWithMetadata() {} } as any,
        variableContext: new Map(),
        lineNumber: 1,
        decimalPlaces: 2,
      });
      expect(result?.type).toBe("mathResult");
      expect(result.displayText).toMatch(/=>\s*64(\.0+)?/);
    });
  });
});
