import { parseUnitTargetWithScale } from "../units/unitConversionTarget";
import { SmartPadQuantity } from "../units/unitsnetAdapter";
import { CurrencyValue } from "../types/CurrencyValue";

const isBoundary = (char: string | undefined): boolean =>
  !char || /[\s+\-*/^%()=<>!,]/.test(char);

const looksLikeUnitTarget = (raw: string): boolean => {
  let trimmed = raw.trim();
  if (!trimmed) return false;

  const symbolMatch = trimmed.match(/^([$€£¥₹₿])\s*(.*)$/);
  const codeMatch = trimmed.match(/^([A-Za-z]{3})\b(.*)$/);
  if (symbolMatch) {
    trimmed = symbolMatch[2].trim();
  } else if (codeMatch && CurrencyValue.normalizeSymbol(codeMatch[1])) {
    trimmed = codeMatch[2].trim();
  }

  trimmed = trimmed.replace(/^per\b/i, "").trim();
  trimmed = trimmed.replace(/^[/*]+/, "").trim();

  if (!trimmed) {
    return Boolean(symbolMatch) || Boolean(codeMatch);
  }

  const parsed = parseUnitTargetWithScale(trimmed);
  if (!parsed) return false;

  try {
    SmartPadQuantity.fromValueAndUnit(1, parsed.unit);
    return true;
  } catch {
    return false;
  }
};

export const extractConversionSuffix = (
  expression: string
): { baseExpression: string; target: string; keyword: string } | null => {
  const candidates: Array<{ index: number; keyword: string }> = [];
  let depth = 0;
  let inString: string | null = null;

  for (let i = 0; i < expression.length; i += 1) {
    const char = expression[i];

    if (inString) {
      if (char === "\\" && i + 1 < expression.length) {
        i += 1;
        continue;
      }
      if (char === inString) {
        inString = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = char;
      continue;
    }

    if (char === "(") {
      depth += 1;
      continue;
    }
    if (char === ")") {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth > 0) continue;

    const slice = expression.slice(i);
    if (slice.toLowerCase().startsWith("to")) {
      const before = expression[i - 1];
      const after = expression[i + 2];
      if (isBoundary(before) && isBoundary(after)) {
        candidates.push({ index: i, keyword: "to" });
        i += 1;
        continue;
      }
    }
    if (slice.toLowerCase().startsWith("in")) {
      const before = expression[i - 1];
      const after = expression[i + 2];
      if (isBoundary(before) && isBoundary(after)) {
        candidates.push({ index: i, keyword: "in" });
        i += 1;
      }
    }
  }

  for (let i = candidates.length - 1; i >= 0; i -= 1) {
    const candidate = candidates[i];
    const baseExpression = expression.slice(0, candidate.index).trim();
    const target = expression.slice(candidate.index + candidate.keyword.length).trim();

    if (!baseExpression || !target) continue;
    if (!looksLikeUnitTarget(target)) continue;

    return { baseExpression, target, keyword: candidate.keyword };
  }

  return null;
};

export const findDanglingConversionKeyword = (
  expression: string
): { keyword: string } | null => {
  const candidates: Array<{ index: number; keyword: string }> = [];
  let depth = 0;
  let inString: string | null = null;

  for (let i = 0; i < expression.length; i += 1) {
    const char = expression[i];

    if (inString) {
      if (char === "\\" && i + 1 < expression.length) {
        i += 1;
        continue;
      }
      if (char === inString) {
        inString = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = char;
      continue;
    }

    if (char === "(") {
      depth += 1;
      continue;
    }
    if (char === ")") {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth > 0) continue;

    const slice = expression.slice(i);
    if (slice.toLowerCase().startsWith("to")) {
      const before = expression[i - 1];
      const after = expression[i + 2];
      if (isBoundary(before) && isBoundary(after)) {
        candidates.push({ index: i, keyword: "to" });
        i += 1;
        continue;
      }
    }
    if (slice.toLowerCase().startsWith("in")) {
      const before = expression[i - 1];
      const after = expression[i + 2];
      if (isBoundary(before) && isBoundary(after)) {
        candidates.push({ index: i, keyword: "in" });
        i += 1;
      }
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  for (let i = candidates.length - 1; i >= 0; i -= 1) {
    const candidate = candidates[i];
    const baseExpression = expression.slice(0, candidate.index).trim();
    const target = expression.slice(candidate.index + candidate.keyword.length).trim();
    if (!baseExpression) {
      continue;
    }
    if (!target) {
      return { keyword: candidate.keyword };
    }
    if (looksLikeUnitTarget(target)) {
      return null;
    }
  }

  return null;
};
