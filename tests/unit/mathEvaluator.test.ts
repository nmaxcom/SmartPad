/**
 * Math Evaluator Tests
 *
 * Tests mathematical expression evaluation including:
 * - Tokenization of mathematical expressions
 * - Basic arithmetic operations
 * - Order of operations
 * - Mathematical functions
 * - Error handling for invalid expressions
 * - Edge cases and complex expressions
 */

import { evaluateMath, tokenize, TokenType, MathParser } from "../../src/parsing/mathEvaluator";

describe("Mathematical Evaluator", () => {
  describe("tokenize", () => {
    test("should tokenize basic arithmetic", () => {
      const tokens = tokenize("2 + 3");
      expect(tokens.map((t) => ({ type: t.type, value: t.value }))).toEqual([
        { type: TokenType.NUMBER, value: "2" },
        { type: TokenType.OPERATOR, value: "+" },
        { type: TokenType.NUMBER, value: "3" },
        { type: TokenType.EOF, value: "" },
      ]);
    });

    test("should tokenize decimal numbers", () => {
      const tokens = tokenize("3.14 * 2.5");
      expect(tokens[0]).toEqual(expect.objectContaining({ type: TokenType.NUMBER, value: "3.14" }));
      expect(tokens[2]).toEqual(expect.objectContaining({ type: TokenType.NUMBER, value: "2.5" }));
    });

    test("should tokenize functions", () => {
      const tokens = tokenize("sqrt(16)");
      expect(tokens[0]).toEqual(
        expect.objectContaining({ type: TokenType.FUNCTION, value: "sqrt" })
      );
      expect(tokens[1]).toEqual(
        expect.objectContaining({ type: TokenType.LEFT_PAREN, value: "(" })
      );
      expect(tokens[2]).toEqual(expect.objectContaining({ type: TokenType.NUMBER, value: "16" }));
      expect(tokens[3]).toEqual(
        expect.objectContaining({ type: TokenType.RIGHT_PAREN, value: ")" })
      );
    });

    test("should tokenize identifiers (variables)", () => {
      const tokens = tokenize("price + tax");
      expect(tokens[0]).toEqual(
        expect.objectContaining({ type: TokenType.IDENTIFIER, value: "price" })
      );
      expect(tokens[2]).toEqual(
        expect.objectContaining({ type: TokenType.IDENTIFIER, value: "tax" })
      );
    });

    test("should tokenize phrase-based identifiers", () => {
      const tokens = tokenize("my price + total cost");
      expect(tokens[0]).toEqual(
        expect.objectContaining({ type: TokenType.IDENTIFIER, value: "my price" })
      );
      expect(tokens[2]).toEqual(
        expect.objectContaining({ type: TokenType.IDENTIFIER, value: "total cost" })
      );
    });

    test("should handle parentheses and operators", () => {
      const tokens = tokenize("(10 + 5) * 2");
      const types = tokens.map((t) => t.type);
      expect(types).toEqual([
        TokenType.LEFT_PAREN,
        TokenType.NUMBER,
        TokenType.OPERATOR,
        TokenType.NUMBER,
        TokenType.RIGHT_PAREN,
        TokenType.OPERATOR,
        TokenType.NUMBER,
        TokenType.EOF,
      ]);
    });
  });

  describe("evaluateMath - Basic Arithmetic", () => {
    test("should evaluate addition", () => {
      expect(evaluateMath("2 + 3")).toEqual({ value: 5 });
      expect(evaluateMath("10 + 20 + 30")).toEqual({ value: 60 });
    });

    test("should evaluate subtraction", () => {
      expect(evaluateMath("10 - 3")).toEqual({ value: 7 });
      expect(evaluateMath("100 - 25 - 15")).toEqual({ value: 60 });
    });

    test("should evaluate multiplication", () => {
      expect(evaluateMath("4 * 5")).toEqual({ value: 20 });
      expect(evaluateMath("2 * 3 * 4")).toEqual({ value: 24 });
    });

    test("should evaluate division", () => {
      expect(evaluateMath("15 / 3")).toEqual({ value: 5 });
      expect(evaluateMath("20 / 4 / 2")).toEqual({ value: 2.5 });
    });

    test("should evaluate modulo", () => {
      expect(evaluateMath("10 % 3")).toEqual({ value: 1 });
      expect(evaluateMath("17 % 5")).toEqual({ value: 2 });
    });

    test("should evaluate exponentiation", () => {
      expect(evaluateMath("2 ^ 3")).toEqual({ value: 8 });
      expect(evaluateMath("3 ^ 2")).toEqual({ value: 9 });
    });
  });

  describe("evaluateMath - Order of Operations", () => {
    test("should follow correct order: parentheses first", () => {
      expect(evaluateMath("(2 + 3) * 4")).toEqual({ value: 20 });
      expect(evaluateMath("2 + (3 * 4)")).toEqual({ value: 14 });
    });

    test("should follow correct order: exponentiation before multiplication", () => {
      expect(evaluateMath("2 * 3 ^ 2")).toEqual({ value: 18 }); // 2 * 9
      expect(evaluateMath("(2 * 3) ^ 2")).toEqual({ value: 36 }); // 6 ^ 2
    });

    test("should follow correct order: multiplication before addition", () => {
      expect(evaluateMath("2 + 3 * 4")).toEqual({ value: 14 }); // 2 + 12
      expect(evaluateMath("(2 + 3) * 4")).toEqual({ value: 20 }); // 5 * 4
    });

    test("should handle complex expressions", () => {
      expect(evaluateMath("2 + 3 * 4 - 1")).toEqual({ value: 13 }); // 2 + 12 - 1
      expect(evaluateMath("(10 + 5) / 3 + 2 * 4")).toEqual({ value: 13 }); // 5 + 8
    });
  });

  describe("evaluateMath - Unary Operators", () => {
    test("should handle positive unary operator", () => {
      expect(evaluateMath("+5")).toEqual({ value: 5 });
      expect(evaluateMath("+(2 + 3)")).toEqual({ value: 5 });
    });

    test("should handle negative unary operator", () => {
      expect(evaluateMath("-5")).toEqual({ value: -5 });
      expect(evaluateMath("-(2 + 3)")).toEqual({ value: -5 });
    });

    test("should handle nested unary operators", () => {
      expect(evaluateMath("--5")).toEqual({ value: 5 });
      expect(evaluateMath("-+5")).toEqual({ value: -5 });
    });

    test("should handle unary in complex expressions", () => {
      expect(evaluateMath("2 + -3")).toEqual({ value: -1 });
      expect(evaluateMath("-2 * 3")).toEqual({ value: -6 });
    });
  });

  describe("evaluateMath - Mathematical Functions", () => {
    test("should evaluate sqrt function", () => {
      expect(evaluateMath("sqrt(16)")).toEqual({ value: 4 });
      expect(evaluateMath("sqrt(25)")).toEqual({ value: 5 });
      expect(evaluateMath("sqrt(2)")).toEqual({ value: Math.sqrt(2) });
    });

    test("should evaluate abs function", () => {
      expect(evaluateMath("abs(5)")).toEqual({ value: 5 });
      expect(evaluateMath("abs(-5)")).toEqual({ value: 5 });
      expect(evaluateMath("abs(0)")).toEqual({ value: 0 });
    });

    test("should evaluate round function", () => {
      expect(evaluateMath("round(3.7)")).toEqual({ value: 4 });
      expect(evaluateMath("round(3.2)")).toEqual({ value: 3 });
      expect(evaluateMath("round(3.5)")).toEqual({ value: 4 });
    });

    test("should evaluate floor function", () => {
      expect(evaluateMath("floor(3.7)")).toEqual({ value: 3 });
      expect(evaluateMath("floor(3.2)")).toEqual({ value: 3 });
      expect(evaluateMath("floor(-2.3)")).toEqual({ value: -3 });
    });

    test("should evaluate ceil function", () => {
      expect(evaluateMath("ceil(3.7)")).toEqual({ value: 4 });
      expect(evaluateMath("ceil(3.2)")).toEqual({ value: 4 });
      expect(evaluateMath("ceil(-2.3)")).toEqual({ value: -2 });
    });

    test("should handle functions in complex expressions", () => {
      expect(evaluateMath("sqrt(16) + 2")).toEqual({ value: 6 });
      expect(evaluateMath("abs(-5) * 2")).toEqual({ value: 10 });
      expect(evaluateMath("round(3.7) - floor(2.9)")).toEqual({ value: 2 }); // 4 - 2
    });
  });

  describe("evaluateMath - Decimal Numbers", () => {
    test("should handle decimal arithmetic", () => {
      expect(evaluateMath("3.14 + 2.86").value).toBeCloseTo(6);
      expect(evaluateMath("10.5 / 2.5")).toEqual({ value: 4.2 });
    });

    test("should handle precision correctly", () => {
      const result = evaluateMath("0.1 + 0.2");
      expect(result.value).toBeCloseTo(0.3);
    });
  });

  describe("evaluateMath - Error Handling", () => {
    test("should handle division by zero", () => {
      const result = evaluateMath("5 / 0");
      expect(result.error).toBe("Division by zero");
      expect(result.value).toBe(0);
    });

    test("should handle modulo by zero", () => {
      const result = evaluateMath("5 % 0");
      expect(result.error).toBe("Division by zero");
      expect(result.value).toBe(0);
    });

    test("should handle invalid square root", () => {
      const result = evaluateMath("sqrt(-1)");
      expect(result.error).toBe("Square root of negative number");
      expect(result.value).toBe(0);
    });

    test("should handle undefined variables", () => {
      const result = evaluateMath("unknown_var + 5");
      expect(result.error).toContain("Undefined variable: unknown_var");
      expect(result.value).toBe(0);
    });

    test("should handle unknown functions", () => {
      const result = evaluateMath("unknown_func(5)");
      expect(result.error).toContain("Unknown function: unknown_func");
      expect(result.value).toBe(0);
    });

    test("should handle malformed expressions", () => {
      expect(evaluateMath("2 +")).toEqual({
        value: 0,
        error: expect.stringContaining("Invalid expression"),
      });

      expect(evaluateMath(")")).toEqual({
        value: 0,
        error: expect.stringContaining("Invalid expression"),
      });
    });

    test("should handle invalid function arguments", () => {
      const result = evaluateMath("sqrt(1, 2)");
      expect(result.error).toContain("sqrt expects 1 argument, got 2");
      expect(result.value).toBe(0);
    });
  });

  describe("evaluateMath - Edge Cases", () => {
    test("should handle empty expressions", () => {
      const result = evaluateMath("");
      expect(result.error).toBeDefined();
      expect(result.value).toBe(0);
    });

    test("should handle whitespace-only expressions", () => {
      const result = evaluateMath("   ");
      expect(result.error).toBeDefined();
      expect(result.value).toBe(0);
    });

    test("should handle single numbers", () => {
      expect(evaluateMath("42")).toEqual({ value: 42 });
      expect(evaluateMath("3.14159")).toEqual({ value: 3.14159 });
    });

    test("should handle very large numbers", () => {
      const result = evaluateMath("999999999999999 * 999999999999999");
      expect(result.value).toBeDefined();
    });

    test("should handle overflow conditions", () => {
      const result = evaluateMath("10 ^ 1000");
      expect(result.error).toBe("Result is infinite or not a number");
      expect(result.value).toBe(0);
    });
  });

  describe("evaluateMath - Complex Expressions", () => {
    test("should handle nested function calls", () => {
      expect(evaluateMath("sqrt(abs(-16))")).toEqual({ value: 4 });
      expect(evaluateMath("round(sqrt(10))")).toEqual({ value: 3 });
    });

    test("should handle mixed operations", () => {
      expect(evaluateMath("2 * (3 + sqrt(16)) / 2")).toEqual({ value: 7 }); // 2 * (3 + 4) / 2 = 7
    });

    test("should handle multiple parentheses levels", () => {
      expect(evaluateMath("((2 + 3) * (4 + 1)) - 5")).toEqual({ value: 20 }); // (5 * 5) - 5 = 20
    });
  });
});
