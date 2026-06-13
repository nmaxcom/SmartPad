const UNIT_START_RE = /[a-zA-Z°µμΩ]/;
const UNIT_BODY_RE = /[a-zA-Z0-9°µμΩ]/;

const skipWhitespace = (input: string, position: number): number => {
  let cursor = position;
  while (cursor < input.length && /\s/.test(input[cursor])) {
    cursor += 1;
  }
  return cursor;
};

const scanExponent = (input: string, position: number): number => {
  if (input[position] !== "^") {
    return position;
  }

  let cursor = position + 1;
  if (input[cursor] === "+" || input[cursor] === "-") {
    cursor += 1;
  }

  const digitStart = cursor;
  while (cursor < input.length && /\d/.test(input[cursor])) {
    cursor += 1;
  }

  return cursor > digitStart ? cursor : position;
};

const scanOperand = (input: string, position: number): number => {
  let cursor = skipWhitespace(input, position);

  if (input[cursor] === "(") {
    const groupStart = cursor;
    cursor += 1;
    cursor = scanExpression(input, cursor);
    cursor = skipWhitespace(input, cursor);
    if (input[cursor] !== ")") {
      return groupStart;
    }
    return scanExponent(input, cursor + 1);
  }

  if (!UNIT_START_RE.test(input[cursor] ?? "")) {
    return position;
  }

  cursor += 1;
  while (cursor < input.length && UNIT_BODY_RE.test(input[cursor])) {
    cursor += 1;
  }

  return scanExponent(input, cursor);
};

const scanExpression = (input: string, position: number): number => {
  let cursor = scanOperand(input, position);
  if (cursor === position) {
    return position;
  }

  while (cursor < input.length) {
    const operatorStart = skipWhitespace(input, cursor);
    const operator = input[operatorStart];
    if (operator !== "*" && operator !== "/" && operator !== "·") {
      break;
    }

    const operandStart = operatorStart + 1;
    const nextOperand = scanOperand(input, operandStart);
    if (nextOperand === operandStart || nextOperand === skipWhitespace(input, operandStart)) {
      break;
    }

    cursor = nextOperand;
  }

  return cursor;
};

export const isUnitExpressionStart = (char: string | undefined): boolean =>
  UNIT_START_RE.test(char ?? "");

export function scanUnitExpression(input: string, start: number = 0): string | null {
  const end = scanExpression(input, start);
  if (end <= start) {
    return null;
  }
  return input.slice(start, end);
}
