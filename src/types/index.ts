/**
 * @file SmartPad Semantic Type System
 * @description Export all semantic value types and utilities for the new type system.
 * This replaces the fragile string-based approach with proper semantic types.
 */

// Base types and interfaces
import { SemanticValue, type SemanticValueType, type DisplayOptions } from './SemanticValue';

// Concrete semantic value implementations  
import { NumberValue } from './NumberValue';
import { PercentageValue, type PercentageContext } from './PercentageValue';
import { CurrencyValue, type CurrencySymbol } from './CurrencyValue';
import { CurrencyUnitValue } from './CurrencyUnitValue';
import { UnitValue } from './UnitValue';
import { UnitValueWithDisplay } from './UnitValueWithDisplay';
import { DateValue } from './DateValue';
import { TimeValue } from './TimeValue';
import { DurationValue } from './DurationValue';
import type { DurationUnit } from './DurationValue';
import { ErrorValue, type ErrorType, type ErrorContext } from './ErrorValue';
import { SymbolicValue } from './SymbolicValue';
import { ListValue } from './ListValue';
import { getListMaxLength } from './listConfig';
import { SmartPadQuantity } from '../units/unitsnetAdapter';
import { defaultUnitRegistry } from '../units/definitions';

// Re-export base types
export { SemanticValue, type SemanticValueType, type DisplayOptions };

// Re-export all types
export { NumberValue };
export { PercentageValue, type PercentageContext };
export { CurrencyValue, type CurrencySymbol };
export { CurrencyUnitValue };
export { UnitValue };
export { UnitValueWithDisplay };
export { DateValue };
export { TimeValue };
export { DurationValue };
export { ErrorValue, type ErrorType, type ErrorContext };
export { SymbolicValue };
export { ListValue };

// Type guards and utilities
export const SemanticValueTypes = {
  isNumber: (value: SemanticValue): value is NumberValue => value.getType() === 'number',
  isPercentage: (value: SemanticValue): value is PercentageValue => value.getType() === 'percentage',
  isCurrency: (value: SemanticValue): value is CurrencyValue => value.getType() === 'currency',
  isCurrencyUnit: (value: SemanticValue): value is CurrencyUnitValue => value.getType() === 'currencyUnit',
  isUnit: (value: SemanticValue): value is UnitValue => value.getType() === 'unit',
  isDate: (value: SemanticValue): value is DateValue => value.getType() === 'date',
  isTime: (value: SemanticValue): value is TimeValue => value.getType() === 'time',
  isDuration: (value: SemanticValue): value is DurationValue => value.getType() === 'duration',
  isError: (value: SemanticValue): value is ErrorValue => value.getType() === 'error',
  isSymbolic: (value: SemanticValue): value is SymbolicValue => value.getType() === 'symbolic',
  isList: (value: SemanticValue): value is ListValue => value.getType() === 'list',
} as const;

// Factory functions for creating semantic values
export const SemanticValues = {
  /**
   * Create a NumberValue from various inputs
   */
  number: (value: number | string): NumberValue => NumberValue.from(value),
  
  /**
   * Create a PercentageValue from display percentage
   */
  percentage: (displayPercent: number): PercentageValue => new PercentageValue(displayPercent),
  
  /**
   * Create a CurrencyValue from symbol and amount
   */
  currency: (symbol: CurrencySymbol, amount: number): CurrencyValue => new CurrencyValue(symbol, amount),

  /**
   * Create a CurrencyUnitValue from currency, unit string, and per-unit flag
   */
  currencyUnit: (symbol: CurrencySymbol, amount: number, unit: string, perUnit: boolean): CurrencyUnitValue =>
    new CurrencyUnitValue(symbol, amount, unit, perUnit),
  
  /**
   * Create a UnitValue from value and unit string
   */
  unit: (value: number, unit: string): UnitValue => UnitValue.fromValueAndUnit(value, unit),

  /**
   * Create a DateValue from a Date object
   */
  date: (value: Date): DateValue => DateValue.fromDate(value, { type: 'local', label: 'local' }, true),
  
  /**
   * Create an ErrorValue
   */
  error: (type: ErrorType, message: string, context?: ErrorContext): ErrorValue => 
    new ErrorValue(type, message, context),
    
  /**
   * Zero values for each type
   */
  zero: {
    number: (): NumberValue => NumberValue.zero(),
    percentage: (): PercentageValue => new PercentageValue(0),
    currency: (symbol: CurrencySymbol): CurrencyValue => new CurrencyValue(symbol, 0),
    unit: (unit: string): UnitValue => UnitValue.fromValueAndUnit(0, unit),
  },
  
  /**
   * One/unit values
   */
  one: {
    number: (): NumberValue => NumberValue.one(),
    percentage: (): PercentageValue => new PercentageValue(100), // 100%
  },
} as const;

// Parser utilities
const splitTopLevelCommas = (input: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of input) {
    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth = Math.max(0, depth - 1);
    }
    if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) {
    parts.push(current.trim());
  }
  return parts;
};

const stripEnclosingParentheses = (input: string): string => {
  let value = input.trim();
  while (value.startsWith("(") && value.endsWith(")") && hasMatchingOuterParentheses(value)) {
    value = value.slice(1, -1).trim();
  }
  return value;
};

const hasMatchingOuterParentheses = (input: string): boolean => {
  let depth = 0;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth -= 1;
      if (depth === 0 && i < input.length - 1) {
        return false;
      }
    }
  }
  return depth === 0;
};

const groupedNumberPattern = "(?:\\d{1,3}(?:,\\d{3})*|\\d+)(?:\\.\\d+)?";

const parseSingleValue = (input: string): SemanticValue | null => {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const isBuiltinUnitExpression = (unitString: string): boolean => {
    const tokens = unitString.split(/[^A-Za-z°µμΩ]+/).filter(Boolean);
    if (tokens.length === 0) return false;
    return tokens.every((token) => defaultUnitRegistry.isBuiltinSymbol(token));
  };

  const parseCurrencyUnit = (value: string): SemanticValue | null => {
    const perMatch = value.match(/^(.*?)\bper\b(.+)$/i);
    let left: string | null = null;
    let unit: string | null = null;
    if (perMatch) {
      left = perMatch[1].trim();
      unit = perMatch[2].trim();
    } else if (value.includes("/")) {
      const slashIndex = value.indexOf("/");
      left = value.slice(0, slashIndex).trim();
      unit = value.slice(slashIndex + 1).trim();
    }
    if (!left || !unit) return null;
    let currency: CurrencyValue;
    try {
      currency = CurrencyValue.fromString(left);
    } catch {
      return null;
    }
    const unitString = unit.replace(/\s+/g, "");
    if (!unitString || !/[a-zA-Z°µμΩ]/.test(unitString)) return null;
    if (/[*/^()]/.test(unitString)) {
      if (!isBuiltinUnitExpression(unitString)) return null;
    } else if (!defaultUnitRegistry.isKnownSymbol(unitString)) {
      return null;
    }
    try {
      SmartPadQuantity.fromValueAndUnit(1, unitString);
    } catch {
      return null;
    }
    return new CurrencyUnitValue(currency.getSymbol(), currency.getNumericValue(), unitString, true);
  };

  const parseUnitRate = (value: string): SemanticValue | null => {
    const perMatch = value.match(/^(.*?)\bper\b(.+)$/i);
    let left: string | null = null;
    let unit: string | null = null;
    if (perMatch) {
      left = perMatch[1].trim();
      unit = perMatch[2].trim();
    } else if (value.includes("/")) {
      const slashIndex = value.indexOf("/");
      left = value.slice(0, slashIndex).trim();
      unit = value.slice(slashIndex + 1).trim();
    }
    if (!left || !unit) return null;
    if (!left.match(/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/)) return null;
    const unitString = unit.replace(/\s+/g, "");
    if (!unitString || !/[a-zA-Z°µμΩ]/.test(unitString)) return null;
    if (/[*/^()]/.test(unitString)) {
      if (!isBuiltinUnitExpression(unitString)) return null;
    } else if (!defaultUnitRegistry.isKnownSymbol(unitString)) {
      return null;
    }
    try {
      SmartPadQuantity.fromValueAndUnit(1, `1/${unitString}`);
    } catch {
      return null;
    }
    return UnitValue.fromValueAndUnit(parseFloat(left), `1/${unitString}`);
  };

  const currencyUnit = parseCurrencyUnit(trimmed);
  if (currencyUnit) return currencyUnit;

  const unitRate = parseUnitRate(trimmed);
  if (unitRate) return unitRate;

  if (trimmed.match(/^-?\d+(?:\.\d+)?%$/)) {
    return new PercentageValue(parseFloat(trimmed));
  }

  if (
    trimmed.match(new RegExp(`^[+-]?\\s*[\$€£¥₹₿]\\s*${groupedNumberPattern}$`)) ||
    trimmed.match(new RegExp(`^[+-]?\\s*${groupedNumberPattern}\\s*[\$€£¥₹₿]$`)) ||
    trimmed.match(new RegExp(`^[+-]?\\s*${groupedNumberPattern}\\s+(CHF|CAD|AUD)$`))
  ) {
    try {
      return CurrencyValue.fromString(trimmed);
    } catch {
      return null;
    }
  }

  if (/[A-Z]/.test(trimmed) && UnitValue.isUnitString(trimmed)) {
    try {
      return UnitValue.fromString(trimmed);
    } catch {
      return null;
    }
  }

  const durationLiteral = DurationValue.parseLiteral(trimmed, {
    allowMinuteAlias: false,
    requireMultipleComponents: false,
  });
  if (durationLiteral) {
    return durationLiteral;
  }

  if (UnitValue.isUnitString(trimmed)) {
    try {
      return UnitValue.fromString(trimmed);
    } catch {
      return null;
    }
  }

  const timeValue = TimeValue.parse(trimmed);
  if (timeValue) {
    return timeValue;
  }

  if (!trimmed.includes(",")) {
    const dateValue = DateValue.parse(trimmed);
    if (dateValue) return dateValue;
  }

  if (trimmed.match(/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/)) {
    try {
      return NumberValue.from(trimmed);
    } catch {
      return null;
    }
  }

  // Fallback to symbolic representation for identifiers or phrase variables
  const identifierPattern = /^[a-zA-Z_][a-zA-Z0-9_\s]*$/;
  if (identifierPattern.test(trimmed)) {
    return SymbolicValue.from(trimmed);
  }

  return null;
};

const preferredDurationUnit = (unitString: string): string | null => {
  if (!unitString) return null;
  const match = unitString.match(/\/([A-Za-z°µμΩ]+)/);
  if (match) return match[1];
  return null;
};

const parseDurationUnitString = (unitString: string): DurationUnit | null => {
  const normalized = unitString.trim().toLowerCase();
  const base = normalized.replace(/[^a-z]/g, "");
  switch (base) {
    case "h":
    case "hr":
    case "hrs":
    case "hour":
    case "hours":
      return "hour";
    case "day":
    case "days":
    case "d":
      return "day";
    case "week":
    case "weeks":
    case "wk":
    case "w":
      return "week";
    case "month":
    case "months":
    case "mo":
    case "mos":
      return "month";
    case "year":
    case "years":
    case "yr":
    case "y":
      return "year";
    case "min":
    case "minute":
    case "minutes":
      return "minute";
    case "s":
    case "sec":
    case "secs":
    case "second":
    case "seconds":
      return "second";
    case "ms":
      return "millisecond";
    default:
      return null;
  }
};

const durationUnitSeconds: Record<DurationUnit, number> = {
  year: 365 * 24 * 60 * 60,
  month: 30 * 24 * 60 * 60,
  week: 7 * 24 * 60 * 60,
  businessDay: 24 * 60 * 60,
  day: 24 * 60 * 60,
  hour: 60 * 60,
  minute: 60,
  second: 1,
  millisecond: 1 / 1000,
};

const convertDurationScalar = (value: number, fromUnit: DurationUnit, toUnit: DurationUnit): number =>
  (value * durationUnitSeconds[fromUnit]) / durationUnitSeconds[toUnit];

const parseListLiteral = (input: string): SemanticValue | null => {
  const normalized = stripEnclosingParentheses(input);
  const currencyLiteralPatterns = [
    new RegExp(`^[\$€£¥₹₿]\\s*${groupedNumberPattern}$`),
    new RegExp(`^${groupedNumberPattern}\\s*[\$€£¥₹₿]$`),
    new RegExp(`^${groupedNumberPattern}\\s+(CHF|CAD|AUD)$`),
  ];
  const numberLiteralPattern = new RegExp(`^${groupedNumberPattern}$`);
  const groupedUnitPattern = new RegExp(`^${groupedNumberPattern}\\s*[A-Za-z°µμΩ]`);
  if (
    currencyLiteralPatterns.some((pattern) => pattern.test(normalized)) ||
    numberLiteralPattern.test(normalized) ||
    groupedUnitPattern.test(normalized)
  ) {
    return null;
  }
  const rawParts = splitTopLevelCommas(normalized);
  if (rawParts.length <= 1) return null;
  const parts = rawParts.map((part) => part.trim());
  if (parts.length > 1 && parts[parts.length - 1] === "") {
    parts.pop();
  }
  if (parts.length <= 1) return null;
  const maxLength = getListMaxLength();
  if (parts.length > maxLength) {
    return ErrorValue.semanticError(`Can't create lists longer than ${maxLength}`);
  }
  const items: SemanticValue[] = [];
  for (const part of parts) {
    if (!part) return null;
    const parsed = parseSingleValue(part);
    if (!parsed) return null;
    items.push(parsed);
  }
  if (items.length === 0) return null;
  const hasSpacing = /,\s+/.test(normalized);
  const delimiter = hasSpacing ? ", " : ",";
  return createListResult(items, delimiter);
};

export const SemanticParsers = {
  /**
   * Try to parse a string as a semantic value
   */
  parse: (str: string): SemanticValue | null => {
    if (!str) return null;
    const trimmed = str.trim();
    if (!trimmed) return null;
    const listValue = parseListLiteral(trimmed);
    if (listValue) return listValue;
    const single = parseSingleValue(trimmed);
    if (single) {
      return single;
    }
    return null;
  },
  
  /**
   * Parse with error handling
   */
  parseOrError: (str: string): SemanticValue => {
    if (!str) {
      return ErrorValue.parseError("Empty value provided for parsing");
    }
    
    const trimmed = str.trim();
    if (!trimmed) {
      return ErrorValue.parseError("Empty value provided for parsing");
    }
    
    const result = SemanticParsers.parse(str);
    if (result) {
      return result;
    }
    
    return ErrorValue.parseError(`Cannot parse "${str}" as any semantic value type`);
  },
} as const;
export { parseListLiteral, createListResult, mapListItems };
const createListResult = (items: SemanticValue[], delimiter = ", "): SemanticValue => {
  const maxLength = getListMaxLength();
  if (items.length > maxLength) {
    return ErrorValue.semanticError(`Can't create lists longer than ${maxLength}`);
  }
  if (items.length === 0) {
    return ListValue.fromItems(items);
  }
  const unitItems = items.filter((item) => item.getType() === "unit") as UnitValue[];
  const numberItems = items.filter((item) => item.getType() === "number") as NumberValue[];
  if (
    unitItems.length === 1 &&
    numberItems.length > 0 &&
    items.every((item) => item.getType() === "unit" || item.getType() === "number") &&
    items[items.length - 1].getType() === "unit"
  ) {
    const targetUnit = unitItems[0].getUnit();
    const targetSignature = unitItems[0].getQuantity().toBaseUnit().unit;
    const converted = items.map((item) => {
      if (item.getType() === "number") {
        return UnitValue.fromValueAndUnit(item.getNumericValue(), targetUnit);
      }
      const unitItem = item as UnitValue;
      const unitSignature = unitItem.getQuantity().toBaseUnit().unit;
      if (unitSignature !== targetSignature) {
        return ErrorValue.semanticError("Cannot create list: incompatible dimensions");
      }
      try {
        return unitItem.convertTo(targetUnit);
      } catch (error) {
        return ErrorValue.semanticError(
          error instanceof Error ? error.message : String(error)
        );
      }
    });
    const conversionError = converted.find((item) => item.getType() === "error");
    if (conversionError) {
      return conversionError as ErrorValue;
    }
    return createListResult(converted, delimiter);
  }
  const baseType = items[0].getType();
  let baseUnitSignature: string | null = null;
  if (baseType === "unit") {
    const unitItem = items[0] as UnitValue;
    baseUnitSignature = unitItem.getQuantity().toBaseUnit().unit;
  }
  for (const item of items) {
    if (item.getType() !== baseType) {
      if (
        (baseType === "unit" && item.getType() === "duration") ||
        (baseType === "duration" && item.getType() === "unit")
      ) {
        return ErrorValue.semanticError("Cannot create list: incompatible dimensions");
      }
      return ErrorValue.semanticError("Cannot create list: incompatible units");
    }
    if (baseType === "unit") {
      const unitItem = item as UnitValue;
      const itemSignature = unitItem.getQuantity().toBaseUnit().unit;
      if (itemSignature !== baseUnitSignature) {
        return ErrorValue.semanticError("Cannot create list: incompatible dimensions");
      }
    }
  }
  return ListValue.fromItems(items, delimiter);
};

const mapListItems = (
  list: ListValue,
  mapper: (value: SemanticValue) => SemanticValue
): SemanticValue => {
  const results: SemanticValue[] = [];
  for (const item of list.getItems()) {
    const mapped = mapper(item);
    if (SemanticValueTypes.isError(mapped)) {
      return mapped;
    }
    results.push(mapped);
  }
  return createListResult(results);
};

const zipListItems = (
  left: ListValue,
  right: ListValue,
  mapper: (leftItem: SemanticValue, rightItem: SemanticValue) => SemanticValue
): SemanticValue => {
  const leftItems = left.getItems();
  const rightItems = right.getItems();
  if (leftItems.length !== rightItems.length) {
    return ErrorValue.semanticError(
      `Cannot work with lists of different lengths (${leftItems.length} vs ${rightItems.length})`
    );
  }
  const results: SemanticValue[] = [];
  for (let i = 0; i < leftItems.length; i++) {
    const mapped = mapper(leftItems[i], rightItems[i]);
    if (SemanticValueTypes.isError(mapped)) {
      return mapped;
    }
    results.push(mapped);
  }
  return createListResult(results);
};

const handleListOperation = (
  left: SemanticValue,
  right: SemanticValue,
  operator: (leftValue: SemanticValue, rightValue: SemanticValue) => SemanticValue
): SemanticValue => {
  const leftIsList = SemanticValueTypes.isList(left);
  const rightIsList = SemanticValueTypes.isList(right);
  if (!leftIsList && !rightIsList) {
    return operator(left, right);
  }

  if (leftIsList && rightIsList) {
    return zipListItems(left as ListValue, right as ListValue, operator);
  }

  if (leftIsList) {
    return mapListItems(left as ListValue, (item) => operator(item, right));
  }

  return mapListItems(right as ListValue, (item) => operator(left, item));
};
// Arithmetic utilities
export const SemanticArithmetic = {
  /**
   * Add two semantic values with proper error handling
   */
  add: (left: SemanticValue, right: SemanticValue): SemanticValue => {
    try {
      if (SemanticValueTypes.isSymbolic(left) || SemanticValueTypes.isSymbolic(right)) {
        const base = SemanticValueTypes.isSymbolic(left) ? left : SymbolicValue.from(left.toString());
        return base.add(right);
      }
      return handleListOperation(left, right, (a, b) => a.add(b));
    } catch (error) {
      return ErrorValue.fromError(error as Error, 'runtime');
    }
  },
  
  /**
   * Subtract two semantic values with proper error handling
   */
  subtract: (left: SemanticValue, right: SemanticValue): SemanticValue => {
    try {
      if (SemanticValueTypes.isSymbolic(left) || SemanticValueTypes.isSymbolic(right)) {
        const base = SemanticValueTypes.isSymbolic(left) ? left : SymbolicValue.from(left.toString());
        return base.subtract(right);
      }
      return handleListOperation(left, right, (a, b) => a.subtract(b));
    } catch (error) {
      return ErrorValue.fromError(error as Error, 'runtime');
    }
  },
  
  /**
   * Multiply two semantic values with proper error handling
   */
  multiply: (left: SemanticValue, right: SemanticValue): SemanticValue => {
    try {
      if (SemanticValueTypes.isSymbolic(left) || SemanticValueTypes.isSymbolic(right)) {
        const base = SemanticValueTypes.isSymbolic(left) ? left : SymbolicValue.from(left.toString());
        return base.multiply(right);
      }
      if (left.getType() === "currencyUnit" && right.getType() === "unit") {
        const currencyUnit = left as CurrencyUnitValue;
        const leftUnit = parseDurationUnitString(currencyUnit.getUnit());
        const rightUnit = parseDurationUnitString((right as UnitValue).getUnit());
        if (leftUnit && rightUnit) {
          const scalar = convertDurationScalar(
            (right as UnitValue).getNumericValue(),
            rightUnit,
            leftUnit
          );
          return new CurrencyValue(
            currencyUnit.getSymbol() as CurrencySymbol,
            currencyUnit.getNumericValue() * scalar
          );
        }
      }
      if (right.getType() === "currencyUnit" && left.getType() === "unit") {
        const currencyUnit = right as CurrencyUnitValue;
        const rightUnit = parseDurationUnitString(currencyUnit.getUnit());
        const leftUnit = parseDurationUnitString((left as UnitValue).getUnit());
        if (leftUnit && rightUnit) {
          const scalar = convertDurationScalar(
            (left as UnitValue).getNumericValue(),
            leftUnit,
            rightUnit
          );
          return new CurrencyValue(
            currencyUnit.getSymbol() as CurrencySymbol,
            currencyUnit.getNumericValue() * scalar
          );
        }
      }
      if (SemanticValueTypes.isDuration(left) && (right.getType() === "unit" || right.getType() === "currencyUnit")) {
        if (right.getType() === "currencyUnit") {
          const currencyUnit = right as CurrencyUnitValue;
          const unit = parseDurationUnitString(currencyUnit.getUnit());
          if (unit) {
            const scalar = (left as DurationValue).toFixedUnit(unit === "businessDay" ? "day" : unit);
            if (typeof scalar === "number") {
              return new CurrencyValue(
                currencyUnit.getSymbol() as CurrencySymbol,
                currencyUnit.getNumericValue() * scalar
              );
            }
          }
        }
        const durationSeconds = (left as DurationValue).getTotalSeconds();
        const durationUnit = UnitValue.fromValueAndUnit(durationSeconds, "s");
        const targetUnit = preferredDurationUnit(
          right.getType() === "currencyUnit"
            ? (right as CurrencyUnitValue).getUnit()
            : (right as UnitValue).getUnit()
        );
        const adjustedDuration = targetUnit ? durationUnit.convertTo(targetUnit) : durationUnit;
        return right.getType() === "currencyUnit"
          ? (right as CurrencyUnitValue).multiply(adjustedDuration)
          : adjustedDuration.multiply(right);
      }
      if (SemanticValueTypes.isDuration(right) && (left.getType() === "unit" || left.getType() === "currencyUnit")) {
        if (left.getType() === "currencyUnit") {
          const currencyUnit = left as CurrencyUnitValue;
          const unit = parseDurationUnitString(currencyUnit.getUnit());
          if (unit) {
            const scalar = (right as DurationValue).toFixedUnit(unit === "businessDay" ? "day" : unit);
            if (typeof scalar === "number") {
              return new CurrencyValue(
                currencyUnit.getSymbol() as CurrencySymbol,
                currencyUnit.getNumericValue() * scalar
              );
            }
          }
        }
        const durationSeconds = (right as DurationValue).getTotalSeconds();
        const durationUnit = UnitValue.fromValueAndUnit(durationSeconds, "s");
        const targetUnit = preferredDurationUnit(
          left.getType() === "currencyUnit"
            ? (left as CurrencyUnitValue).getUnit()
            : (left as UnitValue).getUnit()
        );
        const adjustedDuration = targetUnit ? durationUnit.convertTo(targetUnit) : durationUnit;
        return left.getType() === "currencyUnit"
          ? (left as CurrencyUnitValue).multiply(adjustedDuration)
          : (left as UnitValue).multiply(adjustedDuration);
      }
      return handleListOperation(left, right, (a, b) => a.multiply(b));
    } catch (error) {
      return ErrorValue.fromError(error as Error, 'runtime');
    }
  },
  
  /**
   * Divide two semantic values with proper error handling
   */
  divide: (left: SemanticValue, right: SemanticValue): SemanticValue => {
    try {
      if (SemanticValueTypes.isSymbolic(left) || SemanticValueTypes.isSymbolic(right)) {
        const base = SemanticValueTypes.isSymbolic(left) ? left : SymbolicValue.from(left.toString());
        return base.divide(right);
      }
      return handleListOperation(left, right, (a, b) => a.divide(b));
    } catch (error) {
      return ErrorValue.fromError(error as Error, 'runtime');
    }
  },

  /**
   * Modulo two semantic values with proper error handling
   */
  modulo: (left: SemanticValue, right: SemanticValue): SemanticValue => {
    try {
      const wrap = (expr: string) => {
        const trimmed = expr.trim();
        if (!/\s|[+\-*/^%]/.test(trimmed)) {
          return trimmed;
        }
        return `(${trimmed})`;
      };

      return handleListOperation(left, right, (a, b) => {
        if (SemanticValueTypes.isSymbolic(a) || SemanticValueTypes.isSymbolic(b)) {
          return SymbolicValue.from(`${wrap(a.toString())} mod ${wrap(b.toString())}`);
        }
        if (a.getType() !== "number") {
          return ErrorValue.typeError("Modulo requires numbers", "number", a.getType());
        }
        if (b.getType() !== "number") {
          return ErrorValue.typeError("Modulo requires numbers", "number", b.getType());
        }
        const divisor = b.getNumericValue();
        if (divisor === 0) {
          return ErrorValue.runtimeError("Division by zero");
        }
        return new NumberValue(a.getNumericValue() % divisor);
      });
    } catch (error) {
      return ErrorValue.fromError(error as Error, 'runtime');
    }
  },
  
  /**
   * Raise semantic value to power with proper error handling
   */
  power: (base: SemanticValue, exponent: number): SemanticValue => {
    try {
      if (SemanticValueTypes.isSymbolic(base)) {
        return base.power(exponent);
      }
      if (SemanticValueTypes.isList(base)) {
        return mapListItems(base as ListValue, (item) => item.power(exponent));
      }
      return base.power(exponent);
    } catch (error) {
      return ErrorValue.fromError(error as Error, 'runtime');
    }
  },
} as const;
