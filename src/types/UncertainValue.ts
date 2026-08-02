import { DisplayOptions, SemanticValue, SemanticValueType } from "./SemanticValue";

export type UncertaintyDisplayMode = "plusMinus" | "interval";

const isFiniteSemanticValue = (value: SemanticValue): boolean =>
  value.isNumeric() && Number.isFinite(value.getNumericValue());

const selectBounds = (
  values: SemanticValue[]
): { lower: SemanticValue; upper: SemanticValue } => {
  if (values.length === 0) {
    throw new Error("Uncertainty operation produced no bounds");
  }
  let lower = values[0];
  let upper = values[0];
  for (const value of values.slice(1)) {
    if (value.getNumericValue() < lower.getNumericValue()) lower = value;
    if (value.getNumericValue() > upper.getNumericValue()) upper = value;
  }
  return { lower, upper };
};

/**
 * A numeric semantic value with a central estimate and deterministic bounds.
 * It intentionally models possibility, not probability: no confidence level or
 * distribution is implied by the interval.
 */
export class UncertainValue extends SemanticValue {
  private readonly center: SemanticValue;
  private readonly lower: SemanticValue;
  private readonly upper: SemanticValue;
  private readonly tolerance?: SemanticValue;
  private readonly displayMode: UncertaintyDisplayMode;

  constructor(
    center: SemanticValue,
    lower: SemanticValue,
    upper: SemanticValue,
    options: {
      tolerance?: SemanticValue;
      displayMode?: UncertaintyDisplayMode;
    } = {}
  ) {
    super();
    if (![center, lower, upper].every(isFiniteSemanticValue)) {
      throw new Error("Uncertain values require finite numeric center and bounds");
    }
    if (lower.getNumericValue() > upper.getNumericValue()) {
      throw new Error("Uncertainty lower bound cannot exceed upper bound");
    }
    this.center = center;
    this.lower = lower;
    this.upper = upper;
    this.tolerance = options.tolerance;
    this.displayMode = options.displayMode ?? "interval";
  }

  static plusMinus(center: SemanticValue, tolerance: SemanticValue): UncertainValue {
    if (center.getType() !== tolerance.getType()) {
      throw new Error(
        `Uncertainty center and tolerance must use the same type (${center.getType()} vs ${tolerance.getType()})`
      );
    }
    if (tolerance.getNumericValue() < 0) {
      throw new Error("Uncertainty tolerance must be zero or positive");
    }
    const lower = center.subtract(tolerance);
    const upper = center.add(tolerance);
    if (!lower.isNumeric() || !upper.isNumeric()) {
      throw new Error("Uncertainty bounds must remain numeric");
    }
    const bounds = selectBounds([lower, upper]);
    return new UncertainValue(center, bounds.lower, bounds.upper, {
      tolerance,
      displayMode: "plusMinus",
    });
  }

  static exact(value: SemanticValue): UncertainValue {
    return new UncertainValue(value, value.clone(), value.clone());
  }

  static fromBounds(
    center: SemanticValue,
    candidates: SemanticValue[]
  ): UncertainValue {
    const bounds = selectBounds(candidates);
    return new UncertainValue(center, bounds.lower, bounds.upper);
  }

  getType(): SemanticValueType {
    return "uncertain";
  }

  getNumericValue(): number {
    return this.center.getNumericValue();
  }

  getCenter(): SemanticValue {
    return this.center;
  }

  getLower(): SemanticValue {
    return this.lower;
  }

  getUpper(): SemanticValue {
    return this.upper;
  }

  getTolerance(): SemanticValue | undefined {
    return this.tolerance;
  }

  getUnderlyingType(): SemanticValueType {
    return this.center.getType();
  }

  containsZero(): boolean {
    return this.lower.getNumericValue() <= 0 && this.upper.getNumericValue() >= 0;
  }

  isNumeric(): boolean {
    return true;
  }

  canConvertTo(targetType: SemanticValueType): boolean {
    return targetType === "uncertain" || this.center.canConvertTo(targetType);
  }

  toString(options?: DisplayOptions): string {
    const center = this.center.toString(options);
    if (this.displayMode === "plusMinus" && this.tolerance) {
      return `${center} ± ${this.tolerance.toString(options)}`;
    }
    return `${center}  [${this.lower.toString(options)} – ${this.upper.toString(options)}]`;
  }

  equals(other: SemanticValue, tolerance = 1e-10): boolean {
    if (!(other instanceof UncertainValue)) return false;
    return (
      this.center.equals(other.center, tolerance) &&
      this.lower.equals(other.lower, tolerance) &&
      this.upper.equals(other.upper, tolerance)
    );
  }

  private operands(other: SemanticValue): {
    center: SemanticValue;
    lower: SemanticValue;
    upper: SemanticValue;
  } {
    if (other instanceof UncertainValue) {
      return {
        center: other.center,
        lower: other.lower,
        upper: other.upper,
      };
    }
    return { center: other, lower: other, upper: other };
  }

  add(other: SemanticValue): SemanticValue {
    const right = this.operands(other);
    return UncertainValue.fromBounds(this.center.add(right.center), [
      this.lower.add(right.lower),
      this.upper.add(right.upper),
    ]);
  }

  subtract(other: SemanticValue): SemanticValue {
    const right = this.operands(other);
    return UncertainValue.fromBounds(this.center.subtract(right.center), [
      this.lower.subtract(right.upper),
      this.upper.subtract(right.lower),
    ]);
  }

  multiply(other: SemanticValue): SemanticValue {
    const right = this.operands(other);
    return UncertainValue.fromBounds(this.center.multiply(right.center), [
      this.lower.multiply(right.lower),
      this.lower.multiply(right.upper),
      this.upper.multiply(right.lower),
      this.upper.multiply(right.upper),
    ]);
  }

  divide(other: SemanticValue): SemanticValue {
    const right = this.operands(other);
    if (right.lower.getNumericValue() <= 0 && right.upper.getNumericValue() >= 0) {
      throw new Error("Cannot divide by an uncertainty interval containing zero");
    }
    return UncertainValue.fromBounds(this.center.divide(right.center), [
      this.lower.divide(right.lower),
      this.lower.divide(right.upper),
      this.upper.divide(right.lower),
      this.upper.divide(right.upper),
    ]);
  }

  power(exponent: number): SemanticValue {
    const candidates = [this.lower.power(exponent), this.upper.power(exponent)];
    if (this.containsZero() && Number.isInteger(exponent) && Math.abs(exponent % 2) === 0) {
      candidates.push(this.lower.subtract(this.lower));
    }
    return UncertainValue.fromBounds(this.center.power(exponent), candidates);
  }

  map(
    mapper: (value: SemanticValue) => SemanticValue,
    options: { includeZero?: boolean } = {}
  ): UncertainValue {
    const candidates = [mapper(this.lower), mapper(this.upper)];
    if (options.includeZero && this.containsZero()) {
      candidates.push(mapper(this.lower.subtract(this.lower)));
    }
    return UncertainValue.fromBounds(mapper(this.center), candidates);
  }

  clone(): UncertainValue {
    return new UncertainValue(this.center.clone(), this.lower.clone(), this.upper.clone(), {
      tolerance: this.tolerance?.clone(),
      displayMode: this.displayMode,
    });
  }

  getMetadata(): Record<string, any> {
    return {
      ...super.getMetadata(),
      underlyingType: this.getUnderlyingType(),
      center: this.center.toString(),
      lower: this.lower.toString(),
      upper: this.upper.toString(),
      deterministicInterval: true,
    };
  }
}
