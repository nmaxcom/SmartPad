/**
 * Math.js Engine Tests - TDD Foundation
 * 
 * These tests define the expected behavior of our Math.js wrapper.
 */

import { MathJsEngine } from '../../../src/math/MathJsEngine';
import { ErrorValue } from '../../../src/types';

describe('MathJsEngine', () => {
  let mathEngine: MathJsEngine;

  beforeEach(() => {
    mathEngine = new MathJsEngine();
  });

  const expectNumber = (result: any, expected: number) => {
    expect(result.getType()).toBe('number');
    expect(result.getNumericValue()).toBeCloseTo(expected);
  };

  const expectError = (result: any, messageFragment?: string) => {
    expect(result.getType()).toBe('error');
    if (messageFragment) {
      expect((result as ErrorValue).getMessage()).toContain(messageFragment);
    }
  };

  describe('Basic Arithmetic', () => {
    test('should evaluate simple addition', () => {
      const result = mathEngine.evaluate('2 + 3', {});
      expectNumber(result, 5);
    });

    test('should evaluate simple subtraction', () => {
      const result = mathEngine.evaluate('10 - 3', {});
      expectNumber(result, 7);
    });

    test('should evaluate simple multiplication', () => {
      const result = mathEngine.evaluate('4 * 5', {});
      expectNumber(result, 20);
    });

    test('should evaluate simple division', () => {
      const result = mathEngine.evaluate('15 / 3', {});
      expectNumber(result, 5);
    });

    test('should evaluate exponentiation', () => {
      const result = mathEngine.evaluate('2 ^ 3', {});
      expectNumber(result, 8);
    });
  });

  describe('Multi-Element Expressions', () => {
    test('should evaluate multiple additions', () => {
      const result = mathEngine.evaluate('2 + 3 + 4 + 5', {});
      expectNumber(result, 14);
    });

    test('should evaluate multiple multiplications', () => {
      const result = mathEngine.evaluate('2 * 3 * 4', {});
      expectNumber(result, 24);
    });

    test('should evaluate mixed operations', () => {
      const result = mathEngine.evaluate('10 + 20 - 5 + 3', {});
      expectNumber(result, 28);
    });
  });

  describe('Operator Precedence', () => {
    test('should follow correct order: multiplication before addition', () => {
      const result = mathEngine.evaluate('2 + 3 * 4', {});
      expectNumber(result, 14); // 2 + 12
    });

    test('should follow correct order: parentheses first', () => {
      const result = mathEngine.evaluate('(2 + 3) * 4', {});
      expectNumber(result, 20);
    });

    test('should handle complex precedence', () => {
      const result = mathEngine.evaluate('2 + 3 * 4 - 1', {});
      expectNumber(result, 13);
    });

    test('should handle nested parentheses', () => {
      const result = mathEngine.evaluate('(10 + 5) / 3 + 2 * 4', {});
      expectNumber(result, 13);
    });
  });

  describe('Mathematical Functions', () => {
    test('should evaluate sqrt function', () => {
      const result = mathEngine.evaluate('sqrt(16)', {});
      expectNumber(result, 4);
    });

    test('should evaluate abs function', () => {
      const result = mathEngine.evaluate('abs(-5)', {});
      expectNumber(result, 5);
    });

    test('should evaluate round function', () => {
      const result = mathEngine.evaluate('round(3.7)', {});
      expectNumber(result, 4);
    });

    test('should handle functions in complex expressions', () => {
      const result = mathEngine.evaluate('sqrt(16) + abs(-3)', {});
      expectNumber(result, 7);
    });
  });

  describe('Variable Support', () => {
    test('should evaluate with variable scope', () => {
      const scope = { a: 10, b: 5 };
      const result = mathEngine.evaluate('a + b', scope);
      expectNumber(result, 15);
    });

    test('should handle complex expressions with variables', () => {
      const scope = { price: 100, tax: 0.08, discount: 10 };
      const result = mathEngine.evaluate('(price - discount) * (1 + tax)', scope);
      expectNumber(result, 97.2);
    });

    test('should handle phrase-based variable names', () => {
      const scope = { 'my price': 50, 'tax rate': 0.1 };
      const result = mathEngine.evaluate('my price * (1 + tax rate)', scope);
      expectNumber(result, 55);
    });
  });

  describe('Error Handling', () => {
    test('should handle division by zero', () => {
      const result = mathEngine.evaluate('10 / 0', {});
      expectError(result, 'division by zero');
    });

    test('should handle undefined variables', () => {
      const result = mathEngine.evaluate('unknown_var + 5', {});
      expectError(result, 'undefined');
    });

    test('should handle malformed expressions', () => {
      const result = mathEngine.evaluate('2 + + 3', {});
      expectError(result);
    });

    test('should handle empty expressions', () => {
      const result = mathEngine.evaluate('', {});
      expectError(result);
    });
  });
});
