/**
 * @file DurationValue - Time duration values in SmartPad
 * @description Represents durations as first-class semantic values.
 */

import { SemanticValue, SemanticValueType, DisplayOptions } from "./SemanticValue";
import { ErrorValue } from "./ErrorValue";

export type DurationUnit =
  | "year"
  | "month"
  | "week"
  | "day"
  | "hour"
  | "minute"
  | "second"
  | "millisecond"
  | "businessDay";

export type DurationParts = Partial<Record<DurationUnit, number>>;

const UNIT_ALIASES: Array<{ unit: DurationUnit; aliases: string[] }> = [
  { unit: "businessDay", aliases: ["business day", "business days"] },
  { unit: "year", aliases: ["year", "years", "y"] },
  { unit: "month", aliases: ["month", "months", "mo", "mos"] },
  { unit: "week", aliases: ["week", "weeks", "w"] },
  { unit: "day", aliases: ["day", "days", "d"] },
  { unit: "hour", aliases: ["hour", "hours", "hr", "hrs", "h"] },
  { unit: "minute", aliases: ["minute", "minutes", "min", "mins"] },
  { unit: "second", aliases: ["second", "seconds", "sec", "secs", "s"] },
  { unit: "millisecond", aliases: ["ms"] },
];

const FIXED_SECONDS: Record<Exclude<DurationUnit, "businessDay">, number> = {
  year: 365 * 24 * 60 * 60,
  month: 30 * 24 * 60 * 60,
  week: 7 * 24 * 60 * 60,
  day: 24 * 60 * 60,
  hour: 60 * 60,
  minute: 60,
  second: 1,
  millisecond: 1 / 1000,
};

const orderedUnits: Array<Exclude<DurationUnit, "businessDay">> = [
  "year",
  "month",
  "week",
  "day",
  "hour",
  "minute",
  "second",
  "millisecond",
];

const padUnit = (value: number, unit: string): string => `${value} ${unit}`;

const normalizeParts = (parts: DurationParts): DurationParts => {
  const normalized: DurationParts = {};
  for (const key of Object.keys(parts) as DurationUnit[]) {
    const value = parts[key];
    if (!value) continue;
    normalized[key] = value;
  }
  return normalized;
};

const matchDurationUnit = (input: string, allowMinuteAlias: boolean): { unit: DurationUnit; length: number } | null => {
  const lower = input.toLowerCase();
  for (const entry of UNIT_ALIASES) {
    const candidates = entry.aliases
      .filter((alias) => allowMinuteAlias || alias !== "m")
      .sort((a, b) => b.length - a.length);
    if (entry.unit === "minute" && !allowMinuteAlias) {
      const filtered = candidates.filter((alias) => alias !== "m");
      for (const alias of filtered) {
        if (lower.startsWith(alias)) {
          return { unit: entry.unit, length: alias.length };
        }
      }
      continue;
    }
    for (const alias of candidates) {
      if (lower.startsWith(alias)) {
        return { unit: entry.unit, length: alias.length };
      }
    }
  }
  return null;
};

export class DurationValue extends SemanticValue {
  private readonly parts: DurationParts;
  private readonly totalSeconds: number;

  constructor(parts: DurationParts) {
    super();
    this.parts = normalizeParts(parts);
    this.totalSeconds = DurationValue.computeTotalSeconds(this.parts);
  }

  static parseLiteral(
    input: string,
    options: { allowMinuteAlias?: boolean; requireMultipleComponents?: boolean } = {}
  ): DurationValue | null {
    const parsed = DurationValue.parseAtStart(input, options);
    if (!parsed) return null;
    const remaining = input.trim().slice(parsed.length).trim();
    if (remaining.length > 0) return null;
    if (options.requireMultipleComponents && parsed.componentCount < 2) return null;
    return parsed.value;
  }

  static parseAtStart(
    input: string,
    options: { allowMinuteAlias?: boolean } = {}
  ): { value: DurationValue; length: number; componentCount: number } | null {
    const trimmed = input.trimStart();
    const offset = input.length - trimmed.length;
    if (!trimmed) return null;

    let pos = 0;
    let defaultSign = 1;
    if (trimmed[pos] === "+" || trimmed[pos] === "-") {
      defaultSign = trimmed[pos] === "-" ? -1 : 1;
      pos += 1;
    }

    const parts: DurationParts = {};
    let componentCount = 0;
    const allowMinuteAlias = options.allowMinuteAlias ?? false;

    while (pos < trimmed.length) {
      while (pos < trimmed.length && /\s/.test(trimmed[pos])) pos += 1;
      if (pos >= trimmed.length) break;

      let sign = defaultSign;
      let hasExplicitSign = false;
      if (trimmed[pos] === "+" || trimmed[pos] === "-") {
        sign = trimmed[pos] === "-" ? -1 : 1;
        hasExplicitSign = true;
        pos += 1;
        while (pos < trimmed.length && /\s/.test(trimmed[pos])) pos += 1;
      }

      const numberMatch = trimmed.slice(pos).match(/^(\d+(?:\.\d+)?)/);
      if (!numberMatch) return null;
      const raw = numberMatch[1];
      const value = Number(raw);
      if (!Number.isFinite(value)) return null;
      pos += raw.length;

      while (pos < trimmed.length && /\s/.test(trimmed[pos])) pos += 1;
      const unitMatch = matchDurationUnit(trimmed.slice(pos), allowMinuteAlias);
      if (!unitMatch) return null;

      const unit = unitMatch.unit;
      pos += unitMatch.length;

      const actualSign = hasExplicitSign ? sign : defaultSign;
      const signedValue = actualSign * value;
      parts[unit] = (parts[unit] || 0) + signedValue;
      componentCount += 1;
    }

    if (componentCount === 0) return null;
    return {
      value: new DurationValue(parts),
      length: offset + trimmed.slice(0, pos).length,
      componentCount,
    };
  }

  getType(): SemanticValueType {
    return "duration";
  }

  getNumericValue(): number {
    return this.totalSeconds;
  }

  isNumeric(): boolean {
    return true;
  }

  canConvertTo(targetType: SemanticValueType): boolean {
    return targetType === "duration";
  }

  getParts(): DurationParts {
    return { ...this.parts };
  }

  toString(_options?: DisplayOptions): string {
    if (this.totalSeconds === 0) {
      return "0 s";
    }

    const sign = this.totalSeconds < 0 ? -1 : 1;
    const parts = this.getParts();
    const entries = Object.entries(parts).filter(([, value]) => (value ?? 0) !== 0);
    if (entries.length === 1) {
      const [unit, rawValue] = entries[0] as [DurationUnit, number];
      const preserveSingle = new Set<DurationUnit>([
        "year",
        "month",
        "week",
        "day",
        "businessDay",
        "hour",
        "millisecond",
      ]);
      if (preserveSingle.has(unit)) {
        const absValue = Math.abs(rawValue);
        const unitLabel =
          unit === "millisecond"
            ? "ms"
            : unit === "minute"
              ? "min"
              : unit === "hour"
                ? "h"
                : unit === "businessDay"
                  ? "day"
                  : unit;
        const plural =
          ["day", "week", "month", "year"].includes(unitLabel) && absValue !== 1 ? "s" : "";
        const output = `${absValue} ${unitLabel}${plural}`;
        return sign < 0 ? `-${output}` : output;
      }
    }
    const absSeconds = Math.abs(this.totalSeconds);
    const components: string[] = [];

    let remaining = absSeconds;

    for (const unit of orderedUnits) {
      const unitSeconds = FIXED_SECONDS[unit];
      if (unitSeconds <= 0) continue;
      const value = unit === "millisecond"
        ? Math.round(remaining / unitSeconds)
        : Math.floor(remaining / unitSeconds);
      if (value > 0) {
        const label = unit === "millisecond" ? "ms" : unit === "minute" ? "min" : unit === "second" ? "s" : unit === "hour" ? "h" : unit;
        const plural =
          ["day", "week", "month", "year"].includes(unit) && value !== 1 ? "s" : "";
        components.push(`${value} ${label}${plural}`);
        remaining -= value * unitSeconds;
      }
    }

    const output = components.join(" ");
    return sign < 0 ? `-${output}` : output;
  }

  equals(other: SemanticValue, tolerance = 1e-10): boolean {
    if (other.getType() !== "duration") return false;
    const otherDuration = other as DurationValue;
    return Math.abs(this.totalSeconds - otherDuration.totalSeconds) <= tolerance;
  }

  add(other: SemanticValue): SemanticValue {
    if (other.getType() !== "duration") {
      throw this.createIncompatibilityError(other, "add", "duration math requires another duration");
    }
    const otherDuration = other as DurationValue;
    return DurationValue.fromSeconds(this.totalSeconds + otherDuration.totalSeconds);
  }

  subtract(other: SemanticValue): SemanticValue {
    if (other.getType() !== "duration") {
      throw this.createIncompatibilityError(other, "subtract", "duration math requires another duration");
    }
    const otherDuration = other as DurationValue;
    return DurationValue.fromSeconds(this.totalSeconds - otherDuration.totalSeconds);
  }

  multiply(other: SemanticValue): SemanticValue {
    if (other.getType() !== "number") {
      throw this.createIncompatibilityError(other, "multiply", "duration multiplication requires a number");
    }
    return DurationValue.fromSeconds(this.totalSeconds * other.getNumericValue());
  }

  divide(other: SemanticValue): SemanticValue {
    if (other.getNumericValue() === 0) {
      throw new Error("Division by zero");
    }
    if (other.getType() !== "number") {
      throw this.createIncompatibilityError(other, "divide", "duration division requires a number");
    }
    return DurationValue.fromSeconds(this.totalSeconds / other.getNumericValue());
  }

  power(_exponent: number): SemanticValue {
    throw new Error("Cannot exponentiate durations");
  }

  clone(): SemanticValue {
    return new DurationValue(this.parts);
  }

  toFixedUnit(unit: Exclude<DurationUnit, "businessDay">): number | ErrorValue {
    if (!(unit in FIXED_SECONDS)) {
      return ErrorValue.semanticError(`Cannot convert duration to ${unit}`);
    }
    return this.totalSeconds / FIXED_SECONDS[unit];
  }

  getTotalSeconds(): number {
    return this.totalSeconds;
  }

  static fromSeconds(seconds: number): DurationValue {
    return new DurationValue({ second: seconds });
  }

  private static computeTotalSeconds(parts: DurationParts): number {
    let total = 0;
    for (const [unit, value] of Object.entries(parts)) {
      const typedUnit = unit as DurationUnit;
      if (typedUnit === "businessDay") {
        total += (value || 0) * FIXED_SECONDS.day;
        continue;
      }
      const factor = FIXED_SECONDS[typedUnit];
      if (!factor) continue;
      total += (value || 0) * factor;
    }
    return total;
  }
}
