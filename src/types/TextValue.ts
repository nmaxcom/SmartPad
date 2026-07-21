import { DisplayOptions, SemanticValue, SemanticValueType } from "./SemanticValue";

/** A literal text cell used by structured collections. */
export class TextValue extends SemanticValue {
  constructor(private readonly value: string) {
    super();
  }

  static from(value: string): TextValue {
    return new TextValue(value.trim());
  }

  getType(): SemanticValueType {
    return "text";
  }

  getValue(): string {
    return this.value;
  }

  getNumericValue(): number {
    throw new Error("TextValue cannot be treated as a number");
  }

  isNumeric(): boolean {
    return false;
  }

  canConvertTo(_targetType: SemanticValueType): boolean {
    return false;
  }

  toString(_options?: DisplayOptions): string {
    return this.value;
  }

  equals(other: SemanticValue): boolean {
    return other instanceof TextValue && other.value === this.value;
  }

  add(_other: SemanticValue): SemanticValue {
    throw new Error("Cannot add text values");
  }

  subtract(_other: SemanticValue): SemanticValue {
    throw new Error("Cannot subtract text values");
  }

  multiply(_other: SemanticValue): SemanticValue {
    throw new Error("Cannot multiply text values");
  }

  divide(_other: SemanticValue): SemanticValue {
    throw new Error("Cannot divide text values");
  }

  power(_exponent: number): SemanticValue {
    throw new Error("Cannot exponentiate text values");
  }

  clone(): SemanticValue {
    return new TextValue(this.value);
  }
}
