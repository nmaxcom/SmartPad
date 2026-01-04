/**
 * @file DateValue - Date and datetime values in SmartPad
 * @description Represents dates and datetimes with a simple timezone model.
 */

import { DateTime, FixedOffsetZone } from 'luxon';
import { SemanticValue, SemanticValueType, DisplayOptions } from './SemanticValue';

export type DateZone =
  | { type: 'utc'; label: 'UTC' }
  | { type: 'local'; label: 'local' }
  | { type: 'offset'; label: string; offsetMinutes: number };

const pad2 = (value: number): string => String(value).padStart(2, '0');

const monthNames: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

type LocaleDateOrder = 'mdy' | 'dmy';

const getLocaleDateOrder = (): LocaleDateOrder => {
  const parts = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(2006, 3, 23));
  const order = parts
    .filter((part) => part.type === 'day' || part.type === 'month' || part.type === 'year')
    .map((part) => part.type);
  if (order[0] === 'day') return 'dmy';
  return 'mdy';
};

export class DateValue extends SemanticValue {
  private readonly dateTime: DateTime;
  private readonly zone: DateZone;
  private readonly hasTime: boolean;

  constructor(dateTime: DateTime, zone: DateZone, hasTime: boolean) {
    super();
    if (!dateTime.isValid) {
      throw new Error('Invalid date/time value');
    }
    this.dateTime = dateTime;
    this.zone = zone;
    this.hasTime = hasTime;
  }

  static fromDate(date: Date, zone: DateZone, hasTime: boolean): DateValue {
    const dt = DateTime.fromJSDate(date, { zone: zoneToLuxon(zone) });
    return new DateValue(dt, zone, hasTime);
  }

  static fromDateTime(dateTime: DateTime, zone: DateZone, hasTime: boolean): DateValue {
    return new DateValue(dateTime, zone, hasTime);
  }

  static parse(input: string): DateValue | null {
    const trimmed = input.trim();
    if (!trimmed) return null;

    const keyword = trimmed.toLowerCase();
    if (keyword === 'today' || keyword === 'tomorrow' || keyword === 'yesterday' || keyword === 'now') {
      const now = DateTime.local();
      if (keyword === 'now') {
        return new DateValue(now, { type: 'local', label: 'local' }, true);
      }
      const base = now.startOf('day');
      if (keyword === 'tomorrow') {
        return new DateValue(base.plus({ days: 1 }), { type: 'local', label: 'local' }, false);
      }
      if (keyword === 'yesterday') {
        return new DateValue(base.minus({ days: 1 }), { type: 'local', label: 'local' }, false);
      }
      return new DateValue(base, { type: 'local', label: 'local' }, false);
    }

    const isoMatch = trimmed.match(
      /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?(?:\s*(Z|UTC|GMT|local|[+-]\d{2}:?\d{2}))?$/i
    );
    if (isoMatch) {
      const year = Number(isoMatch[1]);
      const month = Number(isoMatch[2]);
      const day = Number(isoMatch[3]);
      const hour = isoMatch[4] ? Number(isoMatch[4]) : 0;
      const minute = isoMatch[5] ? Number(isoMatch[5]) : 0;
      const zone = parseZone(isoMatch[6] || 'local');
      const hasTime = isoMatch[4] !== undefined;
      const dt = DateTime.fromObject(
        { year, month, day, hour, minute },
        { zone: zoneToLuxon(zone) }
      );
      return new DateValue(dt, zone, hasTime);
    }

    const dayMonthMatch = trimmed.match(/^\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\s*$/);
    if (dayMonthMatch) {
      const day = Number(dayMonthMatch[1]);
      const monthName = dayMonthMatch[2].toLowerCase();
      const year = Number(dayMonthMatch[3]);
      if (monthName in monthNames) {
        const dt = DateTime.fromObject(
          { year, month: monthNames[monthName] + 1, day },
          { zone: 'local' }
        );
        return new DateValue(dt, { type: 'local', label: 'local' }, false);
      }
    }

    const monthDayMatch = trimmed.match(/^\s*([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})\s*$/);
    if (monthDayMatch) {
      const monthName = monthDayMatch[1].toLowerCase();
      const day = Number(monthDayMatch[2]);
      const year = Number(monthDayMatch[3]);
      if (monthName in monthNames) {
        const dt = DateTime.fromObject(
          { year, month: monthNames[monthName] + 1, day },
          { zone: 'local' }
        );
        return new DateValue(dt, { type: 'local', label: 'local' }, false);
      }
    }

    const numericMatch = trimmed.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
    if (numericMatch) {
      const first = Number(numericMatch[1]);
      const second = Number(numericMatch[2]);
      const year = Number(numericMatch[3]);
      const order = getLocaleDateOrder();
      const day = order === 'dmy' ? first : second;
      const month = order === 'dmy' ? second : first;
      const dt = DateTime.fromObject({ year, month, day }, { zone: 'local' });
      if (dt.isValid) {
        return new DateValue(dt, { type: 'local', label: 'local' }, false);
      }
    }

    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const hasTime = /\d{1,2}:\d{2}/.test(trimmed);
      const dt = DateTime.fromJSDate(parsed, { zone: 'local' });
      return new DateValue(dt, { type: 'local', label: 'local' }, hasTime);
    }

    return null;
  }

  getType(): SemanticValueType {
    return 'date';
  }

  getNumericValue(): number {
    return this.dateTime.toMillis();
  }

  isNumeric(): boolean {
    return false;
  }

  canConvertTo(targetType: SemanticValueType): boolean {
    return targetType === 'date';
  }

  toString(_options?: DisplayOptions): string {
    const dt = this.dateTime.setZone(zoneToLuxon(this.zone));
    const dateText = `${dt.year}-${pad2(dt.month)}-${pad2(dt.day)}`;
    if (!this.hasTime) {
      return dateText;
    }
    const timeText = `${pad2(dt.hour)}:${pad2(dt.minute)}`;
    return `${dateText} ${timeText} ${this.zone.label}`;
  }

  equals(other: SemanticValue): boolean {
    if (other.getType() !== 'date') return false;
    const otherDate = other as DateValue;
    return (
      this.dateTime.toMillis() === otherDate.dateTime.toMillis() &&
      this.hasTime === otherDate.hasTime &&
      this.zone.label === otherDate.zone.label
    );
  }

  add(other: SemanticValue): SemanticValue {
    throw this.createIncompatibilityError(other, 'add', 'date arithmetic uses calendar rules');
  }

  subtract(other: SemanticValue): SemanticValue {
    throw this.createIncompatibilityError(other, 'subtract', 'date arithmetic uses calendar rules');
  }

  multiply(other: SemanticValue): SemanticValue {
    throw this.createIncompatibilityError(other, 'multiply', 'cannot multiply dates');
  }

  divide(other: SemanticValue): SemanticValue {
    throw this.createIncompatibilityError(other, 'divide', 'cannot divide dates');
  }

  power(_exponent: number): SemanticValue {
    throw new Error('Cannot exponentiate dates');
  }

  clone(): SemanticValue {
    return new DateValue(this.dateTime, { ...this.zone }, this.hasTime);
  }

  getZone(): DateZone {
    return this.zone;
  }

  getDateTime(): DateTime {
    return this.dateTime;
  }

  hasTimeComponent(): boolean {
    return this.hasTime;
  }

  withZone(zone: DateZone): DateValue {
    const dt = this.dateTime.setZone(zoneToLuxon(zone));
    return new DateValue(dt, zone, this.hasTime);
  }
}

export function parseZone(input: string): DateZone {
  const trimmed = input.trim();
  const upper = trimmed.toUpperCase();
  if (upper === 'UTC' || upper === 'GMT' || upper === 'Z') {
    return { type: 'utc', label: 'UTC' };
  }
  if (upper === 'LOCAL') {
    return { type: 'local', label: 'local' };
  }
  const offsetMatch = trimmed.match(/^([+-])(\d{2}):?(\d{2})$/);
  if (offsetMatch) {
    const sign = offsetMatch[1] === '-' ? -1 : 1;
    const hours = Number(offsetMatch[2]);
    const minutes = Number(offsetMatch[3]);
    const offsetMinutes = sign * (hours * 60 + minutes);
    const label = `${offsetMatch[1]}${pad2(hours)}:${pad2(minutes)}`;
    return { type: 'offset', label, offsetMinutes };
  }
  return { type: 'local', label: 'local' };
}

export function zoneToLuxon(zone: DateZone): string | FixedOffsetZone {
  if (zone.type === 'utc') {
    return 'utc';
  }
  if (zone.type === 'offset') {
    return FixedOffsetZone.instance(zone.offsetMinutes);
  }
  return 'local';
}

export function daysInMonth(year: number, monthIndex: number): number {
  return DateTime.local(year, monthIndex + 1, 1).daysInMonth ?? 0;
}

export function parseWeekday(name: string): number | null {
  const map: Record<string, number> = {
    sunday: 7,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sun: 7,
    mon: 1,
    tue: 2,
    tues: 2,
    wed: 3,
    thu: 4,
    thur: 4,
    fri: 5,
    sat: 6,
  };
  const key = name.toLowerCase();
  return key in map ? map[key] : null;
}
