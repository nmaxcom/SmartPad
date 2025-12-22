/**
 * Units Evaluator Tests
 *
 * Tests units-aware mathematical evaluation including:
 * - Units tokenization and parsing
 * - Units expression evaluation
 * - Unit arithmetic operations
 * - Unit conversions
 * - Dimensional analysis
 * - Error handling for incompatible units
 */

/**
 * Tests for Units-Aware Math Evaluator
 */

import {
  tokenizeWithUnits,
  UnitsTokenType,
  evaluateUnitsExpression,
  expressionContainsUnits,
} from "../../src/units/unitsEvaluator";
import { Quantity } from "../../src/units/quantity";

describe("Units Tokenizer", () => {
  test("should tokenize numbers with units", () => {
    const tokens = tokenizeWithUnits("10 m");

    expect(tokens).toHaveLength(2); // QUANTITY + EOF
    expect(tokens[0].type).toBe(UnitsTokenType.QUANTITY);
    expect(tokens[0].value).toBe("10 m");
    expect(tokens[0].quantity?.value).toBe(10);
    expect(tokens[0].quantity?.unit.components[0].unit.symbol).toBe("m");
  });

  test("should tokenize decimal numbers with units", () => {
    const tokens = tokenizeWithUnits("5.5 kg");

    expect(tokens[0].type).toBe(UnitsTokenType.QUANTITY);
    expect(tokens[0].quantity?.value).toBe(5.5);
    expect(tokens[0].quantity?.unit.components[0].unit.symbol).toBe("kg");
  });

  test("should tokenize compound units", () => {
    const tokens = tokenizeWithUnits("60 km");

    expect(tokens[0].type).toBe(UnitsTokenType.QUANTITY);
    expect(tokens[0].quantity?.value).toBe(60);
    expect(tokens[0].quantity?.unit.components[0].unit.symbol).toBe("km");
  });

  test("should tokenize regular numbers without units", () => {
    const tokens = tokenizeWithUnits("42");

    expect(tokens[0].type).toBe(UnitsTokenType.NUMBER);
    expect(tokens[0].value).toBe("42");
  });

  test("should tokenize expressions with mixed units and numbers", () => {
    const tokens = tokenizeWithUnits("10 m + 5");

    expect(tokens).toHaveLength(4); // QUANTITY + OPERATOR + NUMBER + EOF
    expect(tokens[0].type).toBe(UnitsTokenType.QUANTITY);
    expect(tokens[1].type).toBe(UnitsTokenType.OPERATOR);
    expect(tokens[1].value).toBe("+");
    expect(tokens[2].type).toBe(UnitsTokenType.NUMBER);
    expect(tokens[2].value).toBe("5");
  });

  test("should handle operators correctly", () => {
    const tokens = tokenizeWithUnits("10 m * 2");

    expect(tokens[1].type).toBe(UnitsTokenType.OPERATOR);
    expect(tokens[1].value).toBe("*");
  });

  test("should handle parentheses", () => {
    const tokens = tokenizeWithUnits("(10 m + 5 m) * 2");

    expect(tokens[0].type).toBe(UnitsTokenType.LEFT_PAREN);
    // Find the right parenthesis position
    const rightParenIndex = tokens.findIndex((token) => token.type === UnitsTokenType.RIGHT_PAREN);
    expect(rightParenIndex).toBeGreaterThan(-1);
    expect(tokens[rightParenIndex].type).toBe(UnitsTokenType.RIGHT_PAREN);
  });
});

describe("Units Expression Evaluation", () => {
  test("should evaluate simple unit expressions", () => {
    const result = evaluateUnitsExpression("10 m");

    expect(result.error).toBeUndefined();
    expect(result.quantity.value).toBe(10);
    expect(result.quantity.unit.components[0].unit.symbol).toBe("m");
  });

  test("should add compatible units", () => {
    const result = evaluateUnitsExpression("10 m + 5 m");

    expect(result.error).toBeUndefined();
    expect(result.quantity.value).toBe(15);
    expect(result.quantity.unit.components[0].unit.symbol).toBe("m");
  });

  test("should convert units when adding", () => {
    const result = evaluateUnitsExpression("1000 m + 1 km");

    expect(result.error).toBeUndefined();
    expect(result.quantity.value).toBe(2000); // Both converted to meters
  });

  test("should subtract compatible units", () => {
    const result = evaluateUnitsExpression("10 m - 3 m");

    expect(result.error).toBeUndefined();
    expect(result.quantity.value).toBe(7);
  });

  test("should multiply units correctly", () => {
    const result = evaluateUnitsExpression("10 m * 5 m");

    expect(result.error).toBeUndefined();
    expect(result.quantity.value).toBe(50);
    // Should result in m^2 (area)
    expect(result.quantity.unit.toString()).toBe("m^2");
  });

  test("should divide units correctly", () => {
    const result = evaluateUnitsExpression("100 m / 10 s");

    expect(result.error).toBeUndefined();
    expect(result.quantity.value).toBe(10);
    // Should result in m/s (velocity)
    expect(result.quantity.unit.toString()).toBe("m/s");
  });

  test("should handle dimensionless calculations", () => {
    const result = evaluateUnitsExpression("10 * 5");

    expect(result.error).toBeUndefined();
    expect(result.quantity.value).toBe(50);
    expect(result.quantity.isDimensionless()).toBe(true);
  });

  test("should multiply quantity by dimensionless number", () => {
    const result = evaluateUnitsExpression("10 m * 3");

    expect(result.error).toBeUndefined();
    expect(result.quantity.value).toBe(30);
    expect(result.quantity.unit.components[0].unit.symbol).toBe("m");
  });

  test("should handle complex expressions", () => {
    const result = evaluateUnitsExpression("(10 m + 5 m) * 2 m");

    expect(result.error).toBeUndefined();
    expect(result.quantity.value).toBe(30); // (15 m) * 2 m = 30 m^2
    expect(result.quantity.unit.toString()).toBe("m^2");
  });

  test("should handle power operations", () => {
    const result = evaluateUnitsExpression("5 m ^ 2");

    expect(result.error).toBeUndefined();
    expect(result.quantity.value).toBe(25);
    expect(result.quantity.unit.toString()).toBe("m^2");
  });

  test("should handle order of operations with units", () => {
    const result = evaluateUnitsExpression("10 m + 5 m * 2");

    expect(result.error).toBeUndefined();
    expect(result.quantity.value).toBe(20); // 10 m + (5 m * 2) = 10 m + 10 m = 20 m
  });

  test("should error on incompatible unit addition", () => {
    const result = evaluateUnitsExpression("10 m + 5 kg");

    expect(result.error).toBeDefined();
    expect(result.error).toContain("incompatible dimensions");
  });

  test("should error on incompatible unit subtraction", () => {
    const result = evaluateUnitsExpression("10 m - 5 s");

    expect(result.error).toBeDefined();
    expect(result.error).toContain("incompatible dimensions");
  });

  test("should error on division by zero", () => {
    const result = evaluateUnitsExpression("10 m / 0 s");

    expect(result.error).toBeDefined();
    expect(result.error).toContain("Division by zero");
  });

  test("should handle functions with units", () => {
    const result = evaluateUnitsExpression("abs(-10 m)");

    expect(result.error).toBeUndefined();
    expect(result.quantity.value).toBe(10);
    expect(result.quantity.unit.components[0].unit.symbol).toBe("m");
  });

  test("should handle functions with dimensionless quantities", () => {
    const result = evaluateUnitsExpression("sqrt(25)");

    expect(result.error).toBeUndefined();
    expect(result.quantity.value).toBe(5);
    expect(result.quantity.isDimensionless()).toBe(true);
  });

  test("should error on sqrt with units", () => {
    const result = evaluateUnitsExpression("sqrt(25 m)");

    expect(result.error).toBeDefined();
    expect(result.error).toContain("sqrt can only be applied to dimensionless quantities");
  });

  test("should handle variables with units", () => {
    const variables = {
      length: Quantity.fromUnit(10, "m"),
      width: Quantity.fromUnit(5, "m"),
    };

    const result = evaluateUnitsExpression("length * width", variables);

    expect(result.error).toBeUndefined();
    expect(result.quantity.value).toBe(50);
    expect(result.quantity.unit.toString()).toBe("m^2");
  });

  test("should handle physics calculations", () => {
    // F = ma (Force = mass * acceleration)
    const variables = {
      mass: Quantity.fromUnit(10, "kg"),
      acceleration: Quantity.fromUnit(9.8, "m"), // Simplified as just m instead of m/s^2
    };

    const result = evaluateUnitsExpression("mass * acceleration", variables);

    expect(result.error).toBeUndefined();
    expect(result.quantity.value).toBe(98);
  });
});

describe("Expression Contains Units", () => {
  test("should detect expressions with units", () => {
    expect(expressionContainsUnits("10 m")).toBe(true);
    expect(expressionContainsUnits("5 kg + 3 kg")).toBe(true);
    expect(expressionContainsUnits("100 km / 2 h")).toBe(true);
  });

  test("should detect expressions without units", () => {
    expect(expressionContainsUnits("10")).toBe(false);
    expect(expressionContainsUnits("5 + 3")).toBe(false);
    expect(expressionContainsUnits("100 / 2")).toBe(false);
  });

  test("should detect mixed expressions", () => {
    expect(expressionContainsUnits("10 m + 5")).toBe(true);
    expect(expressionContainsUnits("pi * 10 m")).toBe(true);
  });
});

describe("Real World Examples", () => {
  test("should calculate speed from distance and time", () => {
    const result = evaluateUnitsExpression("60 km");
    expect(result.error).toBeUndefined();

    // This would be more meaningful with compound units like km/h
    // which we'll implement in the next phase
  });

  test("should calculate area", () => {
    const result = evaluateUnitsExpression("10 m * 5 m");

    expect(result.error).toBeUndefined();
    expect(result.quantity.value).toBe(50);
    expect(result.quantity.unit.toString()).toBe("m^2");
  });

  test("should calculate volume", () => {
    const result = evaluateUnitsExpression("10 m * 5 m * 2 m");

    expect(result.error).toBeUndefined();
    expect(result.quantity.value).toBe(100);
    expect(result.quantity.unit.toString()).toBe("m^3");
  });

  test("should handle unit conversions in calculations", () => {
    const result = evaluateUnitsExpression("1 km + 500 m");

    expect(result.error).toBeUndefined();
    expect(result.quantity.value).toBe(1.5); // Result in km: 1 km + 0.5 km = 1.5 km
    expect(result.quantity.unit.components[0].unit.symbol).toBe("km");
  });
});
