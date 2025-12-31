/**
 * UnitsNet.js Evaluator for SmartPad
 *
 * This module provides a complete units-aware mathematical evaluator
 * using unitsnet-js for all calculations and unit conversions.
 */

import {
  SmartPadQuantity,
  UnitsNetParser as UnitsNetAdapterParser,
  UnitsNetMathEvaluator,
  MATHEMATICAL_CONSTANTS,
} from "./unitsnetAdapter";
import { UnitValue, NumberValue } from "../types";

/**
 * Enhanced token types for units
 */
export enum UnitsNetTokenType {
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
  CONSTANT = "CONSTANT", // "PI", "E"
  TO = "TO", // "to" conversion keyword
}

export interface UnitsNetToken {
  type: UnitsNetTokenType;
  value: string;
  position: number;
  quantity?: UnitValue; // For QUANTITY tokens
  constant?: NumberValue; // For CONSTANT tokens
}

/**
 * Result of units-aware mathematical evaluation
 */
export interface UnitsNetResult {
  value: UnitValue | NumberValue;
  error?: string;
}

/**
 * Create letter-only aliases for phrase-based variables and rewrite the expression.
 * Aliases use only lowercase letters and underscores so they tokenize as IDENTIFIERs
 * in the UnitsNet tokenizer (which accepts /[a-z_]+/ for identifiers/functions).
 */
function aliasVariablesInExpression(
  expression: string,
  variables: Record<string, UnitValue | NumberValue>
): { expression: string; variables: Record<string, UnitValue | NumberValue> } {
  // Normalize internal whitespace to single spaces so matches are reliable
  let expr = expression.replace(/\s+/g, " ").trim();

  const names = Object.keys(variables).sort((a, b) => b.length - a.length);
  if (names.length === 0) return { expression: expr, variables };

  const nameToAlias = new Map<string, string>();
  const aliasedVars: Record<string, UnitValue | NumberValue> = {};

  // Generate stable letter-only aliases: v, va, vb, ..., vz, vaa, vab, ...
  const toAlias = (index: number): string => {
    let n = index;
    let s = "";
    do {
      s = String.fromCharCode("a".charCodeAt(0) + (n % 26)) + s;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return `v${s}`; // e.g., va, vb, ..., vaa
  };

  const isBoundary = (ch: string | undefined) => {
    if (!ch) return true;
    return /[\s+\-*/^%()=<>!,]/.test(ch);
  };

  names.forEach((name, idx) => {
    const alias = toAlias(idx);
    nameToAlias.set(name, alias);

    // Replace occurrences with boundary checks
    let out = "";
    let i = 0;
    while (i < expr.length) {
      const j = expr.indexOf(name, i);
      if (j === -1) {
        out += expr.substring(i);
        break;
      }
      const before = j > 0 ? expr[j - 1] : undefined;
      const after = expr[j + name.length];
      if (isBoundary(before) && isBoundary(after)) {
        out += expr.substring(i, j) + alias;
        i = j + name.length;
      } else {
        out += expr.substring(i, j + 1);
        i = j + 1;
      }
    }
    expr = out;
  });

  // Build aliased variables map
  for (const [name, qty] of Object.entries(variables)) {
    const alias = nameToAlias.get(name) || name;
    aliasedVars[alias] = qty;
  }

  return { expression: expr, variables: aliasedVars };
}

/**
 * Enhanced tokenizer that recognizes units and constants
 */
export function tokenizeWithUnitsNet(expression: string): UnitsNetToken[] {
  const tokens: UnitsNetToken[] = [];
  let position = 0;
  const unitStartRe = /[a-zA-Z°µμΩ]/;
  const unitBodyRe = /[a-zA-Z0-9°µμΩ\/\^\-\*\·]/;

  const skipWhitespace = () => {
    while (position < expression.length && /\s/.test(expression[position])) {
      position++;
    }
  };

  while (position < expression.length) {
    skipWhitespace();

    if (position >= expression.length) break;

    const char = expression[position];

    // Numbers (including decimals and scientific notation) - look ahead for units
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
      if (position < expression.length && (expression[position] === "e" || expression[position] === "E")) {
        const nextChar = expression[position + 1];
        const nextNextChar = expression[position + 2];
        if (
          /\d/.test(nextChar) ||
          ((nextChar === "+" || nextChar === "-") && /\d/.test(nextNextChar))
        ) {
          numberStr += expression[position];
          position++;
          if (expression[position] === "+" || expression[position] === "-") {
            numberStr += expression[position];
            position++;
          }
          while (position < expression.length && /\d/.test(expression[position])) {
            numberStr += expression[position];
            position++;
          }
        }
      }

      // Skip whitespace after number
      skipWhitespace();

      // Look for unit after the number
      let unitStr = "";
      const unitStart = position;

      // Check for unit patterns like "m", "km/h", "°C", "m/s^2", "N*m", etc.
      if (position < expression.length && unitStartRe.test(expression[position])) {
        while (
          position < expression.length &&
          unitBodyRe.test(expression[position])
        ) {
          unitStr += expression[position];
          position++;
        }

        // Check if this is a valid unit or unit combination
        try {
          const value = parseFloat(numberStr);
          const quantity = new UnitValue(SmartPadQuantity.fromValueAndUnit(value, unitStr));
          tokens.push({
            type: UnitsNetTokenType.QUANTITY,
            value: `${numberStr} ${unitStr}`,
            position: numberStart,
            quantity,
          });
        } catch (error) {
          // Unit parsing failed, treat as regular number
          tokens.push({
            type: UnitsNetTokenType.NUMBER,
            value: numberStr,
            position: numberStart,
          });
          // Reset position to try parsing the unit part as identifier
          position = unitStart;
        }
      } else {
        // No unit found, treat as regular number
        tokens.push({
          type: UnitsNetTokenType.NUMBER,
          value: numberStr,
          position: numberStart,
        });
      }
    }
    // Constants (PI, E)
    else if (/[A-Z]/.test(char)) {
      let constantStr = "";
      const constantStart = position;

      while (position < expression.length && /[A-Z_]/.test(expression[position])) {
        constantStr += expression[position];
        position++;
      }

      if (constantStr in MATHEMATICAL_CONSTANTS) {
        tokens.push({
          type: UnitsNetTokenType.CONSTANT,
          value: constantStr,
          position: constantStart,
          constant: new NumberValue(MATHEMATICAL_CONSTANTS[constantStr as keyof typeof MATHEMATICAL_CONSTANTS]),
        });
      } else {
        // Not a constant, treat as identifier
        tokens.push({
          type: UnitsNetTokenType.IDENTIFIER,
          value: constantStr,
          position: constantStart,
        });
      }
    }
    // Functions and keywords (sin, cos, sqrt, to, etc.)
    else if (/[a-z]/.test(char)) {
      let funcStr = "";
      const funcStart = position;

      while (position < expression.length && /[a-z_]/.test(expression[position])) {
        funcStr += expression[position];
        position++;
      }

      // Check if this is the "to" conversion keyword or a unit shorthand (e.g., 'h')
      if (funcStr === "to") {
        tokens.push({
          type: UnitsNetTokenType.TO,
          value: funcStr,
          position: funcStart,
        });
      } else if (
        funcStr === "h" ||
        funcStr === "min" ||
        funcStr === "day" ||
        funcStr === "kph" ||
        funcStr === "mph"
      ) {
        // Treat these as identifiers to be picked up by unit parsing after numbers, not as functions
        tokens.push({
          type: UnitsNetTokenType.IDENTIFIER,
          value: funcStr,
          position: funcStart,
        });
      }
      // Check if this is a known function
      else {
        const knownFunctions = [
          "sin",
          "cos",
          "tan",
          "asin",
          "acos",
          "atan",
          "sqrt",
          "pow",
          "abs",
          "round",
          "floor",
          "ceil",
          "max",
          "min",
          "log",
          "ln",
          "exp",
        ];

        if (knownFunctions.includes(funcStr)) {
          tokens.push({
            type: UnitsNetTokenType.FUNCTION,
            value: funcStr,
            position: funcStart,
          });
        } else {
          // Not a function, treat as identifier
          tokens.push({
            type: UnitsNetTokenType.IDENTIFIER,
            value: funcStr,
            position: funcStart,
          });
        }
      }
    }
    // Operators
    else if (["+", "-", "*", "/", "^", "="].includes(char)) {
      tokens.push({
        type: UnitsNetTokenType.OPERATOR,
        value: char,
        position: position++,
      });
    }
    // Parentheses
    else if (char === "(") {
      tokens.push({
        type: UnitsNetTokenType.LEFT_PAREN,
        value: char,
        position: position++,
      });
    } else if (char === ")") {
      tokens.push({
        type: UnitsNetTokenType.RIGHT_PAREN,
        value: char,
        position: position++,
      });
    }
    // Comma
    else if (char === ",") {
      tokens.push({
        type: UnitsNetTokenType.COMMA,
        value: char,
        position: position++,
      });
    }
    // Unknown character
    else {
      position++;
    }
  }

  // Add EOF token
  tokens.push({
    type: UnitsNetTokenType.EOF,
    value: "",
    position: expression.length,
  });

  return tokens;
}

/**
 * Parser for units-aware expressions
 */
export class UnitsNetParser {
  private tokens: UnitsNetToken[];
  private current: number;
  private variables: Record<string, UnitValue | NumberValue>;

  constructor(tokens: UnitsNetToken[], variables: Record<string, UnitValue | NumberValue> = {}) {
    this.tokens = tokens;
    this.current = 0;
    this.variables = variables;
  }

  parse(): UnitValue | NumberValue {
    const result = this.parseExpression();

    if (this.currentToken().type !== UnitsNetTokenType.EOF) {
      throw new Error(`Unexpected token: ${this.currentToken().value}`);
    }

    return result;
  }

  private currentToken(): UnitsNetToken {
    return this.tokens[this.current];
  }

  private consume(expectedType?: UnitsNetTokenType): UnitsNetToken {
    const token = this.currentToken();

    if (expectedType && token.type !== expectedType) {
      throw new Error(`Expected ${expectedType}, got ${token.type}`);
    }

    this.current++;
    return token;
  }

  private parseExpression(): UnitValue | NumberValue {
    let left = this.parseTerm();

    // Handle unit conversions (e.g., "100 ft to m")
    if (this.currentToken().type === UnitsNetTokenType.TO) {
      this.consume(); // consume "to"
      // Build full unit string, supporting forms like km/h, m/s^2, etc.
      let unitStr = "";
      while (true) {
        const t = this.currentToken();
        if (
          t.type === UnitsNetTokenType.IDENTIFIER ||
          (t.type === UnitsNetTokenType.OPERATOR &&
            (t.value === "/" || t.value === "^" || t.value === "*")) ||
          t.type === UnitsNetTokenType.NUMBER
        ) {
          unitStr += t.value;
          this.consume();
          continue;
        }
        break;
      }
      unitStr = unitStr.trim();
      if (!unitStr) {
        throw new Error("Expected unit after 'to'");
      }
      if (left instanceof UnitValue) {
        return left.convertTo(unitStr);
      } else {
        throw new Error("Cannot convert non-unit value");
      }
    }

    while (
      this.currentToken().type === UnitsNetTokenType.OPERATOR &&
      ["+", "-"].includes(this.currentToken().value)
    ) {
      const operator = this.consume().value;
      const right = this.parseTerm();

      if (operator === "+") {
        const result = left.add(right);
        if (result instanceof UnitValue || result instanceof NumberValue) {
          left = result;
        } else {
          throw new Error("Invalid addition result type");
        }
      } else {
        const result = left.subtract(right);
        if (result instanceof UnitValue || result instanceof NumberValue) {
          left = result;
        } else {
          throw new Error("Invalid subtraction result type");
        }
      }
    }

    return left;
  }

  private parseTerm(): UnitValue | NumberValue {
    let left = this.parseFactor();

    while (
      this.currentToken().type === UnitsNetTokenType.OPERATOR &&
      ["*", "/"].includes(this.currentToken().value)
    ) {
      const operator = this.consume().value;
      const right = this.parseFactor();

      if (operator === "*") {
        const result = left.multiply(right);
        if (result instanceof UnitValue || result instanceof NumberValue) {
          left = result;
        } else {
          throw new Error("Invalid multiplication result type");
        }
      } else {
        const result = left.divide(right);
        if (result instanceof UnitValue || result instanceof NumberValue) {
          left = result;
        } else {
          throw new Error("Invalid division result type");
        }
      }
    }

    // Fallback: attach a trailing simple unit identifier to a preceding bare number (e.g., '1 h')
    // This covers cases where tokenizer didn't produce a QUANTITY token.
    while (this.currentToken().type === UnitsNetTokenType.IDENTIFIER && left instanceof NumberValue) {
      const unitId = this.consume().value;
      try {
        const quantity = SmartPadQuantity.fromValueAndUnit(left.getNumericValue(), unitId);
        left = new UnitValue(quantity);
      } catch {
        break;
      }
    }

    return left;
  }

  private parseFactor(): UnitValue | NumberValue {
    let base = this.parsePower();

    while (
      this.currentToken().type === UnitsNetTokenType.OPERATOR &&
      this.currentToken().value === "^"
    ) {
      this.consume(); // consume "^"
      const exponent = this.parsePower();

      if (!(exponent instanceof NumberValue)) {
        throw new Error("Exponent must be a number");
      }

      const result = base.power(exponent.getNumericValue());
      if (result instanceof UnitValue || result instanceof NumberValue) {
        base = result;
      } else {
        throw new Error("Invalid power result type");
      }
    }

    return base;
  }

  private parsePower(): UnitValue | NumberValue {
    let value = this.parseUnary();
    // Attach simple time units after bare numbers (e.g., '1 h')
    if (value instanceof NumberValue) {
      const t = this.currentToken();
      if (
        t.type === UnitsNetTokenType.IDENTIFIER &&
        (t.value === "h" || t.value === "min" || t.value === "day")
      ) {
        this.consume();
        try {
          const quantity = SmartPadQuantity.fromValueAndUnit(value.getNumericValue(), t.value);
          value = new UnitValue(quantity);
        } catch {}
      }
    }
    return value;
  }

  private parseUnary(): UnitValue | NumberValue {
    if (
      this.currentToken().type === UnitsNetTokenType.OPERATOR &&
      (this.currentToken().value === "+" || this.currentToken().value === "-")
    ) {
      const operator = this.consume().value;
      const operand = this.parseUnary();
      if (operator === "+") {
        return operand;
      }

      if (operand instanceof NumberValue) {
        return new NumberValue(-operand.getNumericValue());
      }

      const negated = operand.multiply(new NumberValue(-1));
      if (negated instanceof UnitValue || negated instanceof NumberValue) {
        return negated;
      }
      throw new Error("Invalid unary result type");
    }

    return this.parsePrimary();
  }

  private parsePrimary(): UnitValue | NumberValue {
    const token = this.currentToken();

    switch (token.type) {
      case UnitsNetTokenType.NUMBER:
        this.consume();
        return new NumberValue(parseFloat(token.value));

      case UnitsNetTokenType.QUANTITY:
        this.consume();
        return token.quantity!;

      case UnitsNetTokenType.CONSTANT:
        this.consume();
        return token.constant!;

      case UnitsNetTokenType.IDENTIFIER:
        const identifier = this.consume().value;

        // Check if it's a variable
        if (identifier in this.variables) {
          return this.variables[identifier];
        }

        throw new Error(`Undefined variable: ${identifier}`);

      case UnitsNetTokenType.FUNCTION:
        return this.parseFunctionCall();

      case UnitsNetTokenType.LEFT_PAREN:
        this.consume(); // consume "("
        const result = this.parseExpression();
        this.consume(UnitsNetTokenType.RIGHT_PAREN); // consume ")"
        return result;

      default:
        throw new Error(`Unexpected token: ${token.value}`);
    }
  }

  private parseFunctionCall(): UnitValue | NumberValue {
    const functionName = this.consume(UnitsNetTokenType.FUNCTION).value;
    this.consume(UnitsNetTokenType.LEFT_PAREN); // consume "("

    const args: (UnitValue | NumberValue)[] = [];

    if (this.currentToken().type !== UnitsNetTokenType.RIGHT_PAREN) {
      do {
        args.push(this.parseExpression());
      } while (this.currentToken().type === UnitsNetTokenType.COMMA && this.consume());
    }

    this.consume(UnitsNetTokenType.RIGHT_PAREN); // consume ")"

    // Convert semantic values to SmartPadQuantity for function evaluation
    const smartPadArgs = args.map(arg => {
      if (arg instanceof UnitValue) {
        return arg.getQuantity();
      } else {
        return SmartPadQuantity.dimensionless(arg.getNumericValue());
      }
    });

    const result = UnitsNetMathEvaluator.evaluateFunction(functionName, smartPadArgs);
    return result.isDimensionless() ? new NumberValue(result.value) : new UnitValue(result);
  }
}

/**
 * Evaluate a units-aware expression
 */
export function evaluateUnitsNetExpression(
  expression: string,
  variables: Record<string, UnitValue | NumberValue> = {}
): UnitsNetResult {
  try {
    // Alias phrase variables to letter-only identifiers that the tokenizer accepts
    const { expression: aliasedExpr, variables: aliasedVars } = aliasVariablesInExpression(
      expression,
      variables
    );

    // Rewrite simple time literals like '1 h' into seconds to avoid tokenizer edge cases
    const rewriteSimpleTimeQuantities = (expr: string): string => {
      return expr.replace(/(\d+(?:\.\d+)?)\s*(h|min|day)\b/g, (_m, num, unit) => {
        const v = parseFloat(num);
        const seconds = unit === "h" ? v * 3600 : unit === "min" ? v * 60 : v * 86400;
        return `${seconds} s`;
      });
    };

    const aliasedExprRewritten = rewriteSimpleTimeQuantities(aliasedExpr);

    const tokens = tokenizeWithUnitsNet(aliasedExprRewritten);
    if (aliasedExpr.includes("1 h")) {
      console.log(
        "TOKENS FOR '1 h':",
        tokens.map((t) => `${t.type}:${t.value}`)
      );
    }
    const parser = new UnitsNetParser(tokens, aliasedVars);
    const result = parser.parse();

    return { value: result };
  } catch (error) {
    console.log(
      "UnitsNet evaluate error:",
      error instanceof Error ? error.message : String(error),
      "expr:",
      expression
    );
    return {
      value: new NumberValue(0),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check if an expression contains units
 */
export function expressionContainsUnitsNet(expression: string): boolean {
  return UnitsNetAdapterParser.containsUnits(expression);
}
