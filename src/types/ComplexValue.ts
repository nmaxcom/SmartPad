import { DisplayOptions, SemanticValue, SemanticValueType } from "./SemanticValue";
import { NumberValue } from "./NumberValue";

const EPSILON = 1e-12;

export class ComplexValue extends SemanticValue {
  constructor(private readonly real: number, private readonly imaginary: number) {
    super();
    if (!Number.isFinite(real) || !Number.isFinite(imaginary)) {
      throw new Error("Complex values require finite real and imaginary parts");
    }
  }

  static from(real: number, imaginary = 0): ComplexValue {
    return new ComplexValue(real, imaginary);
  }

  static parse(input: string): ComplexValue | null {
    const value = input.trim().replace(/\s+/g, "").replace(/−/g, "-");
    if (!value) return null;
    if (value === "i" || value === "+i") return new ComplexValue(0, 1);
    if (value === "-i") return new ComplexValue(0, -1);

    const pureImaginary = value.match(/^([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)i$/i);
    if (pureImaginary) {
      return new ComplexValue(0, Number(pureImaginary[1]));
    }

    const cartesian = value.match(
      /^([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)([+-])((?:\d+(?:\.\d+)?|\.\d+)?(?:e[+-]?\d+)?)?i$/i
    );
    if (!cartesian) return null;
    const magnitude = cartesian[3] ? Number(cartesian[3]) : 1;
    return new ComplexValue(Number(cartesian[1]), cartesian[2] === "-" ? -magnitude : magnitude);
  }

  getType(): SemanticValueType {
    return "complex";
  }

  getReal(): number {
    return this.real;
  }

  getImaginary(): number {
    return this.imaginary;
  }

  getNumericValue(): number {
    return Math.abs(this.imaginary) <= EPSILON ? this.real : Number.NaN;
  }

  isNumeric(): boolean {
    return Math.abs(this.imaginary) <= EPSILON;
  }

  canConvertTo(targetType: SemanticValueType): boolean {
    return targetType === "complex" || (targetType === "number" && Math.abs(this.imaginary) <= EPSILON);
  }

  toString(options?: DisplayOptions): string {
    const precision = options?.precision ?? 6;
    const real = Math.abs(this.real) <= EPSILON ? 0 : this.real;
    const imaginary = Math.abs(this.imaginary) <= EPSILON ? 0 : this.imaginary;
    if (imaginary === 0) return this.formatNumber(real, precision, options);

    const magnitude = Math.abs(imaginary);
    const imaginaryText = Math.abs(magnitude - 1) <= EPSILON
      ? "i"
      : `${this.formatNumber(magnitude, precision, options)}i`;
    if (real === 0) return imaginary < 0 ? `-${imaginaryText}` : imaginaryText;
    const realText = this.formatNumber(real, precision, options);
    return `${realText} ${imaginary < 0 ? "-" : "+"} ${imaginaryText}`;
  }

  equals(other: SemanticValue, tolerance = EPSILON): boolean {
    if (!(other instanceof ComplexValue)) return false;
    return (
      Math.abs(this.real - other.real) <= tolerance &&
      Math.abs(this.imaginary - other.imaginary) <= tolerance
    );
  }

  private coerce(other: SemanticValue): ComplexValue {
    if (other instanceof ComplexValue) return other;
    if (other instanceof NumberValue) return new ComplexValue(other.getNumericValue(), 0);
    throw this.createIncompatibilityError(other, "combine", "complex arithmetic accepts numbers or complex values");
  }

  add(other: SemanticValue): SemanticValue {
    const value = this.coerce(other);
    return new ComplexValue(this.real + value.real, this.imaginary + value.imaginary);
  }

  subtract(other: SemanticValue): SemanticValue {
    const value = this.coerce(other);
    return new ComplexValue(this.real - value.real, this.imaginary - value.imaginary);
  }

  multiply(other: SemanticValue): SemanticValue {
    const value = this.coerce(other);
    return new ComplexValue(
      this.real * value.real - this.imaginary * value.imaginary,
      this.real * value.imaginary + this.imaginary * value.real
    );
  }

  divide(other: SemanticValue): SemanticValue {
    const value = this.coerce(other);
    const denominator = value.real ** 2 + value.imaginary ** 2;
    if (denominator <= EPSILON) throw new Error("division by zero");
    return new ComplexValue(
      (this.real * value.real + this.imaginary * value.imaginary) / denominator,
      (this.imaginary * value.real - this.real * value.imaginary) / denominator
    );
  }

  power(exponent: number): SemanticValue {
    const radius = Math.hypot(this.real, this.imaginary);
    const angle = Math.atan2(this.imaginary, this.real);
    const poweredRadius = radius ** exponent;
    return new ComplexValue(
      poweredRadius * Math.cos(angle * exponent),
      poweredRadius * Math.sin(angle * exponent)
    );
  }

  clone(): SemanticValue {
    return new ComplexValue(this.real, this.imaginary);
  }
}
