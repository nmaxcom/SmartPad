/**
 * Unified Math Service Tests (TDD)
 * 
 * These tests define the required behavior for the UnifiedMathService,
 * which orchestrates AST parsing, semantic typing, lowering, and Math.js evaluation.
 */

import { UnifiedMathService } from '../../../src/math/UnifiedMathService';
import { 
  NumberValue, 
  PercentageValue,
  ErrorValue,
  SemanticValueTypes
} from '../../../src/types';
import { 
  ExpressionNode,
  ExpressionComponent
} from '../../../src/parsing/ast';
import { PercentageLowerer } from '../../../src/lowering/percentageLowerer';
import { EvaluationContext } from '../../../src/eval';
import { ReactiveVariableStore } from '../../../src/state/variableStore';

// Mock the Math.js engine
jest.mock('../../../src/math/MathJsEngine', () => {
  return {
    MathJsEngine: jest.fn().mockImplementation(() => {
      return {
        evaluate: jest.fn().mockImplementation((expr, scope) => {
          // Simple mock implementation for testing
          if (expr === '2 + 3') return new NumberValue(5);
          if (expr === '((10/100) * 50)') return new NumberValue(5);
          if (expr === '50 + ((10/100) * 50)') return new NumberValue(55);
          if (expr === '50 - ((10/100) * 50)') return new NumberValue(45);
          if (expr === 'a + b') {
            if (scope.a === 10 && scope.b === 20) return new NumberValue(30);
            return new ErrorValue('runtime', 'Variable not defined');
          }
          if (expr === '((10/100) * price)') {
            if (scope.price === 100) return new NumberValue(10);
            return new ErrorValue('runtime', 'Variable not defined');
          }
          
          // Default case
          return new NumberValue(0);
        })
      };
    })
  };
});

// Mock the percentage lowerer
jest.mock('../../../src/lowering/percentageLowerer', () => {
  return {
    PercentageLowerer: {
      lower: jest.fn().mockImplementation((node, scope) => {
        // Simple mock implementation for testing
        if (node.expression === '10% of 50') {
          return {
            mathJsExpression: '((10/100) * 50)',
            requiredVariables: new Set(),
            hasPercentages: true
          };
        }
        if (node.expression === '10% on 50') {
          return {
            mathJsExpression: '50 + ((10/100) * 50)',
            requiredVariables: new Set(),
            hasPercentages: true
          };
        }
        if (node.expression === '10% off 50') {
          return {
            mathJsExpression: '50 - ((10/100) * 50)',
            requiredVariables: new Set(),
            hasPercentages: true
          };
        }
        if (node.expression === '10% of price') {
          return {
            mathJsExpression: '((10/100) * price)',
            requiredVariables: new Set(['price']),
            hasPercentages: true
          };
        }
        if (node.expression === 'a + b') {
          return {
            mathJsExpression: 'a + b',
            requiredVariables: new Set(['a', 'b']),
            hasPercentages: false
          };
        }
        
        // Default case: pass through
        return {
          mathJsExpression: node.expression,
          requiredVariables: new Set(),
          hasPercentages: false
        };
      })
    }
  };
});

// Helper to create a mock expression node
function createMockExpressionNode(expression: string): ExpressionNode {
  return {
    type: 'expression',
    line: 1,
    raw: expression + ' =>',
    expression,
    components: []
  };
}

// Helper to create a mock evaluation context
function createMockEvaluationContext(): EvaluationContext {
  const variableContext = new Map();
  variableContext.set('a', { 
    name: 'a',
    value: new NumberValue(10),
    rawValue: '10',
    createdAt: new Date(),
    updatedAt: new Date()
  });
  variableContext.set('b', { 
    name: 'b',
    value: new NumberValue(20),
    rawValue: '20',
    createdAt: new Date(),
    updatedAt: new Date()
  });
  variableContext.set('price', { 
    name: 'price',
    value: new NumberValue(100),
    rawValue: '100',
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  return {
    variableContext,
    variableStore: new ReactiveVariableStore(),
    lineNumber: 1,
    decimalPlaces: 2
  };
}

describe('UnifiedMathService', () => {
  let service: UnifiedMathService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    service = new UnifiedMathService();
  });
  
  describe('Basic Evaluation', () => {
    test('should evaluate simple expressions', () => {
      const node = createMockExpressionNode('2 + 3');
      const context = createMockEvaluationContext();
      
      const result = service.evaluate(node, context);
      
      expect(result.getNumericValue()).toBe(5);
      expect(SemanticValueTypes.isNumber(result)).toBe(true);
    });
    
    test('should handle variables in expressions', () => {
      const node = createMockExpressionNode('a + b');
      const context = createMockEvaluationContext();
      
      const result = service.evaluate(node, context);
      
      expect(result.getNumericValue()).toBe(30);
      expect(SemanticValueTypes.isNumber(result)).toBe(true);
    });
    
    test('should return error for undefined variables', () => {
      // Mock the Math.js engine to return an error for undefined variables
      (service['mathEngine'].evaluate as jest.Mock).mockImplementationOnce(() => {
        return new ErrorValue('runtime', 'Variable c is not defined');
      });
      
      const node = createMockExpressionNode('a + c'); // c is not defined
      const context = createMockEvaluationContext();
      
      const result = service.evaluate(node, context);
      
      expect(SemanticValueTypes.isError(result)).toBe(true);
      expect((result as ErrorValue).getMessage()).toContain('not defined');
    });
  });
  
  describe('Percentage Expressions', () => {
    test('should evaluate "X% of Y" expressions', () => {
      const node = createMockExpressionNode('10% of 50');
      const context = createMockEvaluationContext();
      
      const result = service.evaluate(node, context);
      
      expect(result.getNumericValue()).toBe(5);
      expect(SemanticValueTypes.isNumber(result)).toBe(true);
    });
    
    test('should evaluate "X% on Y" expressions', () => {
      const node = createMockExpressionNode('10% on 50');
      const context = createMockEvaluationContext();
      
      const result = service.evaluate(node, context);
      
      expect(result.getNumericValue()).toBe(55);
      expect(SemanticValueTypes.isNumber(result)).toBe(true);
    });
    
    test('should evaluate "X% off Y" expressions', () => {
      const node = createMockExpressionNode('10% off 50');
      const context = createMockEvaluationContext();
      
      const result = service.evaluate(node, context);
      
      expect(result.getNumericValue()).toBe(45);
      expect(SemanticValueTypes.isNumber(result)).toBe(true);
    });
    
    test('should handle percentage expressions with variables', () => {
      const node = createMockExpressionNode('10% of price');
      const context = createMockEvaluationContext();
      
      const result = service.evaluate(node, context);
      
      expect(result.getNumericValue()).toBe(10);
      expect(SemanticValueTypes.isNumber(result)).toBe(true);
    });
  });
  
  describe('Lowering Process', () => {
    test('should call the percentage lowerer', () => {
      const node = createMockExpressionNode('10% of 50');
      const context = createMockEvaluationContext();
      
      service.evaluate(node, context);
      
      expect(PercentageLowerer.lower).toHaveBeenCalledWith(node, expect.any(Object));
    });
    
    test('should build scope from required variables', () => {
      const node = createMockExpressionNode('10% of price');
      const context = createMockEvaluationContext();
      
      service.evaluate(node, context);
      
      // The mock lowerer will return 'price' as a required variable
      // The service should include it in the scope passed to Math.js
      const mockEvaluate = service['mathEngine'].evaluate as jest.Mock;
      expect(mockEvaluate).toHaveBeenCalledWith(
        '((10/100) * price)',
        expect.objectContaining({ price: 100 })
      );
    });
  });
  
  describe('Error Handling', () => {
    test('should handle Math.js evaluation errors', () => {
      // Mock the Math.js engine to throw an error
      (service['mathEngine'].evaluate as jest.Mock).mockImplementationOnce(() => {
        return new ErrorValue('runtime', 'Division by zero');
      });
      
      const node = createMockExpressionNode('1 / 0');
      const context = createMockEvaluationContext();
      
      const result = service.evaluate(node, context);
      
      expect(SemanticValueTypes.isError(result)).toBe(true);
      expect((result as ErrorValue).getMessage()).toContain('Division by zero');
    });
    
    test('should handle lowering errors', () => {
      // Mock the lowerer to throw an error
      (PercentageLowerer.lower as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Invalid percentage expression');
      });
      
      const node = createMockExpressionNode('invalid% of 50');
      const context = createMockEvaluationContext();
      
      const result = service.evaluate(node, context);
      
      expect(SemanticValueTypes.isError(result)).toBe(true);
      expect((result as ErrorValue).getMessage()).toContain('Invalid percentage expression');
    });
  });
});
