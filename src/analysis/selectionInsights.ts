import {
  CurrencyUnitValue,
  CurrencyValue,
  ErrorValue,
  NumberValue,
  SemanticArithmetic,
  SemanticParsers,
  SemanticValue,
  SemanticValueTypes,
  UnitValue,
} from "../types";
import { containsUncertaintyExpression } from "../utils/uncertaintyExpression";

export interface SelectedSemanticValue {
  raw: string;
  value: SemanticValue;
}

export interface SelectionInsightGroup {
  key: string;
  label: string;
  count: number;
  literals: string[];
  sum: SemanticValue;
  mean: SemanticValue;
  min: SemanticValue;
  max: SemanticValue;
}

const NUMBER_TOKEN = "[+-]?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?";
const VALUE_TOKEN_REGEX = new RegExp(
  `(?:[\\$€£¥₹₿]\\s*${NUMBER_TOKEN}|${NUMBER_TOKEN}\\s*(?:%|CHF|CAD|AUD|USD|EUR|GBP|JPY|INR|BTC|ETH|USDT|USDC|BNB|XRP|SOL|ADA|DOGE|LTC|DOT|AVAX|MATIC|TRX|LINK|[A-Za-z°µμΩ][A-Za-z0-9°µμΩ/*^.-]*)?)`,
  "g"
);

const cleanCandidate = (candidate: string): string =>
  candidate.trim().replace(/[;,]+$/, "").trim();

const isEmbeddedNumericMatch = (
  segment: string,
  start: number,
  end: number
): boolean => {
  const before = segment[start - 1];
  const after = segment[end];
  if (/[A-Za-z0-9_]/.test(before || "") || /[A-Za-z0-9_]/.test(after || "")) {
    return true;
  }
  const separatorBefore = /[.\-/]/.test(before || "") && /\d/.test(segment[start - 2] || "");
  const separatorAfter = /[.\-/]/.test(after || "") && /\d/.test(segment[end + 1] || "");
  return separatorBefore || separatorAfter;
};

const addCandidate = (
  output: SelectedSemanticValue[],
  seen: Set<string>,
  candidate: string,
  offsetKey: string
) => {
  const raw = cleanCandidate(candidate);
  if (!raw) return;
  const parsed = SemanticParsers.parse(raw);
  if (!parsed || !parsed.isNumeric() || SemanticValueTypes.isList(parsed)) return;
  const dedupeKey = `${offsetKey}:${raw}`;
  if (seen.has(dedupeKey)) return;
  seen.add(dedupeKey);
  output.push({ raw, value: parsed });
};

export const extractSelectionSemanticValues = (text: string): SelectedSemanticValue[] => {
  const output: SelectedSemanticValue[] = [];
  const seen = new Set<string>();
  const segments = text.split(/\n|\|/);
  let runningOffset = 0;

  segments.forEach((segment, segmentIndex) => {
    const trimmed = segment.trim();
    if (!trimmed) {
      runningOffset += segment.length + 1;
      return;
    }
    // Until ± is accepted inside aggregate function arguments, avoid offering
    // an insertion that would flatten one uncertain value into two scalars.
    if (containsUncertaintyExpression(trimmed)) {
      runningOffset += segment.length + 1;
      return;
    }
    const direct = SemanticParsers.parse(trimmed);
    if (direct?.isNumeric() && !SemanticValueTypes.isList(direct)) {
      addCandidate(output, seen, trimmed, `${segmentIndex}:direct`);
      runningOffset += segment.length + 1;
      return;
    }
    for (const match of segment.matchAll(VALUE_TOKEN_REGEX)) {
      if (match.index === undefined) continue;
      if (isEmbeddedNumericMatch(segment, match.index, match.index + match[0].length)) {
        continue;
      }
      addCandidate(
        output,
        seen,
        match[0],
        `${segmentIndex}:${runningOffset + match.index}`
      );
    }
    runningOffset += segment.length + 1;
  });

  return output;
};

const groupKey = (value: SemanticValue): { key: string; label: string } => {
  if (SemanticValueTypes.isCurrency(value)) {
    const symbol = (value as CurrencyValue).getSymbol();
    return { key: `currency:${symbol}`, label: String(symbol) };
  }
  if (SemanticValueTypes.isCurrencyUnit(value)) {
    const typed = value as CurrencyUnitValue;
    return {
      key: `currencyUnit:${typed.getSymbol()}:${typed.getUnit()}:${typed.isPerUnit()}`,
      label: `${typed.getSymbol()}${typed.isPerUnit() ? "/" : "·"}${typed.getUnit()}`,
    };
  }
  if (SemanticValueTypes.isUnit(value)) {
    const typed = value as UnitValue;
    return {
      key: `unit:${typed.getQuantity().toBaseUnit().unit}`,
      label: typed.getUnit(),
    };
  }
  if (SemanticValueTypes.isDuration(value)) {
    return { key: "duration", label: "duration" };
  }
  if (SemanticValueTypes.isPercentage(value)) {
    return { key: "percentage", label: "%" };
  }
  return { key: "number", label: "numbers" };
};

const summarizeGroup = (
  key: string,
  label: string,
  values: SelectedSemanticValue[]
): SelectionInsightGroup | null => {
  if (values.length < 2) return null;
  let sum = values[0].value;
  for (const item of values.slice(1)) {
    const next = SemanticArithmetic.add(sum, item.value);
    if (next instanceof ErrorValue) return null;
    sum = next;
  }
  const mean = SemanticArithmetic.divide(sum, new NumberValue(values.length));
  if (mean instanceof ErrorValue) return null;
  const ordered = [...values].sort(
    (left, right) => left.value.getNumericValue() - right.value.getNumericValue()
  );
  return {
    key,
    label,
    count: values.length,
    literals: values.map((item) => item.raw),
    sum,
    mean,
    min: ordered[0].value,
    max: ordered[ordered.length - 1].value,
  };
};

export const computeSelectionInsightGroups = (
  text: string
): SelectionInsightGroup[] => {
  const values = extractSelectionSemanticValues(text);
  const groups = new Map<
    string,
    { label: string; values: SelectedSemanticValue[] }
  >();
  values.forEach((item) => {
    const identity = groupKey(item.value);
    const group = groups.get(identity.key) || { label: identity.label, values: [] };
    group.values.push(item);
    groups.set(identity.key, group);
  });

  return Array.from(groups.entries())
    .map(([key, group]) => summarizeGroup(key, group.label, group.values))
    .filter((group): group is SelectionInsightGroup => !!group)
    .sort((left, right) => right.count - left.count)
    .slice(0, 3);
};
