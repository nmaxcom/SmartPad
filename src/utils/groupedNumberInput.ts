const GROUPED_NUMBER_PATTERN = /^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/;
const CURRENCY_SYMBOL_PATTERN = /[$€£¥₹₿]/;
const CURRENCY_CODE_PATTERN = /^[A-Za-z]{3}$/;

const stripSign = (value: string): string =>
  value.replace(/^[+-]\s*/, "").trim();

const unwrapCurrency = (value: string): string | null => {
  const trimmed = stripSign(value);
  if (!trimmed) return null;

  if (CURRENCY_SYMBOL_PATTERN.test(trimmed[0])) {
    return trimmed.slice(1).trim();
  }

  if (CURRENCY_SYMBOL_PATTERN.test(trimmed[trimmed.length - 1])) {
    return trimmed.slice(0, -1).trim();
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 2) {
    if (CURRENCY_CODE_PATTERN.test(parts[0])) {
      return parts[1];
    }
    if (CURRENCY_CODE_PATTERN.test(parts[1])) {
      return parts[0];
    }
  }

  return trimmed;
};

export const isGroupedNumericLiteral = (raw: string): boolean => {
  const candidate = unwrapCurrency(raw);
  if (!candidate) return false;
  return GROUPED_NUMBER_PATTERN.test(candidate);
};

export const GROUPED_NUMERIC_INPUT_ERROR =
  "Thousands separators in input are not supported; use plain digits (e.g., 2000).";
