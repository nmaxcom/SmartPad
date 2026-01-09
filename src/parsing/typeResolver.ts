/**
 * @file Type Resolution for SmartPad Expressions
 * @description This module handles type resolution and validation for complex expressions.
 * It ensures type safety during parsing by validating operator compatibility and
 * determining result types before evaluation.
 */

import { ExpressionComponent } from './ast';
import { SemanticValue, SemanticValueType, ErrorValue } from '../types';
import { Variable } from '../state/types';

/**
 * Type resolution rules for binary operations
 */
interface TypeRule {
  leftType: SemanticValueType;
  rightType: SemanticValueType;
  operator: string;
  resultType: SemanticValueType;
}

/**
 * Type resolution rules for SmartPad operations
 */
const TYPE_RULES: TypeRule[] = [
  // Number operations
  { leftType: 'number', rightType: 'number', operator: '+', resultType: 'number' },
  { leftType: 'number', rightType: 'number', operator: '-', resultType: 'number' },
  { leftType: 'number', rightType: 'number', operator: '*', resultType: 'number' },
  { leftType: 'number', rightType: 'number', operator: '/', resultType: 'number' },
  { leftType: 'number', rightType: 'number', operator: '^', resultType: 'number' },

  // List operations
  { leftType: 'list', rightType: 'list', operator: '+', resultType: 'list' },
  { leftType: 'list', rightType: 'list', operator: '-', resultType: 'list' },
  { leftType: 'list', rightType: 'list', operator: '*', resultType: 'list' },
  { leftType: 'list', rightType: 'list', operator: '/', resultType: 'list' },
  { leftType: 'list', rightType: 'number', operator: '+', resultType: 'list' },
  { leftType: 'list', rightType: 'number', operator: '-', resultType: 'list' },
  { leftType: 'list', rightType: 'number', operator: '*', resultType: 'list' },
  { leftType: 'list', rightType: 'number', operator: '/', resultType: 'list' },
  { leftType: 'number', rightType: 'list', operator: '+', resultType: 'list' },
  { leftType: 'number', rightType: 'list', operator: '-', resultType: 'list' },
  { leftType: 'number', rightType: 'list', operator: '*', resultType: 'list' },
  { leftType: 'number', rightType: 'list', operator: '/', resultType: 'list' },
  { leftType: 'list', rightType: 'percentage', operator: '*', resultType: 'list' },
  { leftType: 'percentage', rightType: 'list', operator: '*', resultType: 'list' },
  { leftType: 'list', rightType: 'percentage', operator: '/', resultType: 'list' },

  // Currency operations
  { leftType: 'currency', rightType: 'currency', operator: '+', resultType: 'currency' },
  { leftType: 'currency', rightType: 'currency', operator: '-', resultType: 'currency' },
  { leftType: 'currency', rightType: 'number', operator: '*', resultType: 'currency' },
  { leftType: 'currency', rightType: 'number', operator: '/', resultType: 'currency' },
  { leftType: 'number', rightType: 'currency', operator: '*', resultType: 'currency' },
  { leftType: 'currency', rightType: 'unit', operator: '*', resultType: 'currencyUnit' },
  { leftType: 'currency', rightType: 'unit', operator: '/', resultType: 'currencyUnit' },

  // Percentage operations
  { leftType: 'percentage', rightType: 'percentage', operator: '+', resultType: 'percentage' },
  { leftType: 'percentage', rightType: 'percentage', operator: '-', resultType: 'percentage' },
  { leftType: 'percentage', rightType: 'number', operator: '*', resultType: 'percentage' },
  { leftType: 'percentage', rightType: 'number', operator: '/', resultType: 'percentage' },
  { leftType: 'number', rightType: 'percentage', operator: '*', resultType: 'number' },
  { leftType: 'number', rightType: 'percentage', operator: '+', resultType: 'number' },
  { leftType: 'number', rightType: 'percentage', operator: '-', resultType: 'number' },
  { leftType: 'percentage', rightType: 'currencyUnit', operator: '*', resultType: 'currencyUnit' },
  { leftType: 'currencyUnit', rightType: 'percentage', operator: '*', resultType: 'currencyUnit' },

  // Unit operations
  { leftType: 'unit', rightType: 'unit', operator: '+', resultType: 'unit' },
  { leftType: 'unit', rightType: 'unit', operator: '-', resultType: 'unit' },
  { leftType: 'unit', rightType: 'unit', operator: '*', resultType: 'unit' },
  { leftType: 'unit', rightType: 'unit', operator: '/', resultType: 'unit' },
  { leftType: 'unit', rightType: 'number', operator: '*', resultType: 'unit' },
  { leftType: 'unit', rightType: 'number', operator: '/', resultType: 'unit' },
  { leftType: 'number', rightType: 'unit', operator: '*', resultType: 'unit' },
  { leftType: 'number', rightType: 'unit', operator: '/', resultType: 'unit' },
  { leftType: 'unit', rightType: 'percentage', operator: '*', resultType: 'unit' },
  { leftType: 'unit', rightType: 'percentage', operator: '/', resultType: 'unit' },
  { leftType: 'percentage', rightType: 'unit', operator: '*', resultType: 'unit' },
  { leftType: 'unit', rightType: 'currency', operator: '*', resultType: 'currencyUnit' },

  // Currency-unit operations
  { leftType: 'currencyUnit', rightType: 'currencyUnit', operator: '+', resultType: 'currencyUnit' },
  { leftType: 'currencyUnit', rightType: 'currencyUnit', operator: '-', resultType: 'currencyUnit' },
  { leftType: 'currencyUnit', rightType: 'number', operator: '*', resultType: 'currencyUnit' },
  { leftType: 'currencyUnit', rightType: 'number', operator: '/', resultType: 'currencyUnit' },
  { leftType: 'number', rightType: 'currencyUnit', operator: '*', resultType: 'currencyUnit' },
  { leftType: 'currencyUnit', rightType: 'unit', operator: '*', resultType: 'currencyUnit' },
  { leftType: 'currencyUnit', rightType: 'unit', operator: '/', resultType: 'currencyUnit' },
  { leftType: 'unit', rightType: 'currencyUnit', operator: '*', resultType: 'currencyUnit' },
];

/**
 * Resolves the type of a complex expression by analyzing its component tree
 * @param components The expression component tree
 * @param variables Current variable context for type lookup
 * @returns The resolved type or an error
 */
export function resolveExpressionType(
  components: ExpressionComponent[],
  variables: Map<string, Variable>
): SemanticValueType | ErrorValue {
  if (components.length === 0) {
    return ErrorValue.semanticError('Empty expression', { expression: 'Type Resolution' });
  }

  if (components.length === 1) {
    return resolveComponentType(components[0], variables);
  }

  // For multiple components, build the type tree
  return resolveOperationTypes(components, variables);
}

/**
 * Resolves the type of a single expression component
 */
function resolveComponentType(
  component: ExpressionComponent,
  variables: Map<string, Variable>
): SemanticValueType | ErrorValue {
  switch (component.type) {
    case 'literal':
      return component.parsedValue?.getType() || 'number';

    case 'variable':
      const variable = variables.get(component.value);
      if (!variable?.value) {
        return 'number';
      }
      if (variable.value.getType() === 'symbolic') {
        return 'number';
      }
      return variable.value.getType();

    case 'operator':
      return ErrorValue.semanticError('Cannot resolve type of standalone operator', { expression: 'Type Resolution' });

    case 'function':
      if (component.value === "__rangeLiteral") {
        return 'list';
      }
      // Functions always return numbers for now
      return 'number';

    case 'parentheses':
      if (!component.children?.length) {
        return ErrorValue.semanticError('Empty parentheses', { expression: 'Type Resolution' });
      }
      return resolveExpressionType(component.children, variables);

    case 'listAccess':
      if (!component.access) {
        return ErrorValue.semanticError('Invalid list access', { expression: 'Type Resolution' });
      }
      return component.access.kind === 'index' ? 'number' : 'list';

    default:
      return ErrorValue.semanticError(`Unknown component type: ${component.type}`, { expression: 'Type Resolution' });
  }
}

/**
 * Resolves types for a sequence of operations
 */
function resolveOperationTypes(
  components: ExpressionComponent[],
  variables: Map<string, Variable>
): SemanticValueType | ErrorValue {
  // Handle operator precedence
  const operatorStack: string[] = [];
  const outputQueue: (string | SemanticValueType)[] = [];

  // Operator precedence map (unary operators are treated with higher precedence)
  const precedence: Record<string, number> = {
    'u+': 4,
    'u-': 4,
    '^': 3,
    '*': 2,
    '/': 2,
    '+': 1,
    '-': 1,
  };
  const unaryOperators = new Set(['+', '-']);
  let prevWasValue = false;

  // First pass: Convert to postfix notation while resolving types
  for (const component of components) {
    if (component.type === 'operator') {
      const isUnary = unaryOperators.has(component.value) && !prevWasValue;
      const opValue = isUnary ? `u${component.value}` : component.value;

      while (
        operatorStack.length > 0 &&
        precedence[operatorStack[operatorStack.length - 1]] >= precedence[opValue]
      ) {
        outputQueue.push(operatorStack.pop()!);
      }
      operatorStack.push(opValue);
      prevWasValue = false;
      continue;
    }

    const type = resolveComponentType(component, variables);
    if (type instanceof ErrorValue) {
      return type;
    }
    outputQueue.push(type);
    prevWasValue = true;
  }

  // Push remaining operators
  while (operatorStack.length > 0) {
    outputQueue.push(operatorStack.pop()!);
  }

  // Second pass: Evaluate types using the type rules
  const typeStack: SemanticValueType[] = [];

  for (const item of outputQueue) {
    if (typeof item === 'string' && precedence[item] !== undefined) {
      // It's an operator
      if (item === 'u+' || item === 'u-') {
        if (typeStack.length < 1) {
          return ErrorValue.semanticError('Invalid expression', { expression: 'Type Resolution' });
        }
        const operandType = typeStack.pop()!;
        typeStack.push(operandType);
        continue;
      }

      if (typeStack.length < 2) {
        return ErrorValue.semanticError('Invalid expression', { expression: 'Type Resolution' });
      }

      const rightType = typeStack.pop()!;
      const leftType = typeStack.pop()!;

      // Find matching type rule
      const rule = TYPE_RULES.find(
        r => r.leftType === leftType && r.rightType === rightType && r.operator === item
      );

      if (!rule) {
        return ErrorValue.semanticError(
          `Cannot ${item} ${leftType} and ${rightType}`,
          { expression: 'Type Resolution' }
        );
      }

      typeStack.push(rule.resultType);
    } else if (typeof item === 'string') {
      // It's a type
      typeStack.push(item as SemanticValueType);
    }
  }

  if (typeStack.length !== 1) {
    return ErrorValue.semanticError('Invalid expression', { expression: 'Type Resolution' });
  }

  return typeStack[0];
}

/**
 * Validates that an expression's components are type-compatible
 * @returns An error if types are incompatible, undefined if valid
 */
export function validateExpressionTypes(
  components: ExpressionComponent[],
  variables: Map<string, Variable>,
  expectedType?: SemanticValueType,
  options: { allowUnknownVariables?: boolean } = {}
): ErrorValue | undefined {
  if (options.allowUnknownVariables) {
    const hasUnknown = (items: ExpressionComponent[]): boolean =>
      items.some((component) => {
        if (component.type === "variable") {
          return !variables.has(component.value);
        }
        if (component.type === "parentheses" && component.children) {
          return hasUnknown(component.children);
        }
        if (component.type === "function" && component.args) {
          return component.args.some((arg) => hasUnknown(arg.components));
        }
        return false;
      });

    if (hasUnknown(components)) {
      return undefined;
    }
  }

  const resultType = resolveExpressionType(components, variables);

  if (resultType instanceof ErrorValue) {
    if (
      options.allowUnknownVariables &&
      resultType.getMessage().startsWith("Undefined variable:")
    ) {
      return undefined;
    }
    return resultType;
  }

  if (expectedType && resultType !== expectedType) {
    return ErrorValue.typeError(
      `Expression evaluates to wrong type`,
      expectedType,
      resultType,
      'Type Validation'
    );
  }

  return undefined;
}
