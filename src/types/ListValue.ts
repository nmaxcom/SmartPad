import { SemanticValue, DisplayOptions, SemanticValueType } from "./SemanticValue";

export class ListValue extends SemanticValue {
  private readonly items: SemanticValue[];
  private readonly delimiter: string;

  constructor(items: SemanticValue[], delimiter = ", ") {
    super();
    this.items = ListValue.flatten(items);
    this.delimiter = delimiter;
  }

  static fromItems(items: SemanticValue[], delimiter = ", "): ListValue {
    return new ListValue(items, delimiter);
  }

  static flatten(items: SemanticValue[]): SemanticValue[] {
    const flattened: SemanticValue[] = [];
    for (const item of items) {
      if (item instanceof ListValue) {
        flattened.push(...item.getItems());
      } else {
        flattened.push(item);
      }
    }
    return flattened;
  }

  getType(): SemanticValueType {
    return "list";
  }

  getItems(): SemanticValue[] {
    return this.items.slice();
  }

  getDelimiter(): string {
    return this.delimiter;
  }

  getNumericValue(): number {
    throw new Error("ListValue cannot be treated as a numeric scalar");
  }

  isNumeric(): boolean {
    return false;
  }

  canConvertTo(_targetType: SemanticValueType): boolean {
    return false;
  }

  toString(options?: DisplayOptions): string {
    if (this.items.length === 0) {
      return "()";
    }
    return this.items.map((item) => item.toString(options)).join(this.delimiter);
  }

  equals(other: SemanticValue): boolean {
    if (!(other instanceof ListValue)) return false;
    if (this.items.length !== other.items.length) return false;
    return this.items.every((item, index) => item.equals(other.items[index]));
  }

  add(_other: SemanticValue): SemanticValue {
    throw new Error("Cannot add list values directly");
  }

  subtract(_other: SemanticValue): SemanticValue {
    throw new Error("Cannot subtract list values directly");
  }

  multiply(_other: SemanticValue): SemanticValue {
    throw new Error("Cannot multiply list values directly");
  }

  divide(_other: SemanticValue): SemanticValue {
    throw new Error("Cannot divide list values directly");
  }

  power(_exponent: number): SemanticValue {
    throw new Error("Cannot exponentiate list values");
  }

  clone(): SemanticValue {
    return new ListValue(this.items.slice(), this.delimiter);
  }
}
