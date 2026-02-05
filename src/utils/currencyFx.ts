import { CurrencySymbol, CurrencyUnitValue, CurrencyValue, ErrorValue, SemanticValue } from "../types";
import type { EvaluationContext } from "../eval/registry";
import type { Variable } from "../state/types";
import { getCachedFxRate } from "../services/fxRates";

const normalizeCurrencyCode = (value: string): string | null => {
  const symbol = CurrencyValue.normalizeSymbol(value);
  if (!symbol) return null;
  return CurrencyValue.getCurrencyCode(symbol);
};

const buildManualRateMap = (
  variableContext: Map<string, Variable>
): Map<string, Map<string, number>> => {
  const rates = new Map<string, Map<string, number>>();
  variableContext.forEach((variable, name) => {
    const fromCode = normalizeCurrencyCode(name);
    if (!fromCode) return;
    if (!(variable.value instanceof CurrencyValue)) return;
    const toCode = CurrencyValue.getCurrencyCode(variable.value.getSymbol());
    if (!toCode || toCode === fromCode) return;
    let target = rates.get(fromCode);
    if (!target) {
      target = new Map();
      rates.set(fromCode, target);
    }
    target.set(toCode, variable.value.getNumericValue());
  });
  return rates;
};

const getManualFxRate = (
  variableContext: Map<string, Variable>,
  fromCode: string,
  toCode: string
): number | null => {
  const rates = buildManualRateMap(variableContext);
  const direct = rates.get(fromCode)?.get(toCode);
  if (direct) return direct;
  const inverse = rates.get(toCode)?.get(fromCode);
  if (inverse) return 1 / inverse;
  return null;
};

export const convertCurrencyValue = (
  value: CurrencyValue,
  targetSymbol: CurrencySymbol,
  context: EvaluationContext
): SemanticValue => {
  const fromCode = CurrencyValue.getCurrencyCode(value.getSymbol());
  const toCode = CurrencyValue.getCurrencyCode(targetSymbol);
  if (fromCode === toCode) {
    return new CurrencyValue(targetSymbol, value.getNumericValue());
  }

  const manualRate = getManualFxRate(context.variableContext, fromCode, toCode);
  const rate = manualRate ?? getCachedFxRate(fromCode, toCode);
  if (!rate) {
    return ErrorValue.conversionError(`No FX rate available for ${fromCode} -> ${toCode}`, "currency", "currency");
  }
  return value.convertTo(targetSymbol, rate);
};

export const convertCurrencyUnitValue = (
  value: CurrencyUnitValue,
  targetSymbol: CurrencySymbol,
  targetUnit: string,
  displayUnit: string,
  scale: number,
  context: EvaluationContext
): SemanticValue => {
  let converted: CurrencyUnitValue = value;
  if (targetUnit && targetUnit !== value.getUnit()) {
    try {
      converted = value.convertTo(targetUnit);
    } catch (error) {
      return ErrorValue.semanticError(
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  if (scale !== 1) {
    converted = new CurrencyUnitValue(
      converted.getSymbol() as CurrencySymbol,
      converted.getNumericValue() / scale,
      displayUnit,
      converted.isPerUnit()
    );
  }

  const fromCode = CurrencyValue.getCurrencyCode(converted.getSymbol() as CurrencySymbol);
  const toCode = CurrencyValue.getCurrencyCode(targetSymbol);
  if (fromCode === toCode) {
    if (targetSymbol !== converted.getSymbol()) {
      return new CurrencyUnitValue(
        targetSymbol,
        converted.getNumericValue(),
        converted.getUnit(),
        converted.isPerUnit()
      );
    }
    return converted;
  }

  const manualRate = getManualFxRate(context.variableContext, fromCode, toCode);
  const rate = manualRate ?? getCachedFxRate(fromCode, toCode);
  if (!rate) {
    return ErrorValue.conversionError(`No FX rate available for ${fromCode} -> ${toCode}`, "currency", "currency");
  }
  return new CurrencyUnitValue(
    targetSymbol,
    converted.getNumericValue() * rate,
    converted.getUnit(),
    converted.isPerUnit()
  );
};

export const normalizeCurrencyTargetSymbol = (value: string): CurrencySymbol | null => {
  return CurrencyValue.normalizeSymbol(value);
};
