/**
 * @file Expression Component Parser
 * @description Parses expressions into semantic component trees for type-aware evaluation.
 * This eliminates the need for string parsing during evaluation and enables early type validation.
 */

import { ExpressionComponent, ListAccessDetails } from './ast';
import { SemanticParsers, parseListLiteral } from '../types';

/**
 * Token types for the lexer
 */
type TokenType =
  | 'number'
  | 'operator'
  | 'identifier'
  | 'parentheses'
  | 'whitespace'
  | 'comma'
  | 'unit'
  | 'currency'
  | 'percentage'
  | 'colon'
  | 'bracket'
  | 'range';

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
  let lastTokenType: TokenType | null = null;

  const isWhitespace = (char: string) => /\s/.test(char);
  const isIdentChar = (char: string) => /[a-zA-Z0-9_]/.test(char);
  const unitPattern = /^[a-zA-Z°µμΩ][a-zA-Z0-9°µμΩ\/\^\-\*\·]*/;

  while (pos < expression.length) {
    let matched = false;

    // Skip whitespace
    if (isWhitespace(expression[pos])) {
      pos++;
      continue;
    }

    // Match range operator (..)
    if (!matched && expression[pos] === "." && expression[pos + 1] === ".") {
      tokens.push({ type: 'range', value: '..', start: pos, end: pos + 2 });
      pos += 2;
      lastTokenType = 'range';
      matched = true;
      continue;
    }

    // Match numbers (including decimals and scientific notation)
    if (!matched && /\d/.test(expression[pos])) {
      const start = pos;
      let value = "";
      while (pos < expression.length) {
        const char = expression[pos];
        if (char === "." && expression[pos + 1] === ".") {
          break;
        }
        if (/[\d.]/.test(char)) {
          value += char;
          pos++;
          continue;
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
      lastTokenType = 'number';
      matched = true;
    }

    // Match operators
    if (!matched && /[+\-*\/^]/.test(expression[pos])) {
      tokens.push({ type: 'operator', value: expression[pos], start: pos, end: pos + 1 });
      pos++;
      lastTokenType = 'operator';
      matched = true;
    }

    // Match parentheses
    if (!matched && /[()]/.test(expression[pos])) {
      tokens.push({ type: 'parentheses', value: expression[pos], start: pos, end: pos + 1 });
      pos++;
      lastTokenType = 'parentheses';
      matched = true;
    }

    // Match commas
    if (!matched && expression[pos] === ',') {
      tokens.push({ type: 'comma', value: ',', start: pos, end: pos + 1 });
      pos++;
      lastTokenType = 'comma';
      matched = true;
    }

    // Match colons (named arguments)
    if (!matched && expression[pos] === ':') {
      tokens.push({ type: 'colon', value: ':', start: pos, end: pos + 1 });
      pos++;
      lastTokenType = 'colon';
      matched = true;
    }

    // Match units immediately after numbers (e.g., 10 m, 5 kg*m^2/s^2)
    if (!matched && lastTokenType === 'number' && /[a-zA-Z°µμΩ]/.test(expression[pos])) {
      const unitMatch = expression.substring(pos).match(unitPattern);
      if (unitMatch && unitMatch[0].toLowerCase() !== "per") {
        tokens.push({ type: 'unit', value: unitMatch[0], start: pos, end: pos + unitMatch[0].length });
        pos += unitMatch[0].length;
        lastTokenType = 'unit';
        matched = true;
      }
    }

    // Match identifiers (including phrase-based variables)
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
      tokens.push({ type: 'identifier', value: normalized, start, end: pos });
      lastTokenType = 'identifier';
      matched = true;
    }

    // Match currency symbols
    if (!matched && /[$€£¥₹₿]/.test(expression[pos])) {
      tokens.push({ type: 'currency', value: expression[pos], start: pos, end: pos + 1 });
      pos++;
      lastTokenType = 'currency';
      matched = true;
    }

    // Match percentage symbol
    if (!matched && expression[pos] === '%') {
      tokens.push({ type: 'percentage', value: '%', start: pos, end: pos + 1 });
      pos++;
      lastTokenType = 'percentage';
      matched = true;
    }

    // Match brackets
    if (!matched && (expression[pos] === '[' || expression[pos] === ']')) {
      tokens.push({ type: 'bracket', value: expression[pos], start: pos, end: pos + 1 });
      pos++;
      lastTokenType = 'bracket';
      matched = true;
      continue;
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
  const rewrittenExpression = rewriteRangeExpressions(expression);
  const tokens = tokenize(rewrittenExpression);
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
        } else if (nextToken?.type === 'identifier' && isPerIdentifier(nextToken.value)) {
          const perLiteral = buildPerLiteral(value, nextToken, tokens, pos + 2);
          if (perLiteral) {
            components.push({
              type: 'literal',
              value: perLiteral.literal,
              parsedValue: perLiteral.parsed,
            });
            pos = perLiteral.nextPos;
            break;
          }
          components.push({
            type: 'literal',
            value,
            parsedValue: SemanticParsers.parseOrError(value),
          });
          pos++;
        } else if (nextToken?.type === 'identifier') {
          const combined = `${value} ${nextToken.value}`;
          const parsed = SemanticParsers.parse(combined);
          if (parsed) {
            components.push({
              type: 'literal',
              value: combined,
              parsedValue: parsed,
            });
            pos += 2;
          } else {
            components.push({
              type: 'literal',
              value,
              parsedValue: SemanticParsers.parseOrError(value),
            });
            pos++;
          }
        } else if (nextToken?.type === 'currency') {
          // Handle currency literals with suffix symbols (e.g., 100$)
          components.push({
            type: 'literal',
            value: value + nextToken.value,
            parsedValue: SemanticParsers.parseOrError(value + nextToken.value),
          });
          pos += 2;
        } else if (nextToken?.type === 'operator' && nextToken.value === '/') {
          const { unitTokens, nextPos } = collectUnitTokens(tokens, pos + 2);
          if (unitTokens.length > 0) {
            const literal = [token, nextToken, ...unitTokens].map((t) => t.value).join(" ");
            const parsed = SemanticParsers.parse(literal);
            if (parsed) {
              components.push({
                type: 'literal',
                value: literal,
                parsedValue: parsed,
              });
              pos = nextPos;
              break;
            }
          }
          components.push({
            type: 'literal',
            value,
            parsedValue: SemanticParsers.parseOrError(value),
          });
          pos++;
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
        // Handle currency literals (including currency rates like $8/m^2 or $8 per m^2)
        const value = token.value;
        const nextToken = tokens[pos + 1];
        if (!nextToken || nextToken.type !== 'number') {
          throw new Error(`Invalid currency literal: ${value}`);
        }

        const separatorToken = tokens[pos + 2];

        const tryCurrencyUnitLiteral = (unitStart: number): boolean => {
          const { unitTokens, nextPos } = collectUnitTokens(tokens, unitStart);
          if (unitTokens.length === 0) {
            return false;
          }
          const literalTokens = tokens.slice(pos, unitStart).concat(unitTokens);
          const literal = literalTokens.map((t) => t.value).join(" ");
          const parsed = SemanticParsers.parse(literal);
          if (parsed && parsed.getType() === "currencyUnit") {
            components.push({
              type: 'literal',
              value: literal,
              parsedValue: parsed,
            });
            pos = nextPos;
            return true;
          }
          return false;
        };

        if (separatorToken?.type === 'operator' && separatorToken.value === '/') {
          if (tryCurrencyUnitLiteral(pos + 3)) {
            break;
          }
        }

        if (separatorToken?.type === 'identifier' && isPerIdentifier(separatorToken.value)) {
          const perLiteral = buildPerLiteral(
            `${value}${nextToken.value}`,
            separatorToken,
            tokens,
            pos + 3
          );
          if (perLiteral && perLiteral.parsed.getType() === "currencyUnit") {
            components.push({
              type: 'literal',
              value: perLiteral.literal,
              parsedValue: perLiteral.parsed,
            });
            pos = perLiteral.nextPos;
            break;
          }
        }

        components.push({
          type: 'literal',
          value: value + nextToken.value,
          parsedValue: SemanticParsers.parseOrError(value + nextToken.value),
        });
        pos += 2;
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

      case 'identifier': {
        const nextToken = tokens[pos + 1];
        if (nextToken?.type === 'parentheses' && nextToken.value === '(') {
          const funcName = token.value;
          pos += 2;
          const { args, nextPos } = parseFunctionArguments(tokens, pos);
          pos = nextPos;
          components.push({
            type: 'function',
            value: funcName,
            args,
          });
          break;
        }

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
          const start = pos + 1;
          let depth = 1;
          pos++;

          while (pos < tokens.length && depth > 0) {
            const current = tokens[pos];
            if (current.type === 'parentheses') {
              if (current.value === '(') depth++;
              if (current.value === ')') depth--;
            }
            if (depth === 0) break;
            pos++;
          }

          if (depth !== 0) {
            throw new Error('Unmatched opening parenthesis');
          }

          const innerTokens = tokens.slice(start, pos);
          if (innerTokens.length === 0) {
            throw new Error('Empty parentheses');
          }

          const subComponents = parseExpressionComponents(
            innerTokens.map((t) => t.value).join('')
          );
          components.push({
            type: 'parentheses',
            value: '()',
            children: subComponents,
          });

          pos++; // consume closing ')'
        } else {
          // Closing parenthesis without matching open
          throw new Error('Unmatched closing parenthesis');
        }
        break;
      }

      case 'bracket': {
        if (token.value === '[') {
          if (components.length === 0) {
            throw new Error('List access missing base expression');
          }
          const baseComponent = components.pop()!;
          const { innerTokens, nextPos } = collectBracketTokens(tokens, pos + 1);
          pos = nextPos;
          const accessDetails = buildListAccessDetails(baseComponent, innerTokens);
          components.push({
            type: 'listAccess',
            value: baseComponent.value,
            access: accessDetails,
          });
          break;
        }
        throw new Error('Unmatched closing bracket');
      }

      default:
        throw new Error(`Unexpected token: ${token.type}`);
    }
  }

  return components;
}

function isPerIdentifier(value: string): boolean {
  return /^per\b/i.test(value.trim());
}

type ParsedSemantic = NonNullable<ReturnType<typeof SemanticParsers.parse>>;

function buildPerLiteral(
  baseValue: string,
  perToken: Token,
  tokens: Token[],
  unitStartPos: number
): { literal: string; parsed: ParsedSemantic; nextPos: number } | null {
  const perValue = perToken.value.trim();
  const inlineUnit = perValue.toLowerCase() === "per" ? "" : perValue.replace(/^per\s+/i, "").trim();
  const { unitTokens, nextPos } = collectUnitTokens(tokens, unitStartPos);
  const unitParts = [
    inlineUnit,
    ...unitTokens.map((token) => token.value),
  ].filter(Boolean);

  if (unitParts.length === 0) {
    return null;
  }

  const literal = `${baseValue} per ${unitParts.join(" ")}`.replace(/\s+/g, " ").trim();
  const parsed = SemanticParsers.parse(literal);
  if (!parsed) {
    return null;
  }

  return { literal, parsed, nextPos };
}

function collectUnitTokens(tokens: Token[], startPos: number): { unitTokens: Token[]; nextPos: number } {
  const unitTokens: Token[] = [];
  let pos = startPos;
  let lastWasExponent = false;

  while (pos < tokens.length) {
    const token = tokens[pos];

    if (token.type === 'comma' || token.type === 'currency' || token.type === 'percentage') {
      break;
    }

    if (token.type === 'operator') {
      if (token.value === '+' || token.value === '-') {
        if (lastWasExponent && token.value === '-' && tokens[pos + 1]?.type === 'number') {
          unitTokens.push(token);
          pos++;
          continue;
        }
        break;
      }

      if (token.value === '^') {
        unitTokens.push(token);
        lastWasExponent = true;
        pos++;
        continue;
      }

      if (token.value === '*' || token.value === '/') {
        const next = tokens[pos + 1];
        if (next && (next.type === 'identifier' || next.type === 'unit' || next.type === 'parentheses')) {
          unitTokens.push(token);
          lastWasExponent = false;
          pos++;
          continue;
        }
        break;
      }

      break;
    }

    if (token.type === 'number') {
      if (!lastWasExponent) {
        break;
      }
      unitTokens.push(token);
      lastWasExponent = false;
      pos++;
      continue;
    }

    if (token.type === 'identifier' || token.type === 'unit' || token.type === 'parentheses') {
      unitTokens.push(token);
      lastWasExponent = false;
      pos++;
      continue;
    }

    break;
  }

  return { unitTokens, nextPos: pos };
}

function parseFunctionArguments(
  tokens: Token[],
  startPos: number
): { args: Array<{ name?: string; components: ExpressionComponent[] }>; nextPos: number } {
  const args: Array<{ name?: string; components: ExpressionComponent[] }> = [];
  let pos = startPos;
  let depth = 1;
  let currentTokens: Token[] = [];

  const tryBuildListComponent = (tokens: Token[]): ExpressionComponent | null => {
    if (tokens.length === 0) return null;
    const expression = tokens.map((t) => t.value).join(" ").trim();
    if (!expression.startsWith("(") || !expression.endsWith(")")) {
      return null;
    }
    const inner = expression.slice(1, -1).trim();
    if (!inner.includes(",")) {
      return null;
    }
    const parsed = parseListLiteral(inner);
    if (parsed) {
      return {
        type: 'literal',
        value: expression,
        parsedValue: parsed,
      };
    }
    return null;
  };

  const flushArg = () => {
    if (currentTokens.length === 0) return;
    const { name, valueTokens } = splitNamedArgument(currentTokens);
    const listComponent = tryBuildListComponent(valueTokens);
    if (listComponent) {
      args.push({
        name,
        components: [listComponent],
      });
      currentTokens = [];
      return;
    }
    const expression = valueTokens.map((t) => t.value).join(" ");
    const components = parseExpressionComponents(expression);
    args.push({ name, components });
    currentTokens = [];
  };

  while (pos < tokens.length && depth > 0) {
    const current = tokens[pos];

    if (current.type === 'parentheses') {
      if (current.value === '(') depth++;
      if (current.value === ')') depth--;

      if (depth === 0) {
        flushArg();
        pos++;
        break;
      }
    }

    if (current.type === 'comma' && depth === 1) {
      flushArg();
      pos++;
      continue;
    }

    currentTokens.push(current);
    pos++;
  }

  return { args, nextPos: pos };
}

type RangeReplacement = {
  segmentStart: number;
  segmentEnd: number;
  text: string;
};

function rewriteRangeExpressions(expression: string): string {
  if (!expression.includes("..")) {
    return expression;
  }

  let result = "";
  let lastIndex = 0;
  let cursor = 0;
  let squareDepth = 0;

  while (cursor < expression.length) {
    const char = expression[cursor];
    if (char === "[") {
      squareDepth++;
    } else if (char === "]") {
      squareDepth = Math.max(0, squareDepth - 1);
    }

    if (
      squareDepth === 0 &&
      char === "." &&
      expression[cursor + 1] === "."
    ) {
      const replacement = buildRangeReplacement(expression, cursor);
      if (replacement) {
        result += expression.slice(lastIndex, replacement.segmentStart);
        result += replacement.text;
        cursor = replacement.segmentEnd;
        lastIndex = cursor;
        continue;
      }
    }

    cursor++;
  }

  if (lastIndex < expression.length) {
    result += expression.slice(lastIndex);
  }

  return result;
}

function buildRangeReplacement(
  expression: string,
  rangeIndex: number
): RangeReplacement | null {
  const left = extractLeftEndpoint(expression, rangeIndex);
  if (!left) return null;
  const right = extractRightEndpoint(expression, rangeIndex + 2);
  if (!right) return null;

  let segmentEnd = right.endIndex;
  let stepExpr: { text: string; endIndex: number } | null = null;
  const afterRight = skipWhitespace(expression, segmentEnd);
  if (matchesKeyword(expression, afterRight, "step")) {
    const stepStart = afterRight + 4;
    const stepValue = extractRightEndpoint(expression, stepStart);
    if (!stepValue) {
      return null;
    }
    stepExpr = stepValue;
    segmentEnd = stepValue.endIndex;
  }

  const replacementParts = [
    left.text,
    right.text,
    stepExpr?.text,
  ].filter(Boolean);
  const replacement = `__rangeLiteral(${replacementParts.join(", ")})`;
  return {
    segmentStart: left.startIndex,
    segmentEnd,
    text: replacement,
  };
}

function extractLeftEndpoint(
  expression: string,
  rangeIndex: number
): { text: string; startIndex: number } | null {
  let pos = rangeIndex - 1;
  while (pos >= 0 && /\s/.test(expression[pos])) {
    pos--;
  }
  if (pos < 0) return null;

  if (expression[pos] === ")") {
    let depth = 1;
    pos--;
    while (pos >= 0 && depth > 0) {
      const char = expression[pos];
      if (char === ")") depth++;
      else if (char === "(") depth--;
      pos--;
    }
    if (depth !== 0) return null;
    const startIndex = pos + 1;
    const segment = expression.slice(startIndex, rangeIndex).trim();
    if (!segment) return null;
    return { text: segment, startIndex };
  }

  let boundary = pos;
  while (boundary >= 0) {
    if (isLeftBoundary(expression[boundary])) {
      break;
    }
    boundary--;
  }

  let startIndex = boundary + 1;
  if (
    startIndex > 0 &&
    (expression[startIndex - 1] === "-" || expression[startIndex - 1] === "+") &&
    !/\s/.test(expression[startIndex - 2] ?? "")
  ) {
    startIndex -= 1;
  }

  const segment = expression.slice(startIndex, rangeIndex).trim();
  if (!segment) return null;
  return { text: segment, startIndex };
}

function extractRightEndpoint(
  expression: string,
  startIndex: number
): { text: string; endIndex: number } | null {
  let pos = skipWhitespace(expression, startIndex);
  if (pos >= expression.length) return null;

  if (expression[pos] === "(") {
    let depth = 1;
    let idx = pos + 1;
    while (idx < expression.length && depth > 0) {
      const char = expression[idx];
      if (char === "(") depth++;
      else if (char === ")") depth--;
      idx++;
    }
    if (depth !== 0) return null;
    const segment = expression.slice(pos, idx).trim();
    if (!segment) return null;
    return { text: segment, endIndex: idx };
  }

  let end = pos;
  while (end < expression.length) {
    const char = expression[end];
    if (isRightBoundary(char)) {
      if (
        (char === "-" || char === "+") &&
        end === pos &&
        /[\d.]/.test(expression[end + 1] ?? "")
      ) {
        end++;
        continue;
      }
      break;
    }
    if (matchesKeyword(expression, end, "step")) {
      break;
    }
    end++;
  }

  const segment = expression.slice(pos, end).trim();
  if (!segment) return null;
  return { text: segment, endIndex: end };
}

function skipWhitespace(expression: string, index: number): number {
  let pos = index;
  while (pos < expression.length && /\s/.test(expression[pos])) {
    pos++;
  }
  return pos;
}

function matchesKeyword(expression: string, index: number, keyword: string): boolean {
  const slice = expression.slice(index);
  if (!slice.toLowerCase().startsWith(keyword.toLowerCase())) {
    return false;
  }
  const nextChar = slice[keyword.length];
  if (nextChar && /[a-zA-Z0-9_]/.test(nextChar)) {
    return false;
  }
  const prevChar = expression[index - 1];
  if (prevChar && /[a-zA-Z0-9_]/.test(prevChar)) {
    return false;
  }
  return true;
}

function isLeftBoundary(char: string): boolean {
  return /[,\(\[\{\+\-\*\/\^=]/.test(char);
}

function isRightBoundary(char: string): boolean {
  return /[,\)\]\}\+\-\*\/\^=]/.test(char);
}

function splitNamedArgument(tokens: Token[]): { name?: string; valueTokens: Token[] } {
  let depth = 0;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === 'parentheses') {
      if (token.value === '(') depth++;
      if (token.value === ')') depth = Math.max(0, depth - 1);
    }
    if (token.type === 'colon' && depth === 0) {
      const nameTokens = tokens.slice(0, i);
      const valueTokens = tokens.slice(i + 1);
      const nameText = nameTokens.map((t) => t.value).join(" ").trim();
      if (nameTokens.length !== 1 || nameTokens[0].type !== 'identifier' || !nameText) {
        throw new Error("Invalid named argument");
      }
      return { name: nameText, valueTokens };
    }
  }
  return { valueTokens: tokens };
}

function collectBracketTokens(
  tokens: Token[],
  startPos: number
): { innerTokens: Token[]; nextPos: number } {
  const innerTokens: Token[] = [];
  let depth = 1;
  let pos = startPos;

  while (pos < tokens.length && depth > 0) {
    const current = tokens[pos];
    if (current.type === 'bracket') {
      if (current.value === '[') {
        depth++;
        innerTokens.push(current);
        pos++;
        continue;
      }
      if (current.value === ']') {
        depth--;
        if (depth === 0) {
          pos++;
          break;
        }
      }
    }
    if (depth > 0) {
      innerTokens.push(current);
    }
    pos++;
  }

  if (depth !== 0) {
    throw new Error('Unmatched opening bracket');
  }

  return { innerTokens, nextPos: pos };
}

function tokensToExpression(tokens: Token[]): string {
  return tokens.map((token) => token.value).join(' ').trim();
}

function buildListAccessDetails(
  base: ExpressionComponent,
  tokens: Token[]
): ListAccessDetails {
  const cleanedTokens = tokens.filter((token) => token.type !== 'bracket');
  if (cleanedTokens.length === 0) {
    throw new Error('Empty list access expression');
  }

  const rangeIndex = cleanedTokens.findIndex((token) => token.type === 'range');
  if (rangeIndex >= 0) {
    const startTokens = cleanedTokens.slice(0, rangeIndex);
    const endTokens = cleanedTokens.slice(rangeIndex + 1);
    if (startTokens.length === 0 || endTokens.length === 0) {
      throw new Error('Invalid slice expression');
    }
    const startExpr = tokensToExpression(startTokens);
    const endExpr = tokensToExpression(endTokens);
    return {
      base,
      kind: 'slice',
      startComponents: startExpr ? parseExpressionComponents(startExpr) : [],
      endComponents: endExpr ? parseExpressionComponents(endExpr) : [],
    };
  }

  const indexExpr = tokensToExpression(cleanedTokens);
  if (!indexExpr) {
    throw new Error('Empty list index');
  }
  return {
    base,
    kind: 'index',
    indexComponents: parseExpressionComponents(indexExpr),
  };
}
