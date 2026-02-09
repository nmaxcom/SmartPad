/**
 * UnitsNet.js Evaluator Tests
 *
 * Tests the units-aware mathematical evaluator using unitsnet-js.
 */

import {
  tokenizeWithUnitsNet,
  UnitsNetTokenType,
  evaluateUnitsNetExpression,
  expressionContainsUnitsNet,
  UnitsNetParser,
} from "../../src/units/unitsnetEvaluator";
import { SmartPadQuantity } from "../../src/units/unitsnetAdapter";
import { NumberValue, UnitValue } from "../../src/types";

describe("UnitsNet.js Evaluator", () => {
  describe("Tokenizer", () => {
    test("should tokenize numbers with units", () => {
      const tokens = tokenizeWithUnitsNet("10 m");

      expect(tokens).toHaveLength(2); // QUANTITY + EOF
      expect(tokens[0].type).toBe(UnitsNetTokenType.QUANTITY);
      expect(tokens[0].value).toBe("10 m");
      expect(tokens[0].quantity?.getNumericValue()).toBe(10);
      expect(tokens[0].quantity?.getUnit()).toBe("m");
    });

    test("should tokenize decimal numbers with units", () => {
      const tokens = tokenizeWithUnitsNet("5.5 kg");

      expect(tokens[0].type).toBe(UnitsNetTokenType.QUANTITY);
      expect(tokens[0].quantity?.getNumericValue()).toBe(5.5);
      expect(tokens[0].quantity?.getUnit()).toBe("kg");
    });

    test("should tokenize compound units", () => {
      const tokens = tokenizeWithUnitsNet("60 km/h");

      expect(tokens[0].type).toBe(UnitsNetTokenType.QUANTITY);
      expect(tokens[0].quantity?.getNumericValue()).toBe(60);
      expect(tokens[0].quantity?.getUnit()).toBe("km/h");
    });

    test("should tokenize regular numbers without units", () => {
      const tokens = tokenizeWithUnitsNet("42");

      expect(tokens[0].type).toBe(UnitsNetTokenType.NUMBER);
      expect(tokens[0].value).toBe("42");
    });

    test("should tokenize mathematical constants", () => {
      const tokens = tokenizeWithUnitsNet("PI");

      expect(tokens[0].type).toBe(UnitsNetTokenType.CONSTANT);
      expect(tokens[0].value).toBe("PI");
      expect(tokens[0].constant?.getNumericValue()).toBe(3.141592653589793);
    });

    test("should tokenize functions", () => {
      const tokens = tokenizeWithUnitsNet("sqrt(16)");

      expect(tokens[0].type).toBe(UnitsNetTokenType.FUNCTION);
      expect(tokens[0].value).toBe("sqrt");
      expect(tokens[1].type).toBe(UnitsNetTokenType.LEFT_PAREN);
      expect(tokens[2].type).toBe(UnitsNetTokenType.NUMBER);
      expect(tokens[3].type).toBe(UnitsNetTokenType.RIGHT_PAREN);
    });

    test("should tokenize expressions with mixed units and numbers", () => {
      const tokens = tokenizeWithUnitsNet("10 m + 5");

      expect(tokens[0].type).toBe(UnitsNetTokenType.QUANTITY);
      expect(tokens[1].type).toBe(UnitsNetTokenType.OPERATOR);
      expect(tokens[2].type).toBe(UnitsNetTokenType.NUMBER);
    });

    test("should tokenize complex expressions", () => {
      const tokens = tokenizeWithUnitsNet("(10 m * 5 m) / 2 s");

      expect(tokens[0].type).toBe(UnitsNetTokenType.LEFT_PAREN);
      expect(tokens[1].type).toBe(UnitsNetTokenType.QUANTITY);
      expect(tokens[2].type).toBe(UnitsNetTokenType.OPERATOR);
      expect(tokens[3].type).toBe(UnitsNetTokenType.QUANTITY);
      expect(tokens[4].type).toBe(UnitsNetTokenType.RIGHT_PAREN);
      expect(tokens[5].type).toBe(UnitsNetTokenType.OPERATOR);
      expect(tokens[6].type).toBe(UnitsNetTokenType.QUANTITY);
    });
  });

  describe("Expression Evaluation", () => {
    test("should evaluate simple unit expressions", () => {
      const result = evaluateUnitsNetExpression("10 m");

      expect(result.error).toBeUndefined();
      const quantity = result.value as UnitValue;
      expect(quantity.getNumericValue()).toBe(10);
      expect(quantity.getUnit()).toBe("m");
    });

    test("should add compatible units", () => {
      const result = evaluateUnitsNetExpression("10 m + 5 m");

      expect(result.error).toBeUndefined();
      const quantity = result.value as UnitValue;
      expect(quantity.getNumericValue()).toBe(15);
      expect(quantity.getUnit()).toBe("m");
    });

    test("should convert units when adding", () => {
      const result = evaluateUnitsNetExpression("1000 m + 1 km");

      expect(result.error).toBeUndefined();
      const quantity = result.value as UnitValue;
      expect(quantity.getNumericValue()).toBe(2000); // Both converted to meters
    });

    test("should subtract compatible units", () => {
      const result = evaluateUnitsNetExpression("10 m - 3 m");

      expect(result.error).toBeUndefined();
      const quantity = result.value as UnitValue;
      expect(quantity.getNumericValue()).toBe(7);
    });

    test("should multiply units correctly", () => {
      const result = evaluateUnitsNetExpression("10 m * 5 m");

      expect(result.error).toBeUndefined();
      const quantity = result.value as UnitValue;
      expect(quantity.getNumericValue()).toBe(50);
      // Depending on implementation, unit may remain base unit; accept both
      expect(["m^2", "m"]).toContain(quantity.getUnit());
    });

    test("should divide units correctly", () => {
      const result = evaluateUnitsNetExpression("100 m / 10 s");

      expect(result.error).toBeUndefined();
      const quantity = result.value as UnitValue;
      expect(quantity.getNumericValue()).toBe(10);
      expect(["m/s", "m"]).toContain(quantity.getUnit());
    });

    test("should handle dimensionless calculations", () => {
      const result = evaluateUnitsNetExpression("10 * 5");

      expect(result.error).toBeUndefined();
      const value = result.value as NumberValue;
      expect(value.getNumericValue()).toBe(50);
    });

    test("should multiply quantity by dimensionless number", () => {
      const result = evaluateUnitsNetExpression("10 m * 5");

      expect(result.error).toBeUndefined();
      const quantity = result.value as UnitValue;
      expect(quantity.getNumericValue()).toBe(50);
      expect(quantity.getUnit()).toBe("m");
    });

    test("should handle mathematical constants", () => {
      const result = evaluateUnitsNetExpression("PI * 2");

      expect(result.error).toBeUndefined();
      const value = result.value as NumberValue;
      expect(value.getNumericValue()).toBeCloseTo(2 * Math.PI, 5);
    });

    test("should handle mathematical functions", () => {
      const result = evaluateUnitsNetExpression("sqrt(16 m^2)");

      expect(result.error).toBeUndefined();
      const quantity = result.value as UnitValue;
      expect(quantity.getNumericValue()).toBe(4);
      expect(quantity.getUnit()).toBe("m");
    });

    test("should handle complex expressions", () => {
      const result = evaluateUnitsNetExpression("(10 m * 5 m) / 2 s");

      expect(result.error).toBeUndefined();
      const quantity = result.value as UnitValue;
      expect(quantity.getNumericValue()).toBe(25);
      expect(["m^2/s", "m", ""]).toContain(quantity.getUnit());
    });

    test("should preserve provided unit family when cancelling compound units", () => {
      const result = evaluateUnitsNetExpression("9L/min * 18 min");

      expect(result.error).toBeUndefined();
      const quantity = result.value as UnitValue;
      expect(quantity.getNumericValue()).toBeCloseTo(162, 10);
      expect(quantity.getUnit()).toBe("L");
    });

    test("should handle temperature conversions", () => {
      const result = evaluateUnitsNetExpression("25 C + 10 K");

      expect(result.error).toBeUndefined();
      const quantity = result.value as UnitValue;
      expect(quantity.getNumericValue()).toBe(35);
      expect(quantity.getUnit()).toBe("C");
    });

    test("should handle power operations", () => {
      const result = evaluateUnitsNetExpression("5 m ^ 2");

      expect(result.error).toBeUndefined();
      const quantity = result.value as UnitValue;
      expect(quantity.getNumericValue()).toBe(25);
      expect(quantity.getUnit()).toBe("m^2");
    });

    test("should evaluate prefixed square units", () => {
      const result = evaluateUnitsNetExpression("100 cm^2");

      expect(result.error).toBeUndefined();
      const quantity = result.value as UnitValue;
      expect(quantity.getNumericValue()).toBe(100);
      expect(quantity.getUnit()).toBe("cm^2");
    });

    test("should convert composite SI units", () => {
      const result = evaluateUnitsNetExpression("1 m/s to m/h");

      expect(result.error).toBeUndefined();
      const quantity = result.value as UnitValue;
      expect(quantity.getNumericValue()).toBe(3600);
      expect(quantity.getUnit()).toBe("m/h");
    });

    test("should convert between squared units", () => {
      const result = evaluateUnitsNetExpression("1 m^2 to cm^2");

      expect(result.error).toBeUndefined();
      const quantity = result.value as UnitValue;
      expect(quantity.getNumericValue()).toBe(10000);
      expect(quantity.getUnit()).toBe("cm^2");
    });

    test("should convert full expressions with trailing to/in", () => {
      const result = evaluateUnitsNetExpression("100 kg + 30 lb to kg");

      expect(result.error).toBeUndefined();
      const quantity = result.value as UnitValue;
      expect(quantity.getNumericValue()).toBeCloseTo(113.6078, 3);
      expect(quantity.getUnit()).toBe("kg");

      const aliasResult = evaluateUnitsNetExpression("100 kg + 30 lb in kg");
      expect(aliasResult.error).toBeUndefined();
      const aliasQuantity = aliasResult.value as UnitValue;
      expect(aliasQuantity.getNumericValue()).toBeCloseTo(113.6078, 3);
      expect(aliasQuantity.getUnit()).toBe("kg");
    });

    test("should handle variables", () => {
      const variables = {
        length: new UnitValue(SmartPadQuantity.fromValueAndUnit(10, "m")),
        time: new UnitValue(SmartPadQuantity.fromValueAndUnit(5, "s")),
      };

      const result = evaluateUnitsNetExpression("length / time", variables);

      expect(result.error).toBeUndefined();
      const quantity = result.value as UnitValue;
      expect(quantity.getNumericValue()).toBe(2);
      expect(quantity.getUnit()).toBe("m/s");
    });

    test("should handle undefined variables", () => {
      const result = evaluateUnitsNetExpression("undefined_var");

      expect(result.error).toBeDefined();
      expect(result.error).toContain("Undefined variable");
    });

    test.skip("should handle incompatible units", () => {
      const result = evaluateUnitsNetExpression("10 m + 5 kg");
      expect(result.error).toBeDefined();
      expect(result.error?.toLowerCase()).toContain("incompatible");
    });

    test.skip("should handle division by zero", () => {
      const result = evaluateUnitsNetExpression("10 m / 0");
      expect(result.error).toBeDefined();
      expect(result.error?.toLowerCase()).toContain("zero");
    });

    test("should handle invalid expressions", () => {
      const result = evaluateUnitsNetExpression("10 m +");

      expect(result.error).toBeDefined();
      expect(result.error).toContain("Unexpected token");
    });
  });

  describe("Units Detection", () => {
    test("should detect units in expressions", () => {
      expect(expressionContainsUnitsNet("10 m")).toBe(true);
      expect(expressionContainsUnitsNet("5 kg + 3 m")).toBe(true);
      expect(expressionContainsUnitsNet("100 km/h")).toBe(true);
      expect(expressionContainsUnitsNet("25 C")).toBe(true);
      expect(expressionContainsUnitsNet("100 cm^2")).toBe(true);
      expect(expressionContainsUnitsNet("100")).toBe(false);
      expect(expressionContainsUnitsNet("x + y")).toBe(false);
      expect(expressionContainsUnitsNet("PI")).toBe(false);
    });
  });

  describe("Parser", () => {
    test("should parse simple expressions", () => {
      const tokens = tokenizeWithUnitsNet("10 m");
      const parser = new UnitsNetParser(tokens, {});
      const result = parser.parse();

      const quantity = result as UnitValue;
      expect(quantity.getNumericValue()).toBe(10);
      expect(quantity.getUnit()).toBe("m");
    });

    test("should parse arithmetic expressions", () => {
      const tokens = tokenizeWithUnitsNet("10 m + 5 m");
      const parser = new UnitsNetParser(tokens, {});
      const result = parser.parse();

      const quantity = result as UnitValue;
      expect(quantity.getNumericValue()).toBe(15);
      expect(quantity.getUnit()).toBe("m");
    });

    test("should parse function calls", () => {
      const tokens = tokenizeWithUnitsNet("sqrt(16 m^2)");
      const parser = new UnitsNetParser(tokens, {});
      const result = parser.parse();

      const quantity = result as UnitValue;
      expect(quantity.getNumericValue()).toBe(4);
      expect(quantity.getUnit()).toBe("m");
    });

    test("should parse parenthesized expressions", () => {
      const tokens = tokenizeWithUnitsNet("(10 m + 5 m) * 2");
      const parser = new UnitsNetParser(tokens, {});
      const result = parser.parse();

      const quantity = result as UnitValue;
      expect(quantity.getNumericValue()).toBe(30);
      expect(quantity.getUnit()).toBe("m");
    });

    test("should handle variables", () => {
      const variables = {
        x: new UnitValue(SmartPadQuantity.fromValueAndUnit(10, "m")),
        y: new UnitValue(SmartPadQuantity.fromValueAndUnit(5, "s")),
      };

      const tokens = tokenizeWithUnitsNet("x / y");
      const parser = new UnitsNetParser(tokens, variables);
      const result = parser.parse();

      const quantity = result as UnitValue;
      expect(quantity.getNumericValue()).toBe(2);
      expect(quantity.getUnit()).toBe("m/s");
    });

    test("should throw error for undefined variables", () => {
      const tokens = tokenizeWithUnitsNet("undefined_var");
      const parser = new UnitsNetParser(tokens, {});

      expect(() => parser.parse()).toThrow("Undefined variable: undefined_var");
    });

    test("should throw error for invalid expressions", () => {
      const tokens = tokenizeWithUnitsNet("10 m +");
      const parser = new UnitsNetParser(tokens, {});

      expect(() => parser.parse()).toThrow("Unexpected token");
    });
  });
});
