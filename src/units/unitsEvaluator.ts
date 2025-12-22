/**
 * Units-Aware Math Evaluator for SmartPad
 *
 * Extends the existing math evaluator to handle quantities with units,
 * performing dimensional analysis and unit conversions.
 */

import { TokenType, Token } from "../parsing/mathEvaluator";
import { Quantity, CompositeUnit, UnitParser } from "./quantity";
import { defaultUnitRegistry } from "./definitions";

/**
 * Enhanced token types for units
 */
export enum UnitsTokenType {
  // Existing token types
  NUMBER = "NUMBER",
  OPERATOR = "OPERATOR",
  FUNCTION = "FUNCTION",
  IDENTIFIER = "IDENTIFIER",
  LEFT_PAREN = "LEFT_PAREN",
  RIGHT_PAREN = "RIGHT_PAREN",
  COMMA = "COMMA",
  EOF = "EOF",

  // New token types for units
  UNIT = "UNIT", // "m", "kg", "km/h"
  QUANTITY = "QUANTITY", // "10 m", "5.5 kg"
}

export interface UnitsToken {
  type: UnitsTokenType;
  value: string;
  position: number;
  quantity?: Quantity; // For QUANTITY tokens
}

/**
 * Result of units-aware mathematical evaluation
 */
export interface UnitsResult {
  quantity: Quantity;
  error?: string;
}

/**
 * Replace phrase-based variable names in an expression with safe aliases
 * and remap the provided variables object accordingly.
 * This ensures parsers treat multi-word names as single identifiers reliably.
 */
export function aliasVariablesInExpression(
  expression: string,
  variables: Record<string, Quantity>
): { expression: string; variables: Record<string, Quantity> } {
  const names = Object.keys(variables).sort((a, b) => b.length - a.length);
  if (names.length === 0) return { expression, variables };

  let aliasedExpr = expression;
  const aliasedVars: Record<string, Quantity> = {};
  const nameToAlias = new Map<string, string>();

  const isBoundary = (ch: string | undefined) => {
    if (!ch) return true;
    return /[\s+\-*/^%()=<>!,]/.test(ch);
  };

  names.forEach((name, idx) => {
    const alias = `__v${idx}__`;
    nameToAlias.set(name, alias);

    // Replace all occurrences with boundary checks
    let result = "";
    let i = 0;
    while (i < aliasedExpr.length) {
      const j = aliasedExpr.indexOf(name, i);
      if (j === -1) {
        result += aliasedExpr.substring(i);
        break;
      }
      const before = j > 0 ? aliasedExpr[j - 1] : undefined;
      const after = aliasedExpr[j + name.length];
      if (isBoundary(before) && isBoundary(after)) {
        result += aliasedExpr.substring(i, j) + alias;
        i = j + name.length;
      } else {
        result += aliasedExpr.substring(i, j + 1);
        i = j + 1;
      }
    }
    aliasedExpr = result;
  });

  // Build aliased variables map
  for (const [name, qty] of Object.entries(variables)) {
    const alias = nameToAlias.get(name) || name;
    aliasedVars[alias] = qty;
  }

  return { expression: aliasedExpr, variables: aliasedVars };
}

/**
 * Enhanced tokenizer that recognizes units
 */
export function tokenizeWithUnits(expression: string): UnitsToken[] {
  const tokens: UnitsToken[] = [];
  let position = 0;

  const skipWhitespace = () => {
    while (position < expression.length && /\s/.test(expression[position])) {
      position++;
    }
  };

  while (position < expression.length) {
    skipWhitespace();

    if (position >= expression.length) break;

    const char = expression[position];

    // Numbers (including decimals) - look ahead for units
    if (/\d/.test(char) || char === ".") {
      let numberStr = "";
      const numberStart = position;

      while (
        position < expression.length &&
        (/\d/.test(expression[position]) || expression[position] === ".")
      ) {
        numberStr += expression[position];
        position++;
      }

      // Skip whitespace after number
      skipWhitespace();

      // Look for unit after the number
      let unitStr = "";
      const unitStart = position;

      // Check for unit patterns like "m", "km/h", "°C", "m/s^2", etc.
      if (position < expression.length && /[a-zA-Z°]/.test(expression[position])) {
        while (position < expression.length && /[a-zA-Z0-9°\/\^\-\*]/.test(expression[position])) {
          unitStr += expression[position];
          position++;
        }

        // Check if this is a valid unit or unit combination
        try {
          const unit = UnitParser.parse(unitStr);
          const value = parseFloat(numberStr);
          const quantity = new Quantity(value, unit);

          tokens.push({
            type: UnitsTokenType.QUANTITY,
            value: `${numberStr} ${unitStr}`,
            position: numberStart,
            quantity,
          });
          continue;
        } catch (error) {
          // Not a valid unit, backtrack
          position = unitStart;
        }
      }

      // No valid unit found, treat as regular number
      tokens.push({
        type: UnitsTokenType.NUMBER,
        value: numberStr,
        position: numberStart,
      });
      continue;
    }

    // Operators
    if (/[+\-*/%^]/.test(char)) {
      tokens.push({
        type: UnitsTokenType.OPERATOR,
        value: char,
        position,
      });
      position++;
      continue;
    }

    // Parentheses
    if (char === "(") {
      tokens.push({
        type: UnitsTokenType.LEFT_PAREN,
        value: char,
        position,
      });
      position++;
      continue;
    }

    if (char === ")") {
      tokens.push({
        type: UnitsTokenType.RIGHT_PAREN,
        value: char,
        position,
      });
      position++;
      continue;
    }

    // Comma
    if (char === ",") {
      tokens.push({
        type: UnitsTokenType.COMMA,
        value: char,
        position,
      });
      position++;
      continue;
    }

    // Functions and identifiers (variables)
    if (/[a-zA-Z_]/.test(char)) {
      let identifier = "";
      while (position < expression.length && /[a-zA-Z0-9_\s]/.test(expression[position])) {
        identifier += expression[position];
        position++;
      }

      // Trim trailing spaces from identifier
      identifier = identifier.trim();

      // Check if it's a function
      const nextChar = position < expression.length ? expression[position] : "";
      if (nextChar === "(") {
        tokens.push({
          type: UnitsTokenType.FUNCTION,
          value: identifier,
          position,
        });
      } else {
        tokens.push({
          type: UnitsTokenType.IDENTIFIER,
          value: identifier,
          position,
        });
      }
      continue;
    }

    // Unknown character - skip for now
    position++;
  }

  tokens.push({
    type: UnitsTokenType.EOF,
    value: "",
    position,
  });

  return tokens;
}

/**
 * Units-aware mathematical parser
 */
export class UnitsParser {
  private tokens: UnitsToken[];
  private current: number;
  private variables: Record<string, Quantity>;

  constructor(tokens: UnitsToken[], variables: Record<string, Quantity> = {}) {
    this.tokens = tokens;
    this.current = 0;
    this.variables = variables;
  }

  /**
   * Main parsing entry point
   */
  parse(): Quantity {
    const result = this.parseExpression();
    if (this.currentToken().type !== UnitsTokenType.EOF) {
      throw new Error("Unexpected token after expression");
    }
    return result;
  }

  private currentToken(): UnitsToken {
    return this.tokens[this.current] || { type: UnitsTokenType.EOF, value: "", position: 0 };
  }

  private consume(expectedType?: UnitsTokenType): UnitsToken {
    const token = this.currentToken();
    if (expectedType && token.type !== expectedType) {
      throw new Error(`Expected ${expectedType}, got ${token.type}`);
    }
    this.current++;
    return token;
  }

  /**
   * Expression := Term (('+' | '-') Term)*
   */
  private parseExpression(): Quantity {
    let left = this.parseTerm();

    while (
      this.currentToken().type === UnitsTokenType.OPERATOR &&
      (this.currentToken().value === "+" || this.currentToken().value === "-")
    ) {
      const operator = this.consume().value;
      const right = this.parseTerm();

      if (operator === "+") {
        left = left.add(right);
      } else {
        left = left.subtract(right);
      }
    }

    return left;
  }

  /**
   * Term := Factor (('*' | '/' | '%') Factor)*
   */
  private parseTerm(): Quantity {
    let left = this.parseFactor();

    while (
      this.currentToken().type === UnitsTokenType.OPERATOR &&
      (this.currentToken().value === "*" ||
        this.currentToken().value === "/" ||
        this.currentToken().value === "%")
    ) {
      const operator = this.consume().value;
      const right = this.parseFactor();

      if (operator === "*") {
        left = left.multiply(right);
      } else if (operator === "/") {
        left = left.divide(right);
      } else if (operator === "%") {
        // Modulo with units doesn't make physical sense in most cases
        // But we'll allow it for dimensionless quantities
        if (!left.isDimensionless() || !right.isDimensionless()) {
          throw new Error("Modulo operation requires dimensionless quantities");
        }
        const leftValue = left.value;
        const rightValue = right.value;
        if (rightValue === 0) {
          throw new Error("Division by zero in modulo operation");
        }
        left = Quantity.dimensionless(leftValue % rightValue);
      }
    }

    return left;
  }

  /**
   * Factor := Power ('^' Power)*
   */
  private parseFactor(): Quantity {
    let left = this.parsePower();

    while (
      this.currentToken().type === UnitsTokenType.OPERATOR &&
      this.currentToken().value === "^"
    ) {
      this.consume(); // consume '^'
      const exponent = this.parsePower();

      // Exponent must be dimensionless
      if (!exponent.isDimensionless()) {
        throw new Error("Exponent must be dimensionless");
      }

      left = left.power(exponent.value);
    }

    return left;
  }

  /**
   * Power := Primary
   */
  private parsePower(): Quantity {
    return this.parsePrimary();
  }

  /**
   * Primary := QUANTITY | NUMBER | FUNCTION '(' ArgumentList ')' | IDENTIFIER | '(' Expression ')' | '-' Primary
   */
  private parsePrimary(): Quantity {
    const token = this.currentToken();

    // Handle unary minus
    if (token.type === UnitsTokenType.OPERATOR && token.value === "-") {
      this.consume(); // consume '-'
      const operand = this.parsePrimary();
      return new Quantity(-operand.value, operand.unit);
    }

    // Quantities (numbers with units)
    if (token.type === UnitsTokenType.QUANTITY && token.quantity) {
      this.consume();
      return token.quantity;
    }

    // Numbers (dimensionless quantities)
    if (token.type === UnitsTokenType.NUMBER) {
      this.consume();
      const value = parseFloat(token.value);
      if (isNaN(value)) {
        throw new Error(`Invalid number: ${token.value}`);
      }
      return Quantity.dimensionless(value);
    }

    // Functions
    if (token.type === UnitsTokenType.FUNCTION) {
      const functionName = this.consume().value;
      this.consume(UnitsTokenType.LEFT_PAREN);

      const args: Quantity[] = [];

      // Parse arguments
      if (this.currentToken().type !== UnitsTokenType.RIGHT_PAREN) {
        args.push(this.parseExpression());

        while (this.currentToken().type === UnitsTokenType.COMMA) {
          this.consume(); // consume comma
          args.push(this.parseExpression());
        }
      }

      this.consume(UnitsTokenType.RIGHT_PAREN);

      return this.evaluateFunction(functionName, args);
    }

    // Identifiers (variables)
    if (token.type === UnitsTokenType.IDENTIFIER) {
      const variableName = token.value;
      this.consume();

      if (variableName in this.variables) {
        return this.variables[variableName];
      } else {
        throw new Error(`Undefined variable: ${variableName}`);
      }
    }

    // Parenthesized expressions
    if (token.type === UnitsTokenType.LEFT_PAREN) {
      this.consume();
      const result = this.parseExpression();
      this.consume(UnitsTokenType.RIGHT_PAREN);
      return result;
    }

    throw new Error(`Unexpected token: ${token.value}`);
  }

  /**
   * Evaluate mathematical functions with units
   */
  private evaluateFunction(name: string, args: Quantity[]): Quantity {
    const lowerName = name.toLowerCase();

    switch (lowerName) {
      case "sqrt":
        if (args.length !== 1) {
          throw new Error(`sqrt expects 1 argument, got ${args.length}`);
        }
        // sqrt can only be applied to quantities where all dimensions are even
        // For simplicity, we'll only allow dimensionless quantities for now
        if (!args[0].isDimensionless()) {
          throw new Error("sqrt can only be applied to dimensionless quantities");
        }
        if (args[0].value < 0) {
          throw new Error("Square root of negative number");
        }
        return Quantity.dimensionless(Math.sqrt(args[0].value));

      case "abs":
        if (args.length !== 1) {
          throw new Error(`abs expects 1 argument, got ${args.length}`);
        }
        return new Quantity(Math.abs(args[0].value), args[0].unit);

      case "round":
        if (args.length !== 1) {
          throw new Error(`round expects 1 argument, got ${args.length}`);
        }
        return new Quantity(Math.round(args[0].value), args[0].unit);

      case "floor":
        if (args.length !== 1) {
          throw new Error(`floor expects 1 argument, got ${args.length}`);
        }
        return new Quantity(Math.floor(args[0].value), args[0].unit);

      case "ceil":
        if (args.length !== 1) {
          throw new Error(`ceil expects 1 argument, got ${args.length}`);
        }
        return new Quantity(Math.ceil(args[0].value), args[0].unit);

      default:
        throw new Error(`Unknown function: ${name}`);
    }
  }
}

/**
 * Main evaluation function for units-aware expressions
 */
export function evaluateUnitsExpression(
  expression: string,
  variables: Record<string, Quantity> = {}
): UnitsResult {
  try {
    // Normalize phrase variables into aliases for robust parsing
    const { expression: aliasedExpr, variables: aliasedVars } = aliasVariablesInExpression(
      expression,
      variables
    );
    const tokens = tokenizeWithUnits(aliasedExpr);
    const parser = new UnitsParser(tokens, aliasedVars);
    const quantity = parser.parse();

    return { quantity };
  } catch (error) {
    return {
      quantity: Quantity.dimensionless(0),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if an expression contains units
 */
export function expressionContainsUnits(expression: string): boolean {
  try {
    const tokens = tokenizeWithUnits(expression);

    // Check for literal units (quantities like "5 kg")
    const hasLiteralUnits = tokens.some((token) => token.type === UnitsTokenType.QUANTITY);

    // Check for variables that might have units
    const hasVariables = tokens.some((token) => token.type === UnitsTokenType.IDENTIFIER);

    // If expression contains variables, it should be handled by units evaluator
    // since variables might have units that need to be considered
    const shouldUseUnitsEvaluator = hasLiteralUnits || hasVariables;

    return shouldUseUnitsEvaluator;
  } catch (error) {
    return false;
  }
}
