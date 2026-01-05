/**
 * @file Date math utilities
 * @description Parsing and evaluation helpers for date/time expressions.
 */

import { DateTime } from 'luxon';
import {
  DateValue,
  DateZone,
  parseZone,
  parseWeekday,
  zoneToLuxon,
} from '../types/DateValue';
import { UnitValue, ErrorValue } from '../types';
import { Variable } from '../state/types';

const msPerDay = 24 * 60 * 60 * 1000;

export interface DateParseResult {
  value: DateValue;
  length: number;
}

export interface DurationToken {
  value: number;
  unit: 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second' | 'businessDay';
}

export function looksLikeDateExpression(expression: string): boolean {
  const text = expression.trim();
  if (!text) return false;
  if (/\b(today|tomorrow|yesterday|now|next|last)\b/i.test(text)) return true;
  if (/\b\d{4}-\d{2}-\d{2}\b/.test(text)) return true;
  if (/\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4}\b/.test(text)) return true;
  if (/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/i.test(text)) return true;
  if (/\b(years?|months?|weeks?|days?|hours?|minutes?|business\s+days?)\b/i.test(text)) return true;
  if (/\b\d+\s*(h|d|w|y)\b/i.test(text)) return true;
  if (/\b(UTC|GMT|Z|local)\b/i.test(text)) return true;
  if (/[+-]\d{2}:?\d{2}\b/.test(text)) return true;
  return false;
}

export function parseDateLiteral(input: string): DateValue | null {
  return DateValue.parse(input);
}

export function parseDateValueAtStart(
  input: string,
  variableContext: Map<string, Variable>
): DateParseResult | null {
  const trimmed = input.trimStart();
  const offset = input.length - trimmed.length;

  const keywordMatch = trimmed.match(/^(today|tomorrow|yesterday|now)\b/i);
  if (keywordMatch) {
    const value = DateValue.parse(keywordMatch[0]);
    if (value) {
      return { value, length: offset + keywordMatch[0].length };
    }
  }

  const relativeMatch = trimmed.match(/^(next|last)\s+(\w+)\b/i);
  if (relativeMatch) {
    const direction = relativeMatch[1].toLowerCase();
    const weekday = parseWeekday(relativeMatch[2]);
    if (weekday !== null) {
      const base = DateTime.local().startOf('day');
      const step = direction === 'next' ? 1 : -1;
      let cursor = base;
      do {
        cursor = cursor.plus({ days: step });
      } while (cursor.weekday !== weekday);
      const value = DateValue.fromDateTime(cursor, { type: 'local', label: 'local' }, false);
      return { value, length: offset + relativeMatch[0].length };
    }
  }

  const isoMatch = trimmed.match(
    /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?(?:\s*(Z|UTC|GMT|local|[+-]\d{2}:?\d{2}))?/i
  );
  if (isoMatch) {
    let literal = isoMatch[0];
    const remainder = trimmed.slice(literal.length);
    const zoneMatch = remainder.match(/^\s*(Z|UTC|GMT|local|[+-]\d{2}:?\d{2})\b/i);
    if (zoneMatch) {
      literal += zoneMatch[0];
    }
    const value = DateValue.parse(literal);
    if (value) {
      return { value, length: offset + literal.length };
    }
  }

  const dayMonth = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (dayMonth) {
    const literal = dayMonth[0];
    const value = DateValue.parse(literal);
    if (value) {
      return { value, length: offset + literal.length };
    }
  }

  const monthDay = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (monthDay) {
    const literal = monthDay[0];
    const value = DateValue.parse(literal);
    if (value) {
      return { value, length: offset + literal.length };
    }
  }

  const numericMatch = trimmed.match(/^(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4})/);
  if (numericMatch) {
    const literal = numericMatch[0];
    const value = DateValue.parse(literal);
    if (value) {
      return { value, length: offset + literal.length };
    }
  }

  const variableNames = Array.from(variableContext.keys()).sort((a, b) => b.length - a.length);
  for (const name of variableNames) {
    if (!trimmed.startsWith(name)) continue;
    const boundary = trimmed[name.length] ?? '';
    if (boundary && !/\s|[+\-]/.test(boundary)) continue;
    const variable = variableContext.get(name);
    if (variable?.value instanceof DateValue) {
      return { value: variable.value, length: offset + name.length };
    }
  }

  return null;
}

export function parseDurationAtStart(input: string): { token: DurationToken; length: number } | null {
  const trimmed = input.trimStart();
  const offset = input.length - trimmed.length;
  const match = trimmed.match(
    /^(\d+(?:\.\d+)?)\s*(business\s+days?|years?|months?|weeks?|days?|hours?|hrs?|hr|minutes?|mins?|min|seconds?|secs?|sec|h|d|w|y)\b/i
  );
  if (!match) return null;

  const value = Number(match[1]);
  if (!isFinite(value)) return null;
  const rawUnit = match[2].toLowerCase();

  let unit: DurationToken['unit'] | null = null;
  if (rawUnit.startsWith('business')) {
    unit = 'businessDay';
  } else if (rawUnit.startsWith('year') || rawUnit === 'y') {
    unit = 'year';
  } else if (rawUnit.startsWith('month')) {
    unit = 'month';
  } else if (rawUnit.startsWith('week') || rawUnit === 'w') {
    unit = 'week';
  } else if (rawUnit.startsWith('day') || rawUnit === 'd') {
    unit = 'day';
  } else if (rawUnit.startsWith('hour') || rawUnit.startsWith('hr') || rawUnit === 'h') {
    unit = 'hour';
  } else if (rawUnit.startsWith('min')) {
    unit = 'minute';
  } else if (rawUnit.startsWith('sec')) {
    unit = 'second';
  }

  if (!unit) return null;

  return {
    token: { value, unit },
    length: offset + match[0].length,
  };
}

export function evaluateDateExpression(
  expression: string,
  variableContext: Map<string, Variable>
): DateValue | UnitValue | ErrorValue | null {
  const trimmed = expression.trim();
  if (!trimmed) return null;

  const conversionMatch = trimmed.match(/\b(to|in)\b\s+(.+)$/i);
  const baseExpr =
    conversionMatch && conversionMatch.index !== undefined
      ? trimmed.slice(0, conversionMatch.index).trim()
      : trimmed;
  const conversionKeyword = conversionMatch ? conversionMatch[1].toLowerCase() : null;
  const conversionTarget = conversionMatch ? conversionMatch[2].trim() : null;

  const baseResult = parseDateValueAtStart(baseExpr, variableContext);
  if (!baseResult) return null;

  let current = baseResult.value;
  let result: DateValue | UnitValue = current;
  let cursor = baseResult.length;

  while (cursor < baseExpr.length) {
    const rest = baseExpr.slice(cursor);
    const operatorMatch = rest.match(/^\s*([+-])/);
    if (!operatorMatch) {
      return ErrorValue.semanticError(`Invalid date expression near "${rest.trim()}"`);
    }
    const operator = operatorMatch[1];
    cursor += operatorMatch[0].length;

    const remaining = baseExpr.slice(cursor);
    const duration = parseDurationAtStart(remaining);
    if (duration) {
      const signedValue = operator === '-' ? -duration.token.value : duration.token.value;
      const applied = applyDuration(current, {
        value: signedValue,
        unit: duration.token.unit,
      });
      if (applied instanceof ErrorValue) {
        return applied;
      }
      current = applied;
      result = current;
      cursor += duration.length;
      continue;
    }

    if (operator === '-') {
      const dateToken = parseDateValueAtStart(remaining, variableContext);
      if (dateToken) {
        cursor += dateToken.length;
        const remainder = baseExpr.slice(cursor).trim();
        if (remainder.length > 0) {
          return ErrorValue.semanticError(`Unexpected token after date difference: "${remainder}"`);
        }
        result = diffDates(current, dateToken.value);
        cursor = baseExpr.length;
        break;
      }
    }

    return ErrorValue.semanticError(`Expected duration after '${operator}'`);
  }

  if (conversionTarget && conversionKeyword) {
    return applyConversion(result, conversionTarget, conversionKeyword);
  }

  return result;
}

function applyConversion(
  value: DateValue | UnitValue,
  target: string,
  keyword: string
): DateValue | UnitValue | ErrorValue {
  const trimmed = target.trim();
  if (!trimmed) {
    return ErrorValue.semanticError(`Expected unit after '${keyword}'`);
  }

  if (value instanceof DateValue) {
    if (!isZoneTarget(trimmed)) {
      return ErrorValue.semanticError(`Expected time zone after '${keyword}'`);
    }
    const zone = parseZone(trimmed);
    return value.withZone(zone);
  }

  if (value instanceof UnitValue) {
    try {
      return value.convertTo(trimmed);
    } catch (error) {
      return ErrorValue.semanticError(
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  return ErrorValue.semanticError("Invalid date conversion");
}

function isZoneTarget(target: string): boolean {
  return /^(Z|UTC|GMT|local|[+-]\d{2}:?\d{2})$/i.test(target.trim());
}

function applyDuration(current: DateValue, duration: DurationToken): DateValue | ErrorValue {
  switch (duration.unit) {
    case 'year':
      return addDuration(current, { years: duration.value });
    case 'month':
      return addDuration(current, { months: duration.value });
    case 'week':
      return addDuration(current, { days: duration.value * 7 });
    case 'day':
      return addDuration(current, { days: duration.value });
    case 'businessDay':
      return addBusinessDays(current, duration.value);
    case 'hour':
      return addTime(current, { hours: duration.value });
    case 'minute':
      return addTime(current, { minutes: duration.value });
    case 'second':
      return addTime(current, { seconds: duration.value });
    default:
      return ErrorValue.semanticError('Unsupported duration unit');
  }
}

function addDuration(current: DateValue, value: { years?: number; months?: number; days?: number }): DateValue {
  const dt = current.getDateTime();
  const updated = dt.plus(value);
  return DateValue.fromDateTime(updated, current.getZone(), current.hasTimeComponent());
}

function addBusinessDays(current: DateValue, days: number): DateValue {
  const dt = current.getDateTime();
  const step = days >= 0 ? 1 : -1;
  let remaining = Math.abs(days);
  let cursor = dt;

  while (remaining > 0) {
    cursor = cursor.plus({ days: step });
    if (cursor.weekday !== 6 && cursor.weekday !== 7) {
      remaining -= 1;
    }
  }

  return DateValue.fromDateTime(cursor, current.getZone(), current.hasTimeComponent());
}

function addTime(
  current: DateValue,
  value: { hours?: number; minutes?: number; seconds?: number }
): DateValue | ErrorValue {
  if (!current.hasTimeComponent()) {
    return ErrorValue.semanticError('Cannot add time to a date-only value');
  }
  const dt = current.getDateTime().plus(value);
  return DateValue.fromDateTime(dt, current.getZone(), true);
}

function diffDates(left: DateValue, right: DateValue): UnitValue {
  const leftStart = left.getDateTime().startOf('day');
  const rightStart = right.getDateTime().startOf('day');
  const diffDays = Math.round(leftStart.diff(rightStart, 'days').days);
  return UnitValue.fromValueAndUnit(diffDays, 'day');
}

function getWeekday(date: DateTime, zone: DateZone): number {
  if (zone.type === 'utc') {
    return date.setZone(zoneToLuxon(zone)).weekday;
  }
  if (zone.type === 'offset') {
    return date.setZone(zoneToLuxon(zone)).weekday;
  }
  return date.weekday;
}
