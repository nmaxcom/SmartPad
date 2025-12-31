/**
 * @file Expression Component Parser
 * @description Parses expressions into semantic component trees for type-aware evaluation.
 * This eliminates the need for string parsing during evaluation and enables early type validation.
 */

import { ExpressionComponent } from './ast';
import { SemanticParsers } from '../types';

/**
 * Token types for the lexer
 */
type TokenType =
  | 'number'
  | 'operator'
  | 'identifier'
  | 'parentheses'
  | 'whitespace'
  | 'function'
  | 'comma'
  | 'unit'
  | 'currency'
  | 'percentage';

interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
}

/**
 * Lexer for breaking expressions into tokens
 */
function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  const isWhitespace = (char: string) => /\s/.test(char);
  const isIdentChar = (char: string) => /[a-zA-Z0-9_]/.test(char);
  const functionNames = [
    'sqrt',
    'abs',
    'round',
    'floor',
    'ceil',
    'max',
    'min',
    'sin',
    'cos',
    'tan',
    'log',
    'ln',
    'exp',
  ];

  while (pos < expression.length) {
    let matched = false;

    // Skip whitespace
    if (isWhitespace(expression[pos])) {
      pos++;
      continue;
    }

    // Match numbers (including decimals and scientific notation)
    if (!matched && /\d/.test(expression[pos])) {
      const start = pos;
      let value = "";
      while (pos < expression.length) {
        const char = expression[pos];
        if (/[\d.]/.test(char)) {
          value += char;
          pos++;
          continue;
        }
        if (char === ",") {
          const nextDigits = expression.slice(pos + 1, pos + 4);
          if (/^\d{3}$/.test(nextDigits)) {
            pos++;
            continue;
          }
        }
        break;
      }
      if (pos < expression.length && (expression[pos] === "e" || expression[pos] === "E")) {
        const nextChar = expression[pos + 1];
        const nextNextChar = expression[pos + 2];
        if (
          /\d/.test(nextChar) ||
          ((nextChar === "+" || nextChar === "-") && /\d/.test(nextNextChar))
        ) {
          value += expression[pos];
          pos++;
          if (expression[pos] === "+" || expression[pos] === "-") {
            value += expression[pos];
            pos++;
          }
          while (pos < expression.length && /\d/.test(expression[pos])) {
            value += expression[pos];
            pos++;
          }
        }
      }
      tokens.push({ type: 'number', value: value.replace(/,/g, ""), start, end: pos });
      matched = true;
    }

    // Match operators
    if (!matched && /[+\-*\/^]/.test(expression[pos])) {
      tokens.push({ type: 'operator', value: expression[pos], start: pos, end: pos + 1 });
      pos++;
      matched = true;
    }

    // Match parentheses
    if (!matched && /[()]/.test(expression[pos])) {
      tokens.push({ type: 'parentheses', value: expression[pos], start: pos, end: pos + 1 });
      pos++;
      matched = true;
    }

    // Match commas
    if (!matched && expression[pos] === ',') {
      tokens.push({ type: 'comma', value: ',', start: pos, end: pos + 1 });
      pos++;
      matched = true;
    }

    // Match functions and identifiers (including phrase-based variables)
    if (!matched && /[a-zA-Z_]/.test(expression[pos])) {
      const start = pos;
      let value = "";

      while (pos < expression.length) {
        const char = expression[pos];

        if (isIdentChar(char)) {
          value += char;
          pos++;
          continue;
        }

        if (isWhitespace(char)) {
          let lookahead = pos;
          while (lookahead < expression.length && isWhitespace(expression[lookahead])) {
            lookahead++;
          }
          if (lookahead < expression.length && isIdentChar(expression[lookahead])) {
            value += " ";
            pos = lookahead;
            continue;
          }
        }

        break;
      }

      const normalized = value.replace(/\s+/g, " ").trim();
      let lookahead = pos;
      while (lookahead < expression.length && isWhitespace(expression[lookahead])) {
        lookahead++;
      }
      const isFunction = functionNames.includes(normalized) && expression[lookahead] === '(';
      const type = isFunction ? 'function' : 'identifier';
      tokens.push({ type, value: normalized, start, end: pos });
      matched = true;
    }

    // Match units
    if (!matched && /[°]/.test(expression[pos])) {
      const start = pos;
      pos++;
      while (pos < expression.length && /[A-Za-z]/.test(expression[pos])) {
        pos++;
      }
      tokens.push({ type: 'unit', value: expression.slice(start, pos), start, end: pos });
      matched = true;
    }

    // Match currency symbols
    if (!matched && /[$€£¥₹₿]/.test(expression[pos])) {
      tokens.push({ type: 'currency', value: expression[pos], start: pos, end: pos + 1 });
      pos++;
      matched = true;
    }

    // Match percentage symbol
    if (!matched && expression[pos] === '%') {
      tokens.push({ type: 'percentage', value: '%', start: pos, end: pos + 1 });
      pos++;
      matched = true;
    }

    // Skip unknown characters
    if (!matched) {
      pos++;
    }
  }

  return tokens;
}

/**
 * Parses an expression into a semantic component tree
 */
export function parseExpressionComponents(expression: string): ExpressionComponent[] {
  const tokens = tokenize(expression);
  const components: ExpressionComponent[] = [];
  let pos = 0;

  while (pos < tokens.length) {
    const token = tokens[pos];

    switch (token.type) {
      case 'number': {
        // Try to parse as a semantic value
        const value = token.value;
        const nextToken = tokens[pos + 1];

        if (nextToken?.type === 'percentage') {
          // Handle percentage literals
          components.push({
            type: 'literal',
            value: value + '%',
            parsedValue: SemanticParsers.parseOrError(value + '%'),
          });
          pos += 2;
        } else if (nextToken?.type === 'unit') {
          // Handle unit literals
          components.push({
            type: 'literal',
            value: value + nextToken.value,
            parsedValue: SemanticParsers.parseOrError(value + nextToken.value),
          });
          pos += 2;
        } else if (nextToken?.type === 'currency') {
          // Handle currency literals with suffix symbols (e.g., 100$)
          components.push({
            type: 'literal',
            value: value + nextToken.value,
            parsedValue: SemanticParsers.parseOrError(value + nextToken.value),
          });
          pos += 2;
        } else {
          // Plain number
          components.push({
            type: 'literal',
            value,
            parsedValue: SemanticParsers.parseOrError(value),
          });
          pos++;
        }
        break;
      }

      case 'currency': {
        // Handle currency literals
        const value = token.value;
        const nextToken = tokens[pos + 1];
        if (nextToken?.type === 'number') {
          components.push({
            type: 'literal',
            value: value + nextToken.value,
            parsedValue: SemanticParsers.parseOrError(value + nextToken.value),
          });
          pos += 2;
        } else {
          throw new Error(`Invalid currency literal: ${value}`);
        }
        break;
      }

      case 'operator': {
        components.push({
          type: 'operator',
          value: token.value,
        });
        pos++;
        break;
      }

      case 'function': {
        // Handle function calls
        const funcName = token.value;
        pos++;

        // Expect opening parenthesis
        if (tokens[pos]?.type !== 'parentheses' || tokens[pos].value !== '(') {
          throw new Error(`Expected ( after function ${funcName}`);
        }
        pos++;

        // Parse function arguments
        const args: ExpressionComponent[] = [];
        let depth = 1;

        while (pos < tokens.length && depth > 0) {
          const current = tokens[pos];

          if (current.type === 'parentheses') {
            if (current.value === '(') depth++;
            if (current.value === ')') depth--;

            if (depth === 0) {
              // End of function call
              components.push({
                type: 'function',
                value: funcName,
                children: args,
              });
              pos++;
              break;
            }
          }

          if (current.type === 'comma' && depth === 1) {
            pos++;
            continue;
          }

          // Parse argument expression
          const argTokens: Token[] = [];
          let argDepth = depth;
          while (pos < tokens.length) {
            const t = tokens[pos];
            if (t.type === 'parentheses') {
              if (t.value === '(') argDepth++;
              if (t.value === ')') argDepth--;
            }
            if ((t.type === 'comma' && argDepth === 1) || argDepth === 0) break;
            argTokens.push(t);
            pos++;
          }

          args.push(...parseExpressionComponents(argTokens.map(t => t.value).join('')));
        }
        break;
      }

      case 'identifier': {
        components.push({
          type: 'variable',
          value: token.value,
        });
        pos++;
        break;
      }

      case 'parentheses': {
        if (token.value === '(') {
          // Start of parenthesized expression
          const subComponents: ExpressionComponent[] = [];
          pos++;
          let depth = 1;

          while (pos < tokens.length && depth > 0) {
            const current = tokens[pos];

            if (current.type === 'parentheses') {
              if (current.value === '(') depth++;
              if (current.value === ')') depth--;

              if (depth === 0) {
                components.push({
                  type: 'parentheses',
                  value: '()',
                  children: subComponents,
                });
                pos++;
                break;
              }
            }

            // Parse sub-expression
            const subTokens: Token[] = [];
            let subDepth = depth;
            while (pos < tokens.length) {
              const t = tokens[pos];
              if (t.type === 'parentheses') {
                if (t.value === '(') subDepth++;
                if (t.value === ')') subDepth--;
              }
              if (subDepth === 0) break;
              subTokens.push(t);
              pos++;
            }

            subComponents.push(...parseExpressionComponents(subTokens.map(t => t.value).join('')));
          }
        } else {
          // Closing parenthesis without matching open
          throw new Error('Unmatched closing parenthesis');
        }
        break;
      }

      default:
        throw new Error(`Unexpected token: ${token.type}`);
    }
  }

  return components;
}
