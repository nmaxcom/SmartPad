/**
 * Mathematical Expression Evaluator
 * Handles pre-algebra operations with proper order of operations
 */

export interface MathResult {
  value: number;
  error?: string;
}

export interface MathError extends Error {
  type: "DIVISION_BY_ZERO" | "INVALID_OPERATION" | "PARSE_ERROR" | "OVERFLOW";
}

/**
 * Tokenizer for mathematical expressions
 */
export enum TokenType {
  NUMBER = "NUMBER",
  OPERATOR = "OPERATOR",
  FUNCTION = "FUNCTION",
  IDENTIFIER = "IDENTIFIER",
  LEFT_PAREN = "LEFT_PAREN",
  RIGHT_PAREN = "RIGHT_PAREN",
  COMMA = "COMMA",
  EOF = "EOF",
}

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

/**
 * Tokenizes a mathematical expression
 */
export function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
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

    // Numbers (including decimals and scientific notation)
    if (/\d/.test(char) || char === ".") {
      let numberStr = "";
      while (position < expression.length) {
        const current = expression[position];
        if (/\d/.test(current) || current === ".") {
          numberStr += current;
          position++;
          continue;
        }
        if (current === ",") {
          const nextDigits = expression.slice(position + 1, position + 4);
          if (/^\d{3}$/.test(nextDigits)) {
            position++;
            continue;
          }
        }
        break;
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
      tokens.push({ type: TokenType.NUMBER, value: numberStr.replace(/,/g, ""), position });
      continue;
    }

    // Operators
    if (/[+\-*/%^]/.test(char)) {
      tokens.push({ type: TokenType.OPERATOR, value: char, position });
      position++;
      continue;
    }

    // Parentheses
    if (char === "(") {
      tokens.push({ type: TokenType.LEFT_PAREN, value: char, position });
      position++;
      continue;
    }

    if (char === ")") {
      tokens.push({ type: TokenType.RIGHT_PAREN, value: char, position });
      position++;
      continue;
    }

    // Comma
    if (char === ",") {
      tokens.push({ type: TokenType.COMMA, value: char, position });
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

      // Normalize internal whitespace to single spaces to match store keys
      identifier = identifier.replace(/\s+/g, " ");

      // Check if it's a function
      const nextChar = position < expression.length ? expression[position] : "";
      if (nextChar === "(") {
        tokens.push({ type: TokenType.FUNCTION, value: identifier, position });
      } else {
        tokens.push({ type: TokenType.IDENTIFIER, value: identifier, position });
      }
      continue;
    }

    // Unknown character - skip for now
    position++;
  }

  tokens.push({ type: TokenType.EOF, value: "", position });
  return tokens;
}

/**
 * Parser for mathematical expressions using recursive descent
 */
export class MathParser {
  private tokens: Token[];
  private current: number;
  private variables: Record<string, number>;

  constructor(tokens: Token[], variables: Record<string, number> = {}) {
    this.tokens = tokens;
    this.current = 0;
    this.variables = variables;
  }

  /**
   * Main parsing entry point
   */
  parse(): number {
    const result = this.parseExpression();
    if (this.currentToken().type !== TokenType.EOF) {
      throw new Error("Unexpected token after expression");
    }
    return result;
  }

  private currentToken(): Token {
    return this.tokens[this.current] || { type: TokenType.EOF, value: "", position: 0 };
  }

  private consume(expectedType?: TokenType): Token {
    const token = this.currentToken();
    if (expectedType && token.type !== expectedType) {
      throw new Error(`Expected ${expectedType}, got ${token.type}`);
    }
    this.current++;
    return token;
  }

  private peek(): Token {
    return this.tokens[this.current + 1] || { type: TokenType.EOF, value: "", position: 0 };
  }

  /**
   * Expression := Term (('+' | '-') Term)*
   */
  private parseExpression(): number {
    let left = this.parseTerm();

    while (
      this.currentToken().type === TokenType.OPERATOR &&
      (this.currentToken().value === "+" || this.currentToken().value === "-")
    ) {
      const operator = this.consume().value;
      const right = this.parseTerm();

      if (operator === "+") {
        left = left + right;
      } else {
        left = left - right;
      }
    }

    return left;
  }

  /**
   * Term := Factor (('*' | '/' | '%') Factor)*
   */
  private parseTerm(): number {
    let left = this.parseFactor();

    while (
      this.currentToken().type === TokenType.OPERATOR &&
      (this.currentToken().value === "*" ||
        this.currentToken().value === "/" ||
        this.currentToken().value === "%")
    ) {
      const operator = this.consume().value;
      const right = this.parseFactor();

      if (operator === "*") {
        left = left * right;
      } else if (operator === "/") {
        if (right === 0) {
          const error = new Error("Division by zero") as MathError;
          error.type = "DIVISION_BY_ZERO";
          throw error;
        }
        left = left / right;
      } else if (operator === "%") {
        if (right === 0) {
          const error = new Error("Division by zero") as MathError;
          error.type = "DIVISION_BY_ZERO";
          throw error;
        }
        left = left % right;
      }
    }

    return left;
  }

  /**
   * Factor := Power | UnaryExpression
   */
  private parseFactor(): number {
    return this.parsePower();
  }

  /**
   * Power := UnaryExpression ('^' UnaryExpression)*
   */
  private parsePower(): number {
    let left = this.parseUnary();

    while (this.currentToken().type === TokenType.OPERATOR && this.currentToken().value === "^") {
      this.consume(); // consume '^'
      const right = this.parseUnary();
      left = Math.pow(left, right);
    }

    return left;
  }

  /**
   * UnaryExpression := ('+' | '-') UnaryExpression | Primary
   */
  private parseUnary(): number {
    if (
      this.currentToken().type === TokenType.OPERATOR &&
      (this.currentToken().value === "+" || this.currentToken().value === "-")
    ) {
      const operator = this.consume().value;
      const operand = this.parseUnary();
      return operator === "-" ? -operand : operand;
    }

    return this.parsePrimary();
  }

  /**
   * Primary := NUMBER | FUNCTION '(' ArgumentList ')' | IDENTIFIER | '(' Expression ')'
   */
  private parsePrimary(): number {
    const token = this.currentToken();

    // Numbers
    if (token.type === TokenType.NUMBER) {
      this.consume();
      const value = parseFloat(token.value);
      if (isNaN(value)) {
        throw new Error(`Invalid number: ${token.value}`);
      }
      return value;
    }

    // Functions
    if (token.type === TokenType.FUNCTION) {
      const functionName = this.consume().value;
      this.consume(TokenType.LEFT_PAREN);

      const args: number[] = [];

      // Parse arguments
      if (this.currentToken().type !== TokenType.RIGHT_PAREN) {
        args.push(this.parseExpression());

        while (this.currentToken().type === TokenType.COMMA) {
          this.consume(); // consume comma
          args.push(this.parseExpression());
        }
      }

      this.consume(TokenType.RIGHT_PAREN);

      return this.evaluateFunction(functionName, args);
    }

    // Identifiers (variables)
    if (token.type === TokenType.IDENTIFIER) {
      const variableName = token.value;
      this.consume();

      if (variableName in this.variables) {
        return this.variables[variableName];
      } else {
        throw new Error(`Undefined variable: ${variableName}`);
      }
    }

    // Parenthesized expressions
    if (token.type === TokenType.LEFT_PAREN) {
      this.consume();
      const result = this.parseExpression();
      this.consume(TokenType.RIGHT_PAREN);
      return result;
    }

    throw new Error(`Unexpected token: ${token.value}`);
  }

  /**
   * Evaluate mathematical functions
   */
  private evaluateFunction(name: string, args: number[]): number {
    const lowerName = name.toLowerCase();

    switch (lowerName) {
      case "sqrt":
        if (args.length !== 1) throw new Error(`sqrt expects 1 argument, got ${args.length}`);
        if (args[0] < 0) {
          const error = new Error("Square root of negative number") as MathError;
          error.type = "INVALID_OPERATION";
          throw error;
        }
        return Math.sqrt(args[0]);

      case "abs":
        if (args.length !== 1) throw new Error(`abs expects 1 argument, got ${args.length}`);
        return Math.abs(args[0]);

      case "round":
        if (args.length !== 1) throw new Error(`round expects 1 argument, got ${args.length}`);
        return Math.round(args[0]);

      case "floor":
        if (args.length !== 1) throw new Error(`floor expects 1 argument, got ${args.length}`);
        return Math.floor(args[0]);

      case "ceil":
        if (args.length !== 1) throw new Error(`ceil expects 1 argument, got ${args.length}`);
        return Math.ceil(args[0]);

      case "max":
        if (args.length < 1) throw new Error(`max expects at least 1 argument, got ${args.length}`);
        return Math.max(...args);

      case "min":
        if (args.length < 1) throw new Error(`min expects at least 1 argument, got ${args.length}`);
        return Math.min(...args);

      case "sin":
        if (args.length !== 1) throw new Error(`sin expects 1 argument, got ${args.length}`);
        return Math.sin(args[0]);

      case "cos":
        if (args.length !== 1) throw new Error(`cos expects 1 argument, got ${args.length}`);
        return Math.cos(args[0]);

      case "tan":
        if (args.length !== 1) throw new Error(`tan expects 1 argument, got ${args.length}`);
        return Math.tan(args[0]);

      case "log":
        if (args.length !== 1) throw new Error(`log expects 1 argument, got ${args.length}`);
        if (args[0] <= 0) {
          const error = new Error("Logarithm of non-positive number") as MathError;
          error.type = "INVALID_OPERATION";
          throw error;
        }
        return Math.log10(args[0]);

      case "ln":
        if (args.length !== 1) throw new Error(`ln expects 1 argument, got ${args.length}`);
        if (args[0] <= 0) {
          const error = new Error("Logarithm of non-positive number") as MathError;
          error.type = "INVALID_OPERATION";
          throw error;
        }
        return Math.log(args[0]);

      case "exp":
        if (args.length !== 1) throw new Error(`exp expects 1 argument, got ${args.length}`);
        return Math.exp(args[0]);

      default:
        throw new Error(`Unknown function: ${name}`);
    }
  }
}

/**
 * Main evaluation function
 */
export function evaluateMath(
  expression: string,
  variables: Record<string, number> = {}
): MathResult {
  try {
    const tokens = tokenize(expression);
    const parser = new MathParser(tokens, variables);
    const value = parser.parse();

    // Check for overflow/underflow
    if (!isFinite(value)) {
      return {
        value: 0,
        error: "Result is infinite or not a number",
      };
    }

    return { value };
  } catch (error) {
    const mathError = error as MathError;

    if (mathError.type === "DIVISION_BY_ZERO") {
      return { value: 0, error: "Division by zero" };
    }

    if (mathError.type === "INVALID_OPERATION") {
      return { value: 0, error: mathError.message };
    }

    return { value: 0, error: `Invalid expression: ${mathError.message}` };
  }
}
