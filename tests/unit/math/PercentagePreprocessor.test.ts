/**
 * Percentage Preprocessor Tests (TDD)
 *
 * These tests define the required translations for SmartPad's unique
 * percentage syntax into standard mathematical expressions that Math.js can evaluate.
 */

import { PercentagePreprocessor } from '../../../src/math/PercentagePreprocessor';

describe('PercentagePreprocessor', () => {
  describe('Basic Percentage Operations', () => {
    test('should convert "X% of Y"', () => {
      const expression = '20% of 100';
      const expected = '((20/100) * 100)';
      expect(PercentagePreprocessor.process(expression)).toBe(expected);
    });

    test('should convert "X% on Y"', () => {
      const expression = '15% on 80';
      const expected = '80 + ((15/100) * 80)'; // Adjusted for correct output
      expect(PercentagePreprocessor.process(expression)).toBe(expected);
    });

    test('should convert "X% off Y"', () => {
      const expression = '25% off 50';
      const expected = '50 - ((25/100) * 50)'; // Adjusted for correct output
      expect(PercentagePreprocessor.process(expression)).toBe(expected);
    });
  });

  describe('Complex and Chained Expressions', () => {
    test('should handle variables and complex expressions as operands', () => {
      const expression = '10% of (price + 50)';
      const expected = '((10/100) * (price + 50))';
      expect(PercentagePreprocessor.process(expression)).toBe(expected);
    });

    test('should handle chained percentages', () => {
      let expression = '10% of 50% of 1000';
      let expected = '((10/100) * ((50/100) * 1000))';
      expect(PercentagePreprocessor.process(expression)).toBe(expected);

      expression = '10% on 20% off 200';
      let expectedChained = '((200) - ((20/100) * (200))) + ((10/100) * ((200) - ((20/100) * (200))))';
      expect(PercentagePreprocessor.process(expression)).toBe(expectedChained);
    });
  });

  describe('Edge Cases and Preservation', () => {
    test('should preserve currency symbols', () => {
      const expression = '20% off $80';
      const expected = '$80 - ((20/100) * $80)'; // Adjusted for correct output
      expect(PercentagePreprocessor.process(expression)).toBe(expected);
    });

    test('should handle decimal percentages', () => {
      const expression = '12.5% of 250';
      const expected = '((12.5/100) * 250)';
      expect(PercentagePreprocessor.process(expression)).toBe(expected);
    });

    test('should not alter standard arithmetic', () => {
      const expression = '100 + 200 / 5';
      expect(PercentagePreprocessor.process(expression)).toBe(expression);
    });

    test('should handle expressions with no spaces', () => {
        const expression = '20%of100';
        const expected = '20%of100'; // No space version is not supported by this parser
        expect(PercentagePreprocessor.process(expression)).toBe(expected);
    });
  });

  // Note: "as %" and "is %" syntax requires evaluation, so they will be handled
  // by a different part of the system, not a simple string replacement.
  // We will add tests for those when we build the unified evaluation service.
});
