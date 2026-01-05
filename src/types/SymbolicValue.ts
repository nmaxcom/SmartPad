import { SemanticValue, SemanticValueType, DisplayOptions } from "./SemanticValue";

export class SymbolicValue extends SemanticValue {
  private expression: string;

  constructor(expression: string) {
    super();
    this.expression = expression.trim();
  }

  static from(expression: string): SymbolicValue {
    return new SymbolicValue(expression);
  }

  getType(): SemanticValueType {
    return "symbolic";
  }

  getNumericValue(): number {
    return Number.NaN;
  }

  isNumeric(): boolean {
    return false;
  }

  canConvertTo(_targetType: SemanticValueType): boolean {
    return false;
  }

  toString(_options?: DisplayOptions): string {
    return this.expression;
  }

  equals(other: SemanticValue): boolean {
    return other.getType() === "symbolic" && other.toString() === this.expression;
  }

  add(other: SemanticValue): SemanticValue {
    return SymbolicValue.combine(this.expression, "+", other.toString());
  }

  subtract(other: SemanticValue): SemanticValue {
    return SymbolicValue.combine(this.expression, "-", other.toString());
  }

  multiply(other: SemanticValue): SemanticValue {
    return SymbolicValue.combine(this.expression, "*", other.toString());
  }

  divide(other: SemanticValue): SemanticValue {
    return SymbolicValue.combine(this.expression, "/", other.toString());
  }

  power(exponent: number): SemanticValue {
    return SymbolicValue.combine(this.expression, "^", exponent.toString());
  }

  clone(): SemanticValue {
    return new SymbolicValue(this.expression);
  }

  private static combine(left: string, op: string, right: string): SymbolicValue {
    const leftExpr = SymbolicValue.wrapIfNeeded(left);
    const rightExpr = SymbolicValue.wrapIfNeeded(right);
    return new SymbolicValue(`${leftExpr} ${op} ${rightExpr}`);
  }

  private static wrapIfNeeded(expr: string): string {
    const trimmed = expr.trim();
    if (!trimmed) return trimmed;
    if (!/\s|[+\-*/^]/.test(trimmed)) {
      return trimmed;
    }
    return `(${trimmed})`;
  }
}
