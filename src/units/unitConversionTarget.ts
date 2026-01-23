export interface ParsedUnitTarget {
  unit: string;
  scale: number;
  displayUnit: string;
}

type TokenType = "number" | "ident" | "op" | "lparen" | "rparen";

interface Token {
  type: TokenType;
  value: string;
}

const isUnitChar = (ch: string) => /[A-Za-z°µμΩ0-9]/.test(ch);
const isNumberChar = (ch: string) => /[\d.]/.test(ch);

const tokenize = (input: string): Token[] => {
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < input.length) {
    const ch = input[pos];
    if (/\s/.test(ch)) {
      pos += 1;
      continue;
    }
    if (ch === "(") {
      tokens.push({ type: "lparen", value: ch });
      pos += 1;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "rparen", value: ch });
      pos += 1;
      continue;
    }
    if ("*/^".includes(ch)) {
      tokens.push({ type: "op", value: ch });
      pos += 1;
      continue;
    }
    if (ch === "·") {
      tokens.push({ type: "op", value: "*" });
      pos += 1;
      continue;
    }
    if (isNumberChar(ch)) {
      let value = "";
      while (pos < input.length && isNumberChar(input[pos])) {
        value += input[pos];
        pos += 1;
      }
      tokens.push({ type: "number", value });
      continue;
    }
    if (isUnitChar(ch)) {
      let value = "";
      while (pos < input.length) {
        const current = input[pos];
        if (isUnitChar(current)) {
          value += current;
          pos += 1;
          continue;
        }
        if (/\s/.test(current)) {
          let lookahead = pos;
          while (lookahead < input.length && /\s/.test(input[lookahead])) {
            lookahead += 1;
          }
          if (lookahead < input.length && isUnitChar(input[lookahead])) {
            value += " ";
            pos = lookahead;
            continue;
          }
        }
        break;
      }
      tokens.push({ type: "ident", value });
      continue;
    }
    return [];
  }

  return tokens;
};

type UnitExpr = { scale: number; unit: string };

const combineUnits = (left: string, right: string, op: "*" | "/"): string => {
  if (!left) return right;
  if (!right) return left;
  if (op === "*") {
    return `${left}*${right}`;
  }
  const needsParens = right.includes("*") || right.includes("/");
  return `${left}/${needsParens ? `(${right})` : right}`;
};

const applyExponent = (unit: string, exponent: number): string => {
  if (!unit || exponent === 1) return unit;
  const needsParens = unit.includes("*") || unit.includes("/");
  const base = needsParens ? `(${unit})` : unit;
  return `${base}^${exponent}`;
};

class UnitTargetParser {
  private tokens: Token[];
  private index = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): UnitExpr | null {
    if (this.tokens.length === 0) return null;
    const expr = this.parseExpression();
    if (!expr) return null;
    if (this.index < this.tokens.length) return null;
    return expr;
  }

  private current(): Token | undefined {
    return this.tokens[this.index];
  }

  private consume(expected?: TokenType, value?: string): Token | null {
    const token = this.current();
    if (!token) return null;
    if (expected && token.type !== expected) return null;
    if (value && token.value !== value) return null;
    this.index += 1;
    return token;
  }

  private parseExpression(): UnitExpr | null {
    let left = this.parseFactor();
    if (!left) return null;
    while (true) {
      const token = this.current();
      if (token?.type === "op" && (token.value === "*" || token.value === "/")) {
        const op = this.consume("op")!.value as "*" | "/";
        const right = this.parseFactor();
        if (!right) return null;
        left = {
          scale: op === "*" ? left.scale * right.scale : left.scale / right.scale,
          unit: combineUnits(left.unit, right.unit, op),
        };
        continue;
      }
      if (token && (token.type === "ident" || token.type === "number" || token.type === "lparen")) {
        const right = this.parseFactor();
        if (!right) return null;
        left = {
          scale: left.scale * right.scale,
          unit: combineUnits(left.unit, right.unit, "*"),
        };
        continue;
      }
      break;
    }
    return left;
  }

  private parseFactor(): UnitExpr | null {
    let base = this.parsePrimary();
    if (!base) return null;
    if (this.current()?.type === "op" && this.current()?.value === "^") {
      this.consume("op", "^");
      const expToken = this.consume("number");
      if (!expToken) return null;
      const exponent = parseFloat(expToken.value);
      if (!Number.isFinite(exponent)) return null;
      base = {
        scale: Math.pow(base.scale, exponent),
        unit: applyExponent(base.unit, exponent),
      };
    }
    return base;
  }

  private parsePrimary(): UnitExpr | null {
    const token = this.current();
    if (!token) return null;
    if (token.type === "number") {
      this.consume("number");
      const value = parseFloat(token.value);
      if (!Number.isFinite(value)) return null;
      return { scale: value, unit: "" };
    }
    if (token.type === "ident") {
      this.consume("ident");
      return { scale: 1, unit: token.value };
    }
    if (token.type === "lparen") {
      this.consume("lparen");
      const inner = this.parseExpression();
      if (!inner) return null;
      if (!this.consume("rparen")) return null;
      return inner;
    }
    return null;
  }
}

export const parseUnitTargetWithScale = (raw: string): ParsedUnitTarget | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const displayUnit = trimmed.replace(/\s+/g, " ").trim();
  const tokens = tokenize(displayUnit);
  if (tokens.length === 0) return null;
  const parser = new UnitTargetParser(tokens);
  const parsed = parser.parse();
  if (!parsed || !parsed.unit) return null;

  return {
    unit: parsed.unit,
    scale: parsed.scale,
    displayUnit,
  };
};
