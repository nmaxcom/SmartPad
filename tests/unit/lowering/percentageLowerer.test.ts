/**
 * Percentage Lowerer Tests (TDD)
 * 
 * These tests define the required behavior for the semantic lowerer that
 * converts percentage AST nodes into Math.js-compatible expressions.
 * 
 * Unlike the deprecated regex preprocessor, this lowerer operates on typed AST nodes,
 * not raw strings, ensuring robustness and proper semantic handling.
 */

import { PercentageLowerer } from '../../../src/lowering/percentageLowerer';
import { 
  ExpressionNode, 
  ExpressionComponent,
  CombinedAssignmentNode 
} from '../../../src/parsing/ast';
import { 
  NumberValue, 
  PercentageValue, 
  SemanticValue 
} from '../../../src/types';

// Helper to create a mock AST node for testing
function createMockExpressionNode(expression: string, components: ExpressionComponent[]): ExpressionNode {
  return {
    type: 'expression',
    line: 1,
    raw: expression,
    expression,
    components
  };
}

// Helper to create percentage component
function createPercentageComponent(value: number): ExpressionComponent {
  return {
    type: 'literal',
    value: `${value}%`,
    parsedValue: new PercentageValue(value)
  };
}

// Helper to create number component
function createNumberComponent(value: number): ExpressionComponent {
  return {
    type: 'literal',
    value: `${value}`,
    parsedValue: new NumberValue(value)
  };
}

// Helper to create variable component
function createVariableComponent(name: string): ExpressionComponent {
  return {
    type: 'variable',
    value: name
  };
}

// Helper to create operator component
function createOperatorComponent(op: string): ExpressionComponent {
  return {
    type: 'operator',
    value: op
  };
}

describe('PercentageLowerer', () => {
  describe('Basic Percentage Operations', () => {
    test('should lower "X% of Y" to Math.js expression', () => {
      // Mock AST for "20% of 100"
      const components = [
        createPercentageComponent(20),
        createOperatorComponent('of'),
        createNumberComponent(100)
      ];
      
      const node = createMockExpressionNode('20% of 100', components);
      const scope = {};
      
      const result = PercentageLowerer.lower(node, scope);
      expect(result.mathJsExpression).toBe('((20/100) * 100)');
    });

    test('should lower "X% on Y" to Math.js expression', () => {
      // Mock AST for "15% on 80"
      const components = [
        createPercentageComponent(15),
        createOperatorComponent('on'),
        createNumberComponent(80)
      ];
      
      const node = createMockExpressionNode('15% on 80', components);
      const scope = {};
      
      const result = PercentageLowerer.lower(node, scope);
      expect(result.mathJsExpression).toBe('80 + ((15/100) * 80)');
    });

    test('should lower "X% off Y" to Math.js expression', () => {
      // Mock AST for "25% off 50"
      const components = [
        createPercentageComponent(25),
        createOperatorComponent('off'),
        createNumberComponent(50)
      ];
      
      const node = createMockExpressionNode('25% off 50', components);
      const scope = {};
      
      const result = PercentageLowerer.lower(node, scope);
      expect(result.mathJsExpression).toBe('50 - ((25/100) * 50)');
    });
  });

  describe('Complex and Chained Expressions', () => {
    test('should handle variables in expressions', () => {
      // Mock AST for "10% of price"
      const components = [
        createPercentageComponent(10),
        createOperatorComponent('of'),
        createVariableComponent('price')
      ];
      
      const node = createMockExpressionNode('10% of price', components);
      const scope = {};
      
      const result = PercentageLowerer.lower(node, scope);
      expect(result.mathJsExpression).toBe('((10/100) * price)');
      expect(result.requiredVariables).toContain('price');
    });

    test('should handle parenthesized expressions', () => {
      // Mock AST for "10% of (price + 50)"
      const priceAddition = {
        type: 'parentheses',
        value: '(price + 50)',
        children: [
          createVariableComponent('price'),
          createOperatorComponent('+'),
          createNumberComponent(50)
        ]
      } as ExpressionComponent;
      
      const components = [
        createPercentageComponent(10),
        createOperatorComponent('of'),
        priceAddition
      ];
      
      const node = createMockExpressionNode('10% of (price + 50)', components);
      const scope = {};
      
      const result = PercentageLowerer.lower(node, scope);
      expect(result.mathJsExpression).toBe('((10/100) * (price + 50))');
      expect(result.requiredVariables).toContain('price');
    });

    test('should handle chained percentage expressions', () => {
      // Mock AST for "10% of 50% of 1000"
      // This is a simplified representation - in reality the AST would be more complex
      // after the first percentage is evaluated
      const innerPercentage = {
        type: 'parentheses',
        value: '50% of 1000',
        children: [
          createPercentageComponent(50),
          createOperatorComponent('of'),
          createNumberComponent(1000)
        ]
      } as ExpressionComponent;
      
      const components = [
        createPercentageComponent(10),
        createOperatorComponent('of'),
        innerPercentage
      ];
      
      const node = createMockExpressionNode('10% of 50% of 1000', components);
      const scope = {};
      
      const result = PercentageLowerer.lower(node, scope);
      expect(result.mathJsExpression).toBe('((10/100) * ((50/100) * 1000))');
    });

    test('should handle mixed percentage operations', () => {
      // Mock AST for "10% on 20% off 200"
      // This is a simplified representation - in reality the AST would be more complex
      const discountExpression = {
        type: 'parentheses',
        value: '20% off 200',
        children: [
          createPercentageComponent(20),
          createOperatorComponent('off'),
          createNumberComponent(200)
        ]
      } as ExpressionComponent;
      
      const components = [
        createPercentageComponent(10),
        createOperatorComponent('on'),
        discountExpression
      ];
      
      const node = createMockExpressionNode('10% on 20% off 200', components);
      const scope = {};
      
      const result = PercentageLowerer.lower(node, scope);
      expect(result.mathJsExpression).toBe('((200) - ((20/100) * (200))) + ((10/100) * ((200) - ((20/100) * (200))))');
    });
  });

  describe('Edge Cases and Scope Building', () => {
    test('should collect variables for scope', () => {
      // Mock AST for "10% of price + tax"
      const priceAddTax = {
        type: 'parentheses',
        value: 'price + tax',
        children: [
          createVariableComponent('price'),
          createOperatorComponent('+'),
          createVariableComponent('tax')
        ]
      } as ExpressionComponent;
      
      const components = [
        createPercentageComponent(10),
        createOperatorComponent('of'),
        priceAddTax
      ];
      
      const node = createMockExpressionNode('10% of price + tax', components);
      const scope = {};
      
      const result = PercentageLowerer.lower(node, scope);
      expect(result.requiredVariables).toContain('price');
      expect(result.requiredVariables).toContain('tax');
    });

    test('should handle non-percentage expressions by passing through', () => {
      // Mock AST for "100 + 200 / 5"
      const components = [
        createNumberComponent(100),
        createOperatorComponent('+'),
        createNumberComponent(200),
        createOperatorComponent('/'),
        createNumberComponent(5)
      ];
      
      const node = createMockExpressionNode('100 + 200 / 5', components);
      const scope = {};
      
      const result = PercentageLowerer.lower(node, scope);
      expect(result.mathJsExpression).toBe('100 + 200 / 5');
      expect(result.hasPercentages).toBe(false);
    });
  });
});
