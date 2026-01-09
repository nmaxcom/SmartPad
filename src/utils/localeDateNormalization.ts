import { DateTime } from "luxon";

export type LocaleDateRewriteResult = {
  expression: string;
  errors: string[];
};

const LOCALE_REGEX: Record<string, RegExp> = {
  "es-ES": /\b(0[1-9]|[12]\d|3[01])[/-](0[1-9]|1[0-2])[/-](\d{4})\b/g,
};

export const rewriteLocaleDateLiterals = (
  expression: string,
  locale?: string
): LocaleDateRewriteResult => {
  if (!locale) {
    return { expression, errors: [] };
  }

  const pattern = LOCALE_REGEX[locale];
  if (!pattern) {
    return { expression, errors: [] };
  }

  const errors: string[] = [];
  const rewritten = expression.replace(pattern, (match, day, month, year) => {
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
