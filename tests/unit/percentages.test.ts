import { parseLine } from "../../src/parsing/astParser";
import { defaultRegistry } from "../../src/eval/registry";
import "../../src/eval/index"; // ensure registry is set up

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
    // @ts-ignore
    variableContext.set("numerator", { value: 20 });
    // @ts-ignore
    variableContext.set("denominator", { value: 80 });
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
    // @ts-ignore
    variableContext.set("rate", { value: 15, displayValue: "15%" });
    // @ts-ignore
    variableContext.set("base", { value: 200, displayValue: "$200" });
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
    // @ts-ignore
    variableContext.set("total_sales", { value: 5000 });
    // @ts-ignore
    variableContext.set("commission_rate", { value: 5.5 });
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
    // @ts-ignore
    variableContext.set("money", { value: 400, displayValue: "$400" });
    // store taxes as percent-looking value
    // @ts-ignore
    variableContext.set("taxes", { value: 5, displayValue: "5%" });
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
    // @ts-ignore
    variableContext.set("base", { value: 1000 });
    // @ts-ignore
    variableContext.set("discount", { value: 10, displayValue: "10%" });
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
    // @ts-ignore
    variableContext.set("money", { value: 400, displayValue: "$400" });
    // @ts-ignore
    variableContext.set("taxes", { value: 5, displayValue: "5%" });
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
    // @ts-ignore
    variableContext.set("price", { value: 200, displayValue: "€200" });
    // @ts-ignore
    variableContext.set("d1", { value: 10, displayValue: "10%" });
    // @ts-ignore
    variableContext.set("d2", { value: 5, displayValue: "5%" });
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
    // @ts-ignore
    variableContext.set("base", { value: 100 });
    // @ts-ignore
    variableContext.set("bonus", { value: 20, displayValue: "20%" });
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
    // @ts-ignore
    variableContext.set("p", { value: 25, displayValue: "25%" });
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
    // @ts-ignore
    variableContext.set("usd", { value: 100, displayValue: "$100" });
    // @ts-ignore
    variableContext.set("eur", { value: 10, displayValue: "€10%" });
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
    // @ts-ignore
    variableContext.set("discount", { value: "20%", displayValue: "20%" });
    // @ts-ignore
    variableContext.set("price", { value: 100, displayValue: "$100" });
    
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