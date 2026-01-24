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
import { UnitValue, ErrorValue, DurationValue, TimeValue, SemanticParsers } from '../types';
import type { DurationUnit } from '../types/DurationValue';
import { Variable } from '../state/types';

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
  const parsed = SemanticParsers.parse(text);
  if (parsed && parsed.getType() === "unit" && UnitValue.isUnitString(text)) {
    return false;
  }
  if (/\b\d+(?:\.\d+)?\s*W\b/.test(text)) return false;
  if (/\b(today|tomorrow|yesterday|now|next|last)\b/i.test(text)) return true;
  if (/\b\d{4}-\d{2}-\d{2}\b/.test(text)) return true;
  if (/\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4,}\b/.test(text)) return true;
  if (/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/i.test(text)) return true;
  if (/\b(years?|months?|weeks?|days?|hours?|minutes?|seconds?|ms|business\s+days?)\b/i.test(text)) return true;
  if (/\d+\s*(years?|months?|weeks?|days?|hours?|minutes?|seconds?|business\s+days?)\b/i.test(text)) return true;
  if (/\b\d+\s*(h|d|w|y|min|sec|s|ms)\b/i.test(text)) return true;
  if (/\b\d{1,2}:\d{2}(?::\d{2})?\b/.test(text)) return true;
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
  const parsed = DurationValue.parseAtStart(input, { allowMinuteAlias: false });
  if (!parsed) return null;
  const parts = parsed.value.getParts();
  const keys = Object.keys(parts);
  if (keys.length !== 1) return null;
  const unit = keys[0] as DurationToken["unit"];
  const value = parts[unit] ?? 0;
  return {
    token: { value, unit },
    length: parsed.length,
  };
}

export function parseTimeValueAtStart(input: string): { value: TimeValue; length: number } | null {
  const trimmed = input.trimStart();
  const offset = input.length - trimmed.length;
  const match = trimmed.match(/^(\d{1,2}:\d{2}(?::\d{2})?)/);
  if (!match) return null;
  const value = TimeValue.parse(match[1]);
  if (!value) return null;
  return { value, length: offset + match[1].length };
}

function parseDurationLiteralAtStart(
  input: string,
  options: { allowMinuteAlias: boolean }
): { value: DurationValue; length: number } | null {
  const parsed = DurationValue.parseAtStart(input, { allowMinuteAlias: options.allowMinuteAlias });
  if (!parsed) return null;
  return { value: parsed.value, length: parsed.length };
}

export function evaluateDateExpression(
  expression: string,
  variableContext: Map<string, Variable>
): DateValue | UnitValue | DurationValue | TimeValue | ErrorValue | null {
  const trimmed = expression.trim();
  if (!trimmed) return null;

  const conversionMatch = trimmed.match(/\b(to|in|as)\b\s+(.+)$/i);
  const baseExpr =
    conversionMatch && conversionMatch.index !== undefined
      ? trimmed.slice(0, conversionMatch.index).trim()
      : trimmed;
  const conversionKeyword = conversionMatch ? conversionMatch[1].toLowerCase() : null;
  const conversionTarget = conversionMatch ? conversionMatch[2].trim() : null;

  const baseResult = parseDateValueAtStart(baseExpr, variableContext);
  if (baseResult) {
    let current = baseResult.value;
    let result: DateValue | UnitValue | DurationValue = current;
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
      const durationLiteral = parseDurationLiteralAtStart(remaining, { allowMinuteAlias: false });
      if (durationLiteral) {
        const applied = applyDurationToDate(
          current,
          scaleDuration(durationLiteral.value, operator === "-" ? -1 : 1)
        );
        if (applied instanceof ErrorValue) {
          return applied;
        }
        current = applied;
        result = current;
        cursor += durationLiteral.length;
        continue;
      }

      const timeLiteral = parseTimeValueAtStart(remaining);
      if (timeLiteral) {
        if (operator !== "+") {
          return ErrorValue.semanticError("Cannot subtract a clock time from a date");
        }
        if (current.hasTimeComponent()) {
          return ErrorValue.semanticError("Cannot add a clock time to a datetime");
        }
        current = combineDateAndTime(current, timeLiteral.value);
        result = current;
        cursor += timeLiteral.length;
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
          if (current.hasTimeComponent() || dateToken.value.hasTimeComponent()) {
            result = diffDateTimes(current, dateToken.value);
          } else {
            result = diffDates(current, dateToken.value);
          }
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

  const timeResult = parseTimeValueAtStart(baseExpr);
  if (timeResult) {
    let current = timeResult.value;
    let result: TimeValue | DurationValue = current;
    let cursor = timeResult.length;

    while (cursor < baseExpr.length) {
      const rest = baseExpr.slice(cursor);
      const operatorMatch = rest.match(/^\s*([+-])/);
      if (!operatorMatch) {
        return ErrorValue.semanticError(`Invalid time expression near "${rest.trim()}"`);
      }
      const operator = operatorMatch[1];
      cursor += operatorMatch[0].length;

      const remaining = baseExpr.slice(cursor);
      const durationLiteral = parseDurationLiteralAtStart(remaining, { allowMinuteAlias: true });
      if (durationLiteral) {
        current = applyDurationToTime(
          current,
          scaleDuration(durationLiteral.value, operator === "-" ? -1 : 1)
        );
        result = current;
        cursor += durationLiteral.length;
        continue;
      }

      if (operator === "-") {
        const timeToken = parseTimeValueAtStart(remaining);
        if (timeToken) {
          cursor += timeToken.length;
          const remainder = baseExpr.slice(cursor).trim();
          if (remainder.length > 0) {
            return ErrorValue.semanticError(`Unexpected token after time difference: "${remainder}"`);
          }
          result = diffTimes(current, timeToken.value);
          cursor = baseExpr.length;
          break;
        }
      }

      if (operator === "+") {
        const timeToken = parseTimeValueAtStart(remaining);
        if (timeToken) {
          return ErrorValue.semanticError(
            "Cannot add two clock times. Did you mean a duration?"
          );
        }
      }

      return ErrorValue.semanticError(`Expected duration after '${operator}'`);
    }

    if (conversionTarget && conversionKeyword) {
      return applyConversion(result, conversionTarget, conversionKeyword);
    }

    return result;
  }

  const durationLiteral = DurationValue.parseLiteral(baseExpr, {
    allowMinuteAlias: false,
    requireMultipleComponents: false,
  });
  if (durationLiteral) {
    if (conversionTarget && conversionKeyword) {
      return applyConversion(durationLiteral, conversionTarget, conversionKeyword);
    }
    return durationLiteral;
  }

  if (looksLikeDateLiteral(baseExpr)) {
    return ErrorValue.semanticError("Invalid date literal");
  }
  return null;
}

function looksLikeDateLiteral(expression: string): boolean {
  const text = expression.trim();
  if (!text) return false;
  if (/\b\d{4}-\d{2}-\d{2}\b/.test(text)) return true;
  if (/\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4,}\b/.test(text)) return true;
  if (/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/i.test(text)) {
    return true;
  }
  return false;
}

function applyConversion(
  value: DateValue | UnitValue | DurationValue | TimeValue,
  target: string,
  keyword: string
): DateValue | UnitValue | DurationValue | TimeValue | ErrorValue {
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

  if (value instanceof TimeValue) {
    return ErrorValue.semanticError(
      "Cannot convert a time-of-day without a date anchor"
    );
  }

  if (value instanceof DurationValue) {
    const normalized = normalizeDurationUnitTarget(trimmed);
    if (!normalized) {
      return ErrorValue.semanticError(`Cannot convert a duration to ${trimmed}`);
    }
    const converted = value.toFixedUnit(normalized);
    if (converted instanceof ErrorValue) {
      return converted;
    }
    const unitLabel =
      normalized === "minute"
        ? "min"
        : normalized === "second"
          ? "s"
          : normalized === "hour"
            ? "h"
            : normalized === "millisecond"
              ? "ms"
              : normalized;
    return UnitValue.fromValueAndUnit(converted, unitLabel, { forceUnitDisplay: true });
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

const secondsPerDay = 24 * 60 * 60;

function normalizeDurationUnitTarget(
  input: string
): Exclude<DurationUnit, "businessDay"> | null {
  const unit = input.trim().toLowerCase();
  if (["year", "years", "y"].includes(unit)) return "year";
  if (["month", "months", "mo", "mos"].includes(unit)) return "month";
  if (["week", "weeks", "w"].includes(unit)) return "week";
  if (["day", "days", "d"].includes(unit)) return "day";
  if (["hour", "hours", "hr", "hrs", "h"].includes(unit)) return "hour";
  if (["minute", "minutes", "min", "mins"].includes(unit)) return "minute";
  if (["second", "seconds", "sec", "secs", "s"].includes(unit)) return "second";
  if (["millisecond", "milliseconds", "ms"].includes(unit)) return "millisecond";
  return null;
}

function scaleDuration(duration: DurationValue, factor: number): DurationValue {
  const parts = duration.getParts();
  const scaled: Record<string, number> = {};
  for (const [unit, value] of Object.entries(parts)) {
    scaled[unit] = (value ?? 0) * factor;
  }
  return new DurationValue(scaled);
}

function applyDurationToDate(
  current: DateValue,
  duration: DurationValue
): DateValue | ErrorValue {
  const parts = duration.getParts();
  const hasTimeUnits =
    (parts.hour ?? 0) !== 0 ||
    (parts.minute ?? 0) !== 0 ||
    (parts.second ?? 0) !== 0 ||
    (parts.millisecond ?? 0) !== 0;

  if (hasTimeUnits && !current.hasTimeComponent()) {
    return ErrorValue.semanticError("Cannot add time to a date-only value");
  }

  const zone = current.getZone();
  const hasTime = current.hasTimeComponent();
  let dt = current.getDateTime();

  const years = parts.year ?? 0;
  const months = parts.month ?? 0;
  if (years || months) {
    dt = dt.plus({ years, months });
  }

  const weeks = parts.week ?? 0;
  const days = parts.day ?? 0;
  if (weeks || days) {
    dt = dt.plus({ days: weeks * 7 + days });
  }

  const businessDays = parts.businessDay ?? 0;
  if (businessDays) {
    const temp = DateValue.fromDateTime(dt, zone, hasTime);
    dt = addBusinessDays(temp, businessDays).getDateTime();
  }

  if (hasTimeUnits) {
    dt = dt.plus({
      hours: parts.hour ?? 0,
      minutes: parts.minute ?? 0,
      seconds: parts.second ?? 0,
      milliseconds: parts.millisecond ?? 0,
    });
  }

  return DateValue.fromDateTime(dt, zone, hasTime);
}

function applyDurationToTime(current: TimeValue, duration: DurationValue): TimeValue {
  const parts = duration.getParts();
  const durationSeconds = duration.getTotalSeconds();
  const baseSeconds = current.getSeconds() + current.getDayOffset() * secondsPerDay;
  const totalSeconds = baseSeconds + durationSeconds;
  const roundedSeconds = Math.round(totalSeconds);
  const dayOffset = Math.floor(roundedSeconds / secondsPerDay);
  let secondsFromMidnight = roundedSeconds - dayOffset * secondsPerDay;
  if (secondsFromMidnight < 0) {
    secondsFromMidnight += secondsPerDay;
  }

  const hasExplicitSeconds =
    (parts.second ?? 0) !== 0 || (parts.millisecond ?? 0) !== 0;
  const hasSubMinute = Math.abs(durationSeconds % 60) > 1e-9;
  const showSeconds = current.getShowSeconds() || hasExplicitSeconds || hasSubMinute;

  return new TimeValue(secondsFromMidnight, showSeconds, dayOffset);
}

function combineDateAndTime(date: DateValue, time: TimeValue): DateValue {
  const base = date.getDateTime().plus({ days: time.getDayOffset() });
  const seconds = time.getSeconds();
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const dt = base.set({ hour: hours, minute: minutes, second: secs, millisecond: 0 });
  return DateValue.fromDateTime(dt, date.getZone(), true);
}

function diffTimes(left: TimeValue, right: TimeValue): DurationValue {
  const leftSeconds = left.getSeconds() + left.getDayOffset() * secondsPerDay;
  const rightSeconds = right.getSeconds() + right.getDayOffset() * secondsPerDay;
  return DurationValue.fromSeconds(leftSeconds - rightSeconds);
}

function diffDateTimes(left: DateValue, right: DateValue): DurationValue {
  const diffSeconds = (left.getDateTime().toMillis() - right.getDateTime().toMillis()) / 1000;
  return DurationValue.fromSeconds(diffSeconds);
}
