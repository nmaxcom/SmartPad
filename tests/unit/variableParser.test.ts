/**
 * Variable Assignment Parser Tests
 *
 * Tests variable assignment parsing including:
 * - Simple numeric assignments
 * - Phrase-based variable names
 * - Expression assignments
 * - Variable reference assignments
 * - Error handling for invalid assignments
 */

import { parseVariableAssignment, VariableAssignment } from "../../src/parsing/variableParser";

describe("Variable Assignment Parser", () => {
  describe("Valid Assignments", () => {
    test("should parse simple variable assignment", () => {
      const result = parseVariableAssignment("price = 10.5");
      expect(result).toEqual({
        isValid: true,
        variableName: "price",
        value: 10.5,
      });
    });

    test("should parse phrase-based variable assignment", () => {
      const result = parseVariableAssignment("my password = 2929");
      expect(result).toEqual({
        isValid: true,
        variableName: "my password",
        value: 2929,
      });
    });

    test("should parse multiple word variable assignment", () => {
      const result = parseVariableAssignment("total cost = 150.50");
      expect(result).toEqual({
        isValid: true,
        variableName: "total cost",
        value: 150.5,
      });
    });

    test("should parse assignment with leading/trailing whitespace", () => {
      const result = parseVariableAssignment("  tax rate = 0.08  ");
      expect(result).toEqual({
        isValid: true,
        variableName: "tax rate",
        value: 0.08,
      });
    });

    test("should parse traditional identifier", () => {
      const result = parseVariableAssignment("itemCost = 25");
      expect(result).toEqual({
        isValid: true,
        variableName: "itemCost",
        value: 25,
      });
    });

    test("should parse negative number assignment", () => {
      const result = parseVariableAssignment("temperature = -5.2");
      expect(result).toEqual({
        isValid: true,
        variableName: "temperature",
        value: -5.2,
      });
    });

    test("should parse integer assignment", () => {
      const result = parseVariableAssignment("count = 42");
      expect(result).toEqual({
        isValid: true,
        variableName: "count",
        value: 42,
      });
    });

    test("should parse assignment with spaces around equals", () => {
      const result = parseVariableAssignment("my value   =   123.45");
      expect(result).toEqual({
        isValid: true,
        variableName: "my value",
        value: 123.45,
      });
    });

    test("should parse variable reference assignment", () => {
      const result = parseVariableAssignment("c = b");
      expect(result).toEqual({
        isValid: true,
        variableName: "c",
        rawValue: "b",
      });
    });

    test("should parse mathematical expression assignment", () => {
      const result = parseVariableAssignment("z = 10 + 2");
      expect(result).toEqual({
        isValid: true,
        variableName: "z",
        rawValue: "10 + 2",
      });
    });

    test("should parse complex expression assignment", () => {
      const result = parseVariableAssignment("total = price * (1 + tax)");
      expect(result).toEqual({
        isValid: true,
        variableName: "total",
        rawValue: "price * (1 + tax)",
      });
    });

    test("should parse variable expression assignment", () => {
      const result = parseVariableAssignment("b = a + 1");
      expect(result).toEqual({
        isValid: true,
        variableName: "b",
        rawValue: "a + 1",
      });
    });

    test("should parse variable assignment with percentage symbol", () => {
      const result = parseVariableAssignment("tax_rate = 15%");
      expect(result).toEqual({
        isValid: true,
        variableName: "tax_rate",
        rawValue: "15%",
      });
    });

    test("should parse variable assignment with percentage in expression", () => {
      const result = parseVariableAssignment("discount = 20% of price");
      expect(result).toEqual({
        isValid: true,
        variableName: "discount",
        rawValue: "20% of price",
      });
    });

    test("should parse simple percentage assignment", () => {
      const result = parseVariableAssignment("discount = 20%");
      expect(result).toEqual({
        isValid: true,
        variableName: "discount",
        rawValue: "20%",
      });
    });
  });

  describe("Invalid Assignments", () => {
    test("should reject ambiguous text with trailing content", () => {
      const result = parseVariableAssignment("I think my password = 2929 is secure");
      expect(result).toEqual({
        isValid: false,
        error: "Line contains trailing text after assignment",
      });
    });

    test("should reject text not starting with variable name", () => {
      const result = parseVariableAssignment("The my calculation = 50 seems wrong");
      expect(result).toEqual({
        isValid: false,
        error: "Line contains trailing text after assignment",
      });
    });

    test("should reject line with only equals sign", () => {
      const result = parseVariableAssignment("= 2929");
      expect(result).toEqual({
        isValid: false,
        error: "Invalid variable name",
      });
    });

    test("should accept variable references now", () => {
      const result = parseVariableAssignment("my variable = abc");
      expect(result).toEqual({
        isValid: true,
        variableName: "my variable",
        rawValue: "abc",
      });
    });

    test("should reject empty string", () => {
      const result = parseVariableAssignment("");
      expect(result).toEqual({
        isValid: false,
        error: "Empty line",
      });
    });

    test("should reject line with no equals sign", () => {
      const result = parseVariableAssignment("my variable 123");
      expect(result).toEqual({
        isValid: false,
        error: "No assignment operator found",
      });
    });

    test("should accept expressions with equals signs in them", () => {
      const result = parseVariableAssignment("my variable = 123 = 456");
      expect(result).toEqual({
        isValid: true,
        variableName: "my variable",
        rawValue: "123 = 456",
      });
    });

    test("should reject variable name starting with number", () => {
      const result = parseVariableAssignment("123abc = 456");
      expect(result).toEqual({
        isValid: false,
        error: "Invalid variable name",
      });
    });

    test("should reject variable name with special characters", () => {
      const result = parseVariableAssignment("my-variable = 123");
      expect(result).toEqual({
        isValid: false,
        error: "Invalid variable name",
      });
    });
  });

  describe("Edge Cases", () => {
    test("should handle decimal numbers correctly", () => {
      const result = parseVariableAssignment("pi = 3.14159");
      expect(result).toEqual({
        isValid: true,
        variableName: "pi",
        value: 3.14159,
      });
    });

    test("should handle zero value", () => {
      const result = parseVariableAssignment("zero = 0");
      expect(result).toEqual({
        isValid: true,
        variableName: "zero",
        value: 0,
      });
    });

    test("should handle negative zero", () => {
      const result = parseVariableAssignment("negzero = -0");
      expect(result).toEqual({
        isValid: true,
        variableName: "negzero",
        value: -0,
      });
    });

    test("should handle percentage values correctly", () => {
      const result = parseVariableAssignment("tax_rate = 15%");
      expect(result).toEqual({
        isValid: true,
        variableName: "tax_rate",
        rawValue: "15%",
      });
    });

    test("should handle multiple percentage variables", () => {
      const assignments = [
        "discount = 20%",
        "tax_rate = 15.5%",
        "commission = 5%"
      ];

      assignments.forEach(assignment => {
        const result = parseVariableAssignment(assignment);
        expect(result.isValid).toBe(true);
        expect(result.rawValue).toContain("%");
      });
    });
  });

  describe("Variable names with special words that could conflict with other evaluators", () => {
    test("should parse variable name 'cost of living' without conflicts", () => {
      const result = parseVariableAssignment("cost of living = 1500");
      expect(result.isValid).toBe(true);
      expect(result.variableName).toBe("cost of living");
      expect(result.value).toBe(1500);
    });

    test("should parse variable name 'rate of change' without conflicts", () => {
      const result = parseVariableAssignment("rate of change = 0.05");
      expect(result.isValid).toBe(true);
      expect(result.variableName).toBe("rate of change");
      expect(result.value).toBe(0.05);
    });

    test("should parse variable name 'level of service' without conflicts", () => {
      const result = parseVariableAssignment("level of service = 95");
      expect(result.isValid).toBe(true);
      expect(result.variableName).toBe("level of service");
      expect(result.value).toBe(95);
    });

    test("should parse variable name 'cost on demand' without conflicts", () => {
      const result = parseVariableAssignment("cost on demand = 200");
      expect(result.isValid).toBe(true);
      expect(result.variableName).toBe("cost on demand");
      expect(result.value).toBe(200);
    });

    test("should parse variable name 'price off peak' without conflicts", () => {
      const result = parseVariableAssignment("price off peak = 80");
      expect(result.isValid).toBe(true);
      expect(result.variableName).toBe("price off peak");
      expect(result.value).toBe(80);
    });

    test("should parse variable name 'percentage of total' without conflicts", () => {
      const result = parseVariableAssignment("percentage of total = 25");
      expect(result.isValid).toBe(true);
      expect(result.variableName).toBe("percentage of total");
      expect(result.value).toBe(25);
    });

    test("should parse variable name 'part of whole' without conflicts", () => {
      const result = parseVariableAssignment("part of whole = 0.75");
      expect(result.isValid).toBe(true);
      expect(result.variableName).toBe("part of whole");
      expect(result.value).toBe(0.75);
    });

    test("should parse variable name 'sum of squares' without conflicts", () => {
      const result = parseVariableAssignment("sum of squares = 100");
      expect(result.isValid).toBe(true);
      expect(result.variableName).toBe("sum of squares");
      expect(result.value).toBe(100);
    });

    test("should parse variable name 'product of factors' without conflicts", () => {
      const result = parseVariableAssignment("product of factors = 24");
      expect(result.isValid).toBe(true);
      expect(result.variableName).toBe("product of factors");
      expect(result.value).toBe(24);
    });

    test("should parse variable name 'ratio of sides' without conflicts", () => {
      const result = parseVariableAssignment("ratio of sides = 1.618");
      expect(result.isValid).toBe(true);
      expect(result.variableName).toBe("ratio of sides");
      expect(result.value).toBe(1.618);
    });

    test("should parse variable name 'commission rate of total sales' without conflicts", () => {
      const result = parseVariableAssignment("commission rate of total sales = 0.15");
      expect(result.isValid).toBe(true);
      expect(result.variableName).toBe("commission rate of total sales");
      expect(result.value).toBe(0.15);
    });

    test("should parse variable name 'tax rate on income' without conflicts", () => {
      const result = parseVariableAssignment("tax rate on income = 0.25");
      expect(result.isValid).toBe(true);
      expect(result.variableName).toBe("tax rate on income");
      expect(result.value).toBe(0.25);
    });

    test("should parse variable name 'discount off retail' without conflicts", () => {
      const result = parseVariableAssignment("discount off retail = 0.20");
      expect(result.isValid).toBe(true);
      expect(result.variableName).toBe("discount off retail");
      expect(result.value).toBe(0.20);
    });
  });
});
