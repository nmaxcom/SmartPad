/**
 * Percentage Syntax Reference Tests
 * 
 * This test suite serves as living documentation for all percentage syntax patterns.
 * Each test demonstrates a specific syntax pattern with working examples.
 * 
 * To see all percentage syntax: npm test -- tests/unit/syntax-reference/percentages.test.ts
 */

import { parseLine } from "../../../src/parsing/astParser";
import { defaultRegistry } from "../../../src/eval/registry";
import "../../../src/eval/index"; // ensure registry is set up
import { getSyntaxByCategory } from "../../../src/syntax/registry";

describe("Percentage Syntax Reference", () => {
  // Get all documented percentage syntax patterns
  const percentagePatterns = getSyntaxByCategory("percentages");
  
  describe("Basic Percentage Operations", () => {
    test("x% of y - Calculate percentage of a value", () => {
      // Syntax: "30% of 500 =>"
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

    test("x% on y - Add percentage to a value (increase)", () => {
      // Syntax: "20% on 80 =>"
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

    test("x% off y - Subtract percentage from a value (decrease)", () => {
      // Syntax: "20% off $80 =>"
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
  });

  describe("Percentage Conversion", () => {
    test("x / y as % - Convert ratio to percentage", () => {
      // Syntax: "20 / 80 as % =>"
      const node = parseLine("20 / 80 as % =>", 1);
      const result: any = defaultRegistry.evaluate(node as any, {
        variableStore: { clearVariables() {}, setVariableWithMetadata() {} } as any,
        variableContext: new Map(),
        lineNumber: 1,
        decimalPlaces: 2,
      });
      
      expect(result?.type).toBe("mathResult");
      expect(result.displayText).toMatch(/=>\s*25%/);
      expect(result.displayText).toContain("%");
    });

    test("part of base is % - Calculate percentage from part and base", () => {
      // Syntax: "20 of 80 is % =>"
      const node = parseLine("20 of 80 is % =>", 1);
      const result: any = defaultRegistry.evaluate(node as any, {
        variableStore: { clearVariables() {}, setVariableWithMetadata() {} } as any,
        variableContext: new Map(),
        lineNumber: 1,
        decimalPlaces: 2,
      });
      
      expect(result?.type).toBe("mathResult");
      expect(result.displayText).toMatch(/=>\s*25%/);
      expect(result.displayText).toContain("%");
    });
  });

  describe("Percentage Addition/Subtraction", () => {
    test("base + x% - Add percentage to base value", () => {
      // Syntax: "80 + 20% =>"
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

    test("base - x% - Subtract percentage from base value", () => {
      // Syntax: "500 - 10% =>"
      const node = parseLine("500 - 10% =>", 1);
      const result: any = defaultRegistry.evaluate(node as any, {
        variableStore: { clearVariables() {}, setVariableWithMetadata() {} } as any,
        variableContext: new Map(),
        lineNumber: 1,
        decimalPlaces: 1,
      });
      
      expect(result?.type).toBe("mathResult");
      expect(result.displayText).toMatch(/=>\s*450(\.0+)?/);
    });

    test("Chained percentage operations", () => {
      // Syntax: "500 - 10% - 5% =>"
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
  });

  describe("Complex Percentage Operations", () => {
    test("x% of y% of z - Chained percentage calculations", () => {
      // Syntax: "20% of 50% of 1000 =>"
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

    test("Parenthesized expressions with percentages", () => {
      // Syntax: "30% of (250 + 150) =>"
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
  });

  describe("Percentage with Variables", () => {
    test("Using percentage variables in calculations", () => {
      const variableContext = new Map();
      // @ts-ignore
      variableContext.set("commission_rate", { value: 5.5 });
      // @ts-ignore
      variableContext.set("total_sales", { value: 5000 });
      
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

    test("Percentage variables with currency", () => {
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
      expect(result.displayText).toMatch(/=>\s*\$420(\.0+)?/);
    });
  });

  describe("Documentation Coverage", () => {
    test("all documented percentage patterns should be tested", () => {
      // This test ensures our documentation covers all implemented patterns
      const testedPatterns = [
        "x% of y =>",
        "x% on y =>", 
        "x% off y =>",
        "x / y as % =>",
        "part of base is % =>",
        "base + x% =>",
        "base - x% =>",
        "x% of y% of z =>"
      ];
      
      testedPatterns.forEach(pattern => {
        const matchingDocs = percentagePatterns.filter(doc => 
          doc.syntax === pattern || doc.examples?.some(ex => ex.includes(pattern))
        );
        expect(matchingDocs.length).toBeGreaterThan(0);
        if (matchingDocs.length === 0) {
          throw new Error(`Pattern "${pattern}" should be documented in syntax registry`);
        }
      });
    });
  });
});
