/**
 * Math.js Engine Tests - TDD Foundation
 * 
 * These tests define the expected behavior of our Math.js wrapper.
 * Following TDD: Write tests FIRST, then implement to pass.
 */

import { MathJsEngine } from './MathJsEngine';

describe('MathJsEngine', () => {
  let mathEngine: MathJsEngine;

  beforeEach(() => {
    mathEngine = new MathJsEngine();
  });

  describe('Basic Arithmetic', () => {
    test('should evaluate simple addition', () => {
      const result = mathEngine.evaluate('2 + 3');
      expect(result.value).toBe(5);
      expect(result.error).toBeUndefined();
    });

    test('should evaluate simple subtraction', () => {
      const result = mathEngine.evaluate('10 - 3');
      expect(result.value).toBe(7);
      expect(result.error).toBeUndefined();
    });

    test('should evaluate simple multiplication', () => {
      const result = mathEngine.evaluate('4 * 5');
      expect(result.value).toBe(20);
      expect(result.error).toBeUndefined();
    });

    test('should evaluate simple division', () => {
      const result = mathEngine.evaluate('15 / 3');
      expect(result.value).toBe(5);
      expect(result.error).toBeUndefined();
    });

    test('should evaluate exponentiation', () => {
      const result = mathEngine.evaluate('2 ^ 3');
      expect(result.value).toBe(8);
      expect(result.error).toBeUndefined();
    });
  });

  describe('Multi-Element Expressions (Currently Failing in SmartPad)', () => {
    test('should evaluate multiple additions', () => {
      const result = mathEngine.evaluate('2 + 3 + 4 + 5');
      expect(result.value).toBe(14);
      expect(result.error).toBeUndefined();
    });

    test('should evaluate multiple multiplications', () => {
      const result = mathEngine.evaluate('2 * 3 * 4');
      expect(result.value).toBe(24);
      expect(result.error).toBeUndefined();
    });

    test('should evaluate mixed operations', () => {
      const result = mathEngine.evaluate('10 + 20 - 5 + 3');
      expect(result.value).toBe(28);
      expect(result.error).toBeUndefined();
    });
  });

  describe('Operator Precedence (Critical Fix)', () => {
    test('should follow correct order: multiplication before addition', () => {
      const result = mathEngine.evaluate('2 + 3 * 4');
      expect(result.value).toBe(14); // 2 + 12, NOT (2 + 3) * 4 = 20
      expect(result.error).toBeUndefined();
    });

    test('should follow correct order: parentheses first', () => {
      const result = mathEngine.evaluate('(2 + 3) * 4');
      expect(result.value).toBe(20); // (5) * 4
      expect(result.error).toBeUndefined();
    });

    test('should handle complex precedence', () => {
      const result = mathEngine.evaluate('2 + 3 * 4 - 1');
      expect(result.value).toBe(13); // 2 + 12 - 1
      expect(result.error).toBeUndefined();
    });

    test('should handle nested parentheses', () => {
      const result = mathEngine.evaluate('(10 + 5) / 3 + 2 * 4');
      expect(result.value).toBe(13); // 5 + 8
      expect(result.error).toBeUndefined();
    });
  });

  describe('Mathematical Functions', () => {
    test('should evaluate sqrt function', () => {
      const result = mathEngine.evaluate('sqrt(16)');
      expect(result.value).toBe(4);
      expect(result.error).toBeUndefined();
    });

    test('should evaluate abs function', () => {
      const result = mathEngine.evaluate('abs(-5)');
      expect(result.value).toBe(5);
      expect(result.error).toBeUndefined();
    });

    test('should evaluate round function', () => {
      const result = mathEngine.evaluate('round(3.7)');
      expect(result.value).toBe(4);
      expect(result.error).toBeUndefined();
    });

    test('should handle functions in complex expressions', () => {
      const result = mathEngine.evaluate('sqrt(16) + abs(-3)');
      expect(result.value).toBe(7); // 4 + 3
      expect(result.error).toBeUndefined();
    });
  });

  describe('Variable Support', () => {
    test('should evaluate with variable scope', () => {
      const scope = { a: 10, b: 5 };
      const result = mathEngine.evaluate('a + b', scope);
      expect(result.value).toBe(15);
      expect(result.error).toBeUndefined();
    });

    test('should handle complex expressions with variables', () => {
      const scope = { price: 100, tax: 0.08, discount: 10 };
      const result = mathEngine.evaluate('(price - discount) * (1 + tax)', scope);
      expect(result.value).toBe(97.2); // (100 - 10) * 1.08
      expect(result.error).toBeUndefined();
    });

    test('should handle phrase-based variable names', () => {
      const scope = { 'my price': 50, 'tax rate': 0.1 };
      const result = mathEngine.evaluate('my price * (1 + tax rate)', scope);
      expect(result.value).toBe(55); // 50 * 1.1
      expect(result.error).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle division by zero', () => {
      const result = mathEngine.evaluate('10 / 0');
      expect(result.value).toBeUndefined();
      expect(result.error).toContain('division by zero');
    });

    test('should handle undefined variables', () => {
      const result = mathEngine.evaluate('unknown_var + 5');
      expect(result.value).toBeUndefined();
      expect(result.error).toContain('undefined');
    });

    test('should handle malformed expressions', () => {
      const result = mathEngine.evaluate('2 + + 3');
      expect(result.value).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    test('should handle empty expressions', () => {
      const result = mathEngine.evaluate('');
      expect(result.value).toBeUndefined();
      expect(result.error).toBeDefined();
    });
  });

  describe('Decimal Precision', () => {
    test('should handle decimal arithmetic', () => {
      const result = mathEngine.evaluate('3.14 + 2.86');
      expect(result.value).toBeCloseTo(6);
      expect(result.error).toBeUndefined();
    });

    test('should handle floating point precision issues', () => {
      const result = mathEngine.evaluate('0.1 + 0.2');
      expect(result.value).toBeCloseTo(0.3);
      expect(result.error).toBeUndefined();
    });
  });
});
