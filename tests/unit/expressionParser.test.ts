/**
 * Expression Parser Tests
 *
 * Tests all expression evaluation logic including:
 * - Basic arithmetic operations
 * - Mathematical functions
 * - Variable substitution
 * - Error handling
 * - Result formatting
 * - Cursor positioning
 */

import {
  parseExpressionLine,
  parseAndEvaluateExpression,
  substituteVariables,
  formatResult,
  needsExpressionEvaluation,
  extractExpression,
  expressionNeedsUpdate,
} from "../../src/parsing/expressionParser";
import { Variable } from "../../src/state/types";
import { NumberValue } from "../../src/types";

describe("Expression Parser", () => {
  // Helper to create variable store
  const createVariableStore = (variables: Record<string, number>): Map<string, Variable> => {
    const store = new Map<string, Variable>();
    Object.entries(variables).forEach(([name, value]) => {
      store.set(name, {
        name,
        value: NumberValue.from(value),
        rawValue: value.toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
    return store;
  };

  describe("parseExpressionLine", () => {
    test("should parse simple arithmetic expressions", () => {
      const store = createVariableStore({});

      const result = parseExpressionLine("2 + 3 =>", store);

      expect(result.isValid).toBe(true);
      expect(result.evaluatedResult).toBe(5);
      expect(result.displayText).toBe("2 + 3 => 5");
      expect(result.cursorPosition).toBe(10);
    });

    test("should parse expressions with variables", () => {
      const store = createVariableStore({ price: 10.5, tax: 0.08 });

      const result = parseExpressionLine("price * (1 + tax) =>", store);

      expect(result.isValid).toBe(true);
      expect(result.evaluatedResult).toBeCloseTo(11.34);
      expect(result.displayText).toBe("price * (1 + tax) => 11.34");
      expect(result.variables).toEqual(["price", "tax"]);
    });

    test("should parse expressions with phrase-based variables", () => {
      const store = createVariableStore({ "my password": 2929, "bonus amount": 100 });

      const result = parseExpressionLine("my password + bonus amount =>", store);

      expect(result.isValid).toBe(true);
      expect(result.evaluatedResult).toBe(3029);
      expect(result.displayText).toBe("my password + bonus amount => 3029");
      expect(result.variables).toEqual(expect.arrayContaining(["my password", "bonus amount"]));
      expect(result.variables).toHaveLength(2);
    });

    test("should handle mathematical functions", () => {
      const store = createVariableStore({});

      const result = parseExpressionLine("sqrt(16) + abs(-5) =>", store);

      expect(result.isValid).toBe(true);
      expect(result.evaluatedResult).toBe(9);
      expect(result.displayText).toBe("sqrt(16) + abs(-5) => 9");
    });

    test("should reject lines without => trigger", () => {
      const store = createVariableStore({});

      const result = parseExpressionLine("2 + 3", store);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("No evaluation trigger found");
    });

    test("should handle empty expression before =>", () => {
      const store = createVariableStore({});

      const result = parseExpressionLine(" =>", store);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Empty expression before =>");
    });

    test("should handle undefined variables with error", () => {
      const store = createVariableStore({});

      const result = parseExpressionLine("unknown_var + 5 =>", store);

      expect(result.isValid).toBe(true);
      expect(result.error).toBe("'unknown_var' not defined");
      expect(result.displayText).toBe("unknown_var + 5 => ⚠️ 'unknown_var' not defined");
    });

    test("should handle division by zero error", () => {
      const store = createVariableStore({});

      const result = parseExpressionLine("5 / 0 =>", store);

      expect(result.isValid).toBe(true);
      expect(result.error).toBe("Division by zero");
      expect(result.displayText).toBe("5 / 0 => ⚠️ Division by zero");
    });

    test("should handle malformed expressions", () => {
      const store = createVariableStore({});

      const result = parseExpressionLine("2 + =>", store);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeTruthy();
      expect(result.displayText).toContain("2 + => ⚠️");
      expect(result.error).toBeDefined();
    });
  });

  describe("parseAndEvaluateExpression", () => {
    test("should evaluate simple expressions", () => {
      const store = createVariableStore({});

      const result = parseAndEvaluateExpression("2 + 3 * 4", store);

      expect(result.value).toBe(14);
      expect(result.variables).toEqual([]);
      expect(result.error).toBeUndefined();
    });

    test("should substitute and evaluate variables", () => {
      const store = createVariableStore({ x: 5, y: 3 });

      const result = parseAndEvaluateExpression("x * y + 1", store);

      expect(result.value).toBe(16);
      expect(result.variables).toEqual(["x", "y"]);
      expect(result.error).toBeUndefined();
    });

    test("should handle phrase-based variables", () => {
      const store = createVariableStore({ "item price": 12.99, "tax rate": 0.08 });

      const result = parseAndEvaluateExpression("item price * (1 + tax rate)", store);

      expect(result.value).toBeCloseTo(14.0292);
      expect(result.variables).toEqual(["item price", "tax rate"]);
    });

    test("should handle functions with variables", () => {
      const store = createVariableStore({ x: 16 });

      const result = parseAndEvaluateExpression("sqrt(x) + 2", store);

      expect(result.value).toBe(6);
      expect(result.variables).toEqual(["x"]);
    });

    test("should return error for undefined variables", () => {
      const store = createVariableStore({ x: 5 });

      const result = parseAndEvaluateExpression("x + unknown", store);

      expect(result.value).toBe(0);
      expect(result.error).toBe("'unknown' not defined");
      expect(result.variables).toEqual(["x"]);
    });

    test("should handle mathematical errors", () => {
      const store = createVariableStore({ x: -1 });

      const result = parseAndEvaluateExpression("sqrt(x)", store);

      expect(result.value).toBe(0);
      expect(result.error).toBe("Square root of negative number");
      expect(result.variables).toEqual(["x"]);
    });
  });

  describe("substituteVariables", () => {
    test("should substitute single variable", () => {
      const store = createVariableStore({ x: 42 });
      const usedVars: string[] = [];

      const result = substituteVariables("x + 5", store, usedVars);

      expect(result).toBe("42 + 5");
      expect(usedVars).toEqual(["x"]);
    });

    test("should substitute multiple variables", () => {
      const store = createVariableStore({ a: 10, b: 20 });
      const usedVars: string[] = [];

      const result = substituteVariables("a * b + a", store, usedVars);

      expect(result).toBe("10 * 20 + 10");
      expect(usedVars).toEqual(["a", "b"]);
    });

    test("should handle phrase-based variables with longest match first", () => {
      const store = createVariableStore({
        price: 10,
        "my price": 20,
        "total price": 30,
      });
      const usedVars: string[] = [];

      const result = substituteVariables("my price + total price", store, usedVars);

      expect(result).toBe("20 + 30");
      expect(usedVars).toEqual(["my price", "total price"]);
    });

    test("should handle variables in complex expressions", () => {
      const store = createVariableStore({ x: 5, y: 3 });
      const usedVars: string[] = [];

      const result = substituteVariables("(x + y) * x - y", store, usedVars);

      expect(result).toBe("(5 + 3) * 5 - 3");
      expect(usedVars).toEqual(["x", "y"]);
    });

    test("should throw error for undefined variables", () => {
      const store = createVariableStore({ x: 5 });
      const usedVars: string[] = [];

      expect(() => {
        substituteVariables("x + unknown", store, usedVars);
      }).toThrow("'unknown' not defined");
    });

    test("should handle decimal variable values", () => {
      const store = createVariableStore({ pi: 3.14159 });
      const usedVars: string[] = [];

      const result = substituteVariables("2 * pi", store, usedVars);

      expect(result).toBe("2 * 3.14159");
      expect(usedVars).toEqual(["pi"]);
    });
  });

  describe("formatResult", () => {
    test("should format integers without decimals", () => {
      expect(formatResult(42)).toBe("42");
      expect(formatResult(-10)).toBe("-10");
      expect(formatResult(0)).toBe("0");
    });

    test("should format decimals with appropriate precision", () => {
      expect(formatResult(3.14159)).toBe("3.14159");
      expect(formatResult(10.5)).toBe("10.5");
      expect(formatResult(1.23456789)).toBe("1.234568");
    });

    test("should handle very small numbers", () => {
      expect(formatResult(0.00001)).toBe("1.000e-5");
      expect(formatResult(0.000000123)).toBe("1.230e-7");
    });

    test("should handle very large numbers", () => {
      expect(formatResult(1e15)).toBe("1.000e+15");
      expect(formatResult(9.87654321e20)).toBe("9.877e+20");
    });

    test("should handle infinite values", () => {
      expect(formatResult(Infinity)).toBe("Infinity");
      expect(formatResult(-Infinity)).toBe("Infinity");
    });

    test("should remove trailing zeros", () => {
      expect(formatResult(10.1)).toBe("10.1");
      expect(formatResult(5.0)).toBe("5");
    });

    test("should handle small decimals properly", () => {
      expect(formatResult(0.1)).toBe("0.1");
      expect(formatResult(0.123456789)).toBe("0.123457");
    });
  });

  describe("needsExpressionEvaluation", () => {
    test("should return true for lines with =>", () => {
      expect(needsExpressionEvaluation("2 + 3 =>")).toBe(true);
      expect(needsExpressionEvaluation("price * 1.08 => 11.34")).toBe(true);
    });

    test("should return false for lines without =>", () => {
      expect(needsExpressionEvaluation("2 + 3")).toBe(false);
      expect(needsExpressionEvaluation("price = 10.5")).toBe(false);
      expect(needsExpressionEvaluation("Just some text")).toBe(false);
    });

    test("should return false for empty lines", () => {
      expect(needsExpressionEvaluation("")).toBe(false);
      expect(needsExpressionEvaluation("   ")).toBe(false);
    });
  });

  describe("extractExpression", () => {
    test("should extract expression part before =>", () => {
      expect(extractExpression("2 + 3 =>")).toBe("2 + 3");
      expect(extractExpression("price * 1.08 => 11.34")).toBe("price * 1.08");
    });

    test("should handle expressions with spaces", () => {
      expect(extractExpression("  sqrt(16) + 2  => 6  ")).toBe("sqrt(16) + 2");
    });

    test("should return full line if no =>", () => {
      expect(extractExpression("2 + 3")).toBe("2 + 3");
      expect(extractExpression("price = 10.5")).toBe("price = 10.5");
    });
  });

  describe("expressionNeedsUpdate", () => {
    test("should return false for non-expression lines", () => {
      const store = createVariableStore({});

      expect(expressionNeedsUpdate("price = 10.5", store)).toBe(false);
      expect(expressionNeedsUpdate("Just text", store)).toBe(false);
    });

    test("should return false when result matches current evaluation", () => {
      const store = createVariableStore({ price: 10.5 });

      expect(expressionNeedsUpdate("2 + 3 => 5", store)).toBe(false);
      expect(expressionNeedsUpdate("price * 2 => 21", store)).toBe(false);
    });

    test("should return true when result differs from current evaluation", () => {
      const store = createVariableStore({ price: 15.5 }); // Changed value

      expect(expressionNeedsUpdate("price * 2 => 21", store)).toBe(true);
    });

    test("should return true for error results", () => {
      const store = createVariableStore({});

      expect(expressionNeedsUpdate("2 + 3 => ", store)).toBe(true);
    });

    test("should return true when variables become undefined", () => {
      const store = createVariableStore({}); // Empty store

      expect(expressionNeedsUpdate("price * 2 => 21", store)).toBe(true);
    });
  });

  describe("Integration Tests", () => {
    test("should handle complex real-world scenario", () => {
      const store = createVariableStore({
        "base price": 100,
        "tax rate": 0.08,
        discount: 10,
      });

      const result = parseExpressionLine("(base price - discount) * (1 + tax rate) =>", store);

      expect(result.isValid).toBe(true);
      expect(result.evaluatedResult).toBeCloseTo(97.2); // (100 - 10) * 1.08
      expect(result.displayText).toBe("(base price - discount) * (1 + tax rate) => 97.2");
      expect(result.variables).toEqual(["base price", "discount", "tax rate"]);
    });

    test("should handle expression with functions and variables", () => {
      const store = createVariableStore({
        x: 25,
        offset: 3,
      });

      const result = parseExpressionLine("sqrt(x) + abs(-offset) =>", store);

      expect(result.isValid).toBe(true);
      expect(result.evaluatedResult).toBe(8); // sqrt(25) + abs(-3) = 5 + 3
      expect(result.displayText).toBe("sqrt(x) + abs(-offset) => 8");
    });

    test("should handle precision in calculations", () => {
      const store = createVariableStore({
        a: 0.1,
        b: 0.2,
      });

      const result = parseExpressionLine("a + b =>", store);

      expect(result.isValid).toBe(true);
      expect(result.evaluatedResult).toBeCloseTo(0.3);
      expect(result.displayText).toBe("a + b => 0.3");
    });
  });
});
