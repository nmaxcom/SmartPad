"use strict";
/**
 * @file Expression Component Parser
 * @description Parses expressions into semantic component trees for type-aware evaluation.
 * This eliminates the need for string parsing during evaluation and enables early type validation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseExpressionComponents = parseExpressionComponents;
const types_1 = require("../types");
/**
 * Lexer for breaking expressions into tokens
 */
function tokenize(expression) {
    const tokens = [];
    let pos = 0;
    let lastTokenType = null;
    const isWhitespace = (char) => /\s/.test(char);
    const isIdentChar = (char) => /[a-zA-Z0-9_]/.test(char);
    const unitPattern = /^[a-zA-Z°µμΩ][a-zA-Z0-9°µμΩ\/\^\-\*\·]*/;
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
                if (/\d/.test(nextChar) ||
                    ((nextChar === "+" || nextChar === "-") && /\d/.test(nextNextChar))) {
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
function parseExpressionComponents(expression) {
    const tokens = tokenize(expression);
    const components = [];
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
                        parsedValue: types_1.SemanticParsers.parseOrError(value + '%'),
                    });
                    pos += 2;
                }
                else if (nextToken?.type === 'unit') {
                    // Handle unit literals
                    components.push({
                        type: 'literal',
                        value: value + nextToken.value,
                        parsedValue: types_1.SemanticParsers.parseOrError(value + nextToken.value),
                    });
                    pos += 2;
                }
                else if (nextToken?.type === 'identifier' && isPerIdentifier(nextToken.value)) {
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
                        parsedValue: types_1.SemanticParsers.parseOrError(value),
                    });
                    pos++;
                }
                else if (nextToken?.type === 'identifier') {
                    const combined = `${value} ${nextToken.value}`;
                    const parsed = types_1.SemanticParsers.parse(combined);
                    if (parsed) {
                        components.push({
                            type: 'literal',
                            value: combined,
                            parsedValue: parsed,
                        });
                        pos += 2;
                    }
                    else {
                        components.push({
                            type: 'literal',
                            value,
                            parsedValue: types_1.SemanticParsers.parseOrError(value),
                        });
                        pos++;
                    }
                }
                else if (nextToken?.type === 'currency') {
                    // Handle currency literals with suffix symbols (e.g., 100$)
                    components.push({
                        type: 'literal',
                        value: value + nextToken.value,
                        parsedValue: types_1.SemanticParsers.parseOrError(value + nextToken.value),
                    });
                    pos += 2;
                }
                else if (nextToken?.type === 'operator' && nextToken.value === '/') {
                    const { unitTokens, nextPos } = collectUnitTokens(tokens, pos + 2);
                    if (unitTokens.length > 0) {
                        const literal = [token, nextToken, ...unitTokens].map((t) => t.value).join(" ");
                        const parsed = types_1.SemanticParsers.parse(literal);
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
                        parsedValue: types_1.SemanticParsers.parseOrError(value),
                    });
                    pos++;
                }
                else {
                    // Plain number
                    components.push({
                        type: 'literal',
                        value,
                        parsedValue: types_1.SemanticParsers.parseOrError(value),
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
                const tryCurrencyUnitLiteral = (unitStart) => {
                    const { unitTokens, nextPos } = collectUnitTokens(tokens, unitStart);
                    if (unitTokens.length === 0) {
                        return false;
                    }
                    const literalTokens = tokens.slice(pos, unitStart).concat(unitTokens);
                    const literal = literalTokens.map((t) => t.value).join(" ");
                    const parsed = types_1.SemanticParsers.parse(literal);
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
                    const perLiteral = buildPerLiteral(`${value}${nextToken.value}`, separatorToken, tokens, pos + 3);
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
                    parsedValue: types_1.SemanticParsers.parseOrError(value + nextToken.value),
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
                            if (current.value === '(')
                                depth++;
                            if (current.value === ')')
                                depth--;
                        }
                        if (depth === 0)
                            break;
                        pos++;
                    }
                    if (depth !== 0) {
                        throw new Error('Unmatched opening parenthesis');
                    }
                    const innerTokens = tokens.slice(start, pos);
                    if (innerTokens.length === 0) {
                        throw new Error('Empty parentheses');
                    }
                    const subComponents = parseExpressionComponents(innerTokens.map((t) => t.value).join(''));
                    components.push({
                        type: 'parentheses',
                        value: '()',
                        children: subComponents,
                    });
                    pos++; // consume closing ')'
                }
                else {
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
function isPerIdentifier(value) {
    return /^per\b/i.test(value.trim());
}
function buildPerLiteral(baseValue, perToken, tokens, unitStartPos) {
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
    const parsed = types_1.SemanticParsers.parse(literal);
    if (!parsed) {
        return null;
    }
    return { literal, parsed, nextPos };
}
function collectUnitTokens(tokens, startPos) {
    const unitTokens = [];
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
function parseFunctionArguments(tokens, startPos) {
    const args = [];
    let pos = startPos;
    let depth = 1;
    let currentTokens = [];
    const flushArg = () => {
        if (currentTokens.length === 0)
            return;
        const { name, valueTokens } = splitNamedArgument(currentTokens);
        const expression = valueTokens.map((t) => t.value).join(" ");
        const components = parseExpressionComponents(expression);
        args.push({ name, components });
        currentTokens = [];
    };
    while (pos < tokens.length && depth > 0) {
        const current = tokens[pos];
        if (current.type === 'parentheses') {
            if (current.value === '(')
                depth++;
            if (current.value === ')')
                depth--;
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
function splitNamedArgument(tokens) {
    let depth = 0;
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token.type === 'parentheses') {
            if (token.value === '(')
                depth++;
            if (token.value === ')')
                depth = Math.max(0, depth - 1);
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
