/**
 * @file ErrorValue - Error representation in the semantic type system
 * @description Represents evaluation errors as first-class semantic values,
 * allowing proper error propagation and handling throughout the system
 * with rich context and type information.
 */

import { SemanticValue, SemanticValueType, DisplayOptions } from './SemanticValue';

export type ErrorType = 'parse' | 'syntax' | 'semantic' | 'runtime' | 'type' | 'conversion';

/**
 * Additional context for errors
 */
export interface ErrorContext {
  expression?: string;
  position?: { line: number; column: number };
  expectedType?: SemanticValueType;
  actualType?: SemanticValueType;
  suggestion?: string;
  cause?: Error | ErrorValue;
}

/**
 * Represents an error as a semantic value
 * This allows errors to propagate through the type system consistently
 * 
 * Examples:
 * - Parse error: "Invalid syntax in '100 ++ 50'"
 * - Type error: "Cannot add currency and percentage: $100 + 20%"
 * - Runtime error: "Division by zero in expression"
 */
export class ErrorValue extends SemanticValue {
  private readonly errorType: ErrorType;
  private readonly message: string;
  private readonly context: ErrorContext;

  constructor(errorType: ErrorType, message: string, context: ErrorContext = {}) {
    super();
    
    this.errorType = errorType;
    this.message = message || 'Unknown error';
    this.context = context;
  }

  getType(): SemanticValueType {
    return 'error';
  }

  getNumericValue(): number {
    // Errors don't have numeric values, but this is required by interface
    throw new Error('Cannot get numeric value from error');
  }

  /**
   * Get the error type
   */
  getErrorType(): ErrorType {
    return this.errorType;
  }

  /**
   * Get the error message
   */
  getMessage(): string {
    return this.message;
  }

  /**
   * Get error context
   */
  getContext(): ErrorContext {
    return this.context;
  }

  isNumeric(): boolean {
    return false;
  }

  canConvertTo(targetType: SemanticValueType): boolean {
    // Errors cannot be converted to other types
    return targetType === 'error';
  }

  toString(options?: DisplayOptions): string {
    if (options?.showType) {
      return `Error(${this.errorType}): ${this.message}`;
    }
    
    // Format with context if available
    let result = `⚠️ ${this.message}`;
    
    if (this.context.expression) {
      result += ` in "${this.context.expression}"`;
    }
    
    if (this.context.position) {
      result += ` at line ${this.context.position.line}`;
    }
    
    if (this.context.suggestion) {
      result += `\nSuggestion: ${this.context.suggestion}`;
    }
    
    return result;
  }

  equals(other: SemanticValue, tolerance?: number): boolean {
    if (other.getType() !== 'error') {
      return false;
    }
    
    const otherError = other as ErrorValue;
    return this.errorType === otherError.errorType && 
           this.message === otherError.message;
  }

  // All arithmetic operations on errors return errors
  add(other: SemanticValue): SemanticValue {
    return this.propagateError('add', other);
  }

  subtract(other: SemanticValue): SemanticValue {
    return this.propagateError('subtract', other);
  }

  multiply(other: SemanticValue): SemanticValue {
    return this.propagateError('multiply', other);
  }

  divide(other: SemanticValue): SemanticValue {
    return this.propagateError('divide', other);
  }

  power(exponent: number): SemanticValue {
    return new ErrorValue(
      'runtime',
      `Cannot raise error to power: ${this.message}`,
      { cause: this }
    );
  }

  clone(): ErrorValue {
    return new ErrorValue(this.errorType, this.message, { ...this.context });
  }

  /**
   * Propagate error through arithmetic operations
   */
  private propagateError(operation: string, other: SemanticValue): ErrorValue {
    if (other.getType() === 'error') {
      // Chain multiple errors
      const otherError = other as ErrorValue;
      return new ErrorValue(
        'runtime',
        `Multiple errors in ${operation}: ${this.message}; ${otherError.message}`,
        { cause: this }
      );
    }
    
    return new ErrorValue(
      'runtime',
      `Cannot ${operation} with error: ${this.message}`,
      { 
        ...this.context,
        actualType: other.getType(),
        cause: this
      }
    );
  }

  /**
   * Create a parse error
   */
  static parseError(message: string, expression?: string, position?: { line: number; column: number }): ErrorValue {
    return new ErrorValue('parse', message, { expression, position });
  }

  /**
   * Create a syntax error
   */
  static syntaxError(message: string, expression?: string, suggestion?: string): ErrorValue {
    return new ErrorValue('syntax', message, { expression, suggestion });
  }

  /**
   * Create a semantic error
   */
  static semanticError(message: string, context?: ErrorContext): ErrorValue {
    return new ErrorValue('semantic', message, context);
  }

  /**
   * Create a runtime error
   */
  static runtimeError(message: string, context?: ErrorContext): ErrorValue {
    return new ErrorValue('runtime', message, context);
  }

  /**
   * Create a type error
   */
  static typeError(message: string, expectedType?: SemanticValueType, actualType?: SemanticValueType, expression?: string): ErrorValue {
    return new ErrorValue('type', message, { 
      expectedType, 
      actualType, 
      expression,
      suggestion: expectedType ? `Expected ${expectedType} but got ${actualType}` : undefined
    });
  }

  /**
   * Create a conversion error
   */
  static conversionError(message: string, fromType?: SemanticValueType, toType?: SemanticValueType): ErrorValue {
    return new ErrorValue('conversion', message, {
      suggestion: fromType && toType ? `Cannot convert from ${fromType} to ${toType}` : undefined
    });
  }

  /**
   * Create error from JavaScript Error
   */
  static fromError(error: Error, errorType: ErrorType = 'runtime', context?: ErrorContext): ErrorValue {
    return new ErrorValue(errorType, error.message, { ...context, cause: error });
  }

  /**
   * Check if a value is an error
   */
  static isError(value: any): value is ErrorValue {
    return value instanceof ErrorValue;
  }

  /**
   * Create a chain of errors (for debugging)
   */
  chain(newMessage: string, newType?: ErrorType): ErrorValue {
    return new ErrorValue(
      newType || this.errorType,
      `${newMessage}: ${this.message}`,
      { ...this.context, cause: this }
    );
  }

  /**
   * Get the root cause of an error chain
   */
  getRootCause(): Error | ErrorValue | undefined {
    let cause = this.context.cause;
    
    while (cause instanceof ErrorValue && cause.context.cause) {
      cause = cause.context.cause;
    }
    
    return cause;
  }

  /**
   * Get a user-friendly error message
   */
  getUserMessage(): string {
    let message = this.message;
    
    // Add context information
    if (this.context.expectedType && this.context.actualType) {
      message += ` (expected ${this.context.expectedType}, got ${this.context.actualType})`;
    }
    
    if (this.context.suggestion) {
      message += `\n💡 ${this.context.suggestion}`;
    }
    
    return message;
  }

  /**
   * Get detailed error information for debugging
   */
  getDebugInfo(): Record<string, any> {
    const rootCause = this.getRootCause();
    
    return {
      type: this.errorType,
      message: this.message,
      context: this.context,
      rootCause: rootCause instanceof Error ? rootCause.message : 
                 rootCause instanceof ErrorValue ? rootCause.message : undefined,
      stack: rootCause instanceof Error ? rootCause.stack : undefined
    };
  }

  getMetadata(): Record<string, any> {
    return {
      type: this.getType(),
      errorType: this.errorType,
      message: this.message,
      context: this.context,
      isNumeric: false,
      userMessage: this.getUserMessage()
    };
  }
}