import { DateTime } from "luxon";

export type LocaleDateRewriteResult = {
  expression: string;
  errors: string[];
};

const LOCALE_REGEX: Record<string, RegExp> = {
  "es-ES": /\b(\d{2})[/-](\d{2})[/-](\d{4})\b/g,
};

const NUMERIC_DATE_LITERAL_REGEX = /\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/g;
type LocaleDateOrder = "mdy" | "dmy";

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

const getLocaleDateOrder = (locale?: string): LocaleDateOrder | null => {
  if (!locale?.trim()) {
    return null;
  }
  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(new Date(2006, 3, 23));
    const order = parts
      .filter((part) => part.type === "day" || part.type === "month" || part.type === "year")
      .map((part) => part.type);
    return order[0] === "day" ? "dmy" : "mdy";
  } catch {
    return null;
  }
};

export const rewriteLocaleDateLiterals = (
  expression: string,
  locale?: string
): LocaleDateRewriteResult => {
  const pattern = locale ? LOCALE_REGEX[locale] : undefined;
  const stringRanges = collectStringRanges(expression);
  const localeOrder = getLocaleDateOrder(locale);

  if (!localeOrder) {
    return { expression, errors: [] };
  }

  const errors: string[] = [];
  const rewritePattern = pattern ?? NUMERIC_DATE_LITERAL_REGEX;
  const rewritten = expression.replace(
    rewritePattern,
    (match, firstPart, secondPart, year, offset) => {
    if (typeof offset === "number" && isIndexInsideRange(offset, stringRanges)) {
      return match;
    }
    const day = localeOrder === "dmy" ? Number(firstPart) : Number(secondPart);
    const month = localeOrder === "dmy" ? Number(secondPart) : Number(firstPart);
    const parsed = DateTime.fromObject({
      day,
      month,
      year: Number(year),
    });
    if (!parsed.isValid) {
      errors.push(`Invalid date literal "${match}"`);
      return match;
    }
    return `${parsed.year.toString().padStart(4, "0")}-${parsed.month
      .toString()
      .padStart(2, "0")}-${parsed.day.toString().padStart(2, "0")}`;
    }
  );

  return {
    expression: rewritten,
    errors,
  };
};
