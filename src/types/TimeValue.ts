/**
 * @file TimeValue - Time-of-day values in SmartPad
 * @description Represents clock times (HH:MM or HH:MM:SS) with optional rollover metadata.
 */

import { SemanticValue, SemanticValueType, DisplayOptions } from "./SemanticValue";

const pad2 = (value: number): string => String(value).padStart(2, "0");

export class TimeValue extends SemanticValue {
  private readonly secondsFromMidnight: number;
  private readonly showSeconds: boolean;
  private readonly dayOffset: number;

  constructor(secondsFromMidnight: number, showSeconds: boolean, dayOffset = 0) {
    super();
    this.secondsFromMidnight = secondsFromMidnight;
    this.showSeconds = showSeconds;
    this.dayOffset = dayOffset;
  }

  static parse(input: string): TimeValue | null {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = match[3] ? Number(match[3]) : 0;
    if (
      !Number.isInteger(hours) ||
      !Number.isInteger(minutes) ||
      !Number.isInteger(seconds)
    ) {
      return null;
    }
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
      return null;
    }
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    return new TimeValue(totalSeconds, !!match[3], 0);
  }

  getType(): SemanticValueType {
    return "time";
  }

  getNumericValue(): number {
    return this.secondsFromMidnight;
  }

  isNumeric(): boolean {
    return false;
  }

  canConvertTo(targetType: SemanticValueType): boolean {
    return targetType === "time";
  }

  toString(_options?: DisplayOptions): string {
    const hours = Math.floor(this.secondsFromMidnight / 3600);
    const minutes = Math.floor((this.secondsFromMidnight % 3600) / 60);
    const seconds = this.secondsFromMidnight % 60;
    const base = this.showSeconds || seconds !== 0
      ? `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
      : `${pad2(hours)}:${pad2(minutes)}`;
    if (this.dayOffset === 0) return base;
    const abs = Math.abs(this.dayOffset);
    const sign = this.dayOffset > 0 ? "+" : "-";
    const suffix = abs === 1 ? "day" : "days";
    return `${base} (${sign}${abs} ${suffix})`;
  }

  equals(other: SemanticValue): boolean {
    if (other.getType() !== "time") return false;
    const otherTime = other as TimeValue;
    return (
      this.secondsFromMidnight === otherTime.secondsFromMidnight &&
      this.dayOffset === otherTime.dayOffset
    );
  }

  add(other: SemanticValue): SemanticValue {
    throw this.createIncompatibilityError(other, "add", "clock times require durations");
  }

  subtract(other: SemanticValue): SemanticValue {
    throw this.createIncompatibilityError(other, "subtract", "clock times require durations");
  }

  multiply(other: SemanticValue): SemanticValue {
    throw this.createIncompatibilityError(other, "multiply", "cannot multiply clock times");
  }

  divide(other: SemanticValue): SemanticValue {
    throw this.createIncompatibilityError(other, "divide", "cannot divide clock times");
  }

  power(_exponent: number): SemanticValue {
    throw new Error("Cannot exponentiate clock times");
  }

  clone(): SemanticValue {
    return new TimeValue(this.secondsFromMidnight, this.showSeconds, this.dayOffset);
  }

  withDayOffset(offset: number): TimeValue {
    return new TimeValue(this.secondsFromMidnight, this.showSeconds, offset);
  }

  getDayOffset(): number {
    return this.dayOffset;
  }

  getShowSeconds(): boolean {
    return this.showSeconds;
  }

  getSeconds(): number {
    return this.secondsFromMidnight;
  }
}
