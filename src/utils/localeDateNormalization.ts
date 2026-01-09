import { DateTime } from "luxon";

export type LocaleDateRewriteResult = {
  expression: string;
  errors: string[];
};

const LOCALE_REGEX: Record<string, RegExp> = {
  "es-ES": /\b(\d{2})[/-](\d{2})[/-](\d{4})\b/g,
};

const GENERIC_DMY_REGEX = /\b\d{2}[/-]\d{2}[/-]\d{4}\b/g;

const collectStringRanges = (expression: string): Array<[number, number]> => {
  const ranges: Array<[number, number]> = [];
  let inSingle = false;
  let inDouble = false;
  let start = -1;

  for (let idx = 0; idx < expression.length; idx += 1) {
    const char = expression[idx];
    if (char === "\\" && (inSingle || inDouble)) {
      idx += 1;
      continue;
    }
    if (char === '"' && !inSingle) {
      if (inDouble) {
        ranges.push([start, idx + 1]);
        start = -1;
      } else {
        start = idx;
      }
      inDouble = !inDouble;
      continue;
    }
    if (char === "'" && !inDouble) {
      if (inSingle) {
        ranges.push([start, idx + 1]);
        start = -1;
      } else {
        start = idx;
      }
      inSingle = !inSingle;
      continue;
    }
  }

  return ranges;
};

const isIndexInsideRange = (index: number, ranges: Array<[number, number]>): boolean =>
  ranges.some(([start, end]) => index >= start && index < end);

export const rewriteLocaleDateLiterals = (
  expression: string,
  locale?: string
): LocaleDateRewriteResult => {
  const pattern = locale ? LOCALE_REGEX[locale] : undefined;
  const stringRanges = collectStringRanges(expression);

  if (!pattern) {
    const match = Array.from(expression.matchAll(GENERIC_DMY_REGEX)).find(
      (candidate) => !isIndexInsideRange(candidate.index ?? 0, stringRanges)
    );
    if (match?.[0]) {
      return {
        expression,
        errors: [
          `Unsupported date format "${match[0]}". Use ISO "YYYY-MM-DD".`,
        ],
      };
    }
    return { expression, errors: [] };
  }

  const errors: string[] = [];
  const rewritten = expression.replace(pattern, (match, day, month, year, offset) => {
    if (typeof offset === "number" && isIndexInsideRange(offset, stringRanges)) {
      return match;
    }
    const parsed = DateTime.fromObject({
      day: Number(day),
      month: Number(month),
      year: Number(year),
    });
    if (!parsed.isValid) {
      errors.push(`Invalid date literal "${match}"`);
      return match;
    }
    return `${parsed.year.toString().padStart(4, "0")}-${parsed.month
      .toString()
      .padStart(2, "0")}-${parsed.day.toString().padStart(2, "0")}`;
  });

  return {
    expression: rewritten,
    errors,
  };
};
