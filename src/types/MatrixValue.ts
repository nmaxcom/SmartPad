import { DisplayOptions, SemanticValue, SemanticValueType } from "./SemanticValue";
import { ComplexValue } from "./ComplexValue";
import { NumberValue } from "./NumberValue";

export type MatrixScalar = NumberValue | ComplexValue;

const cloneRows = (rows: MatrixScalar[][]): MatrixScalar[][] =>
  rows.map((row) => row.map((value) => value.clone() as MatrixScalar));

export class MatrixValue extends SemanticValue {
  static readonly maxRows = 25;
  static readonly maxColumns = 25;

  constructor(private readonly rows: MatrixScalar[][]) {
    super();
    if (rows.length === 0 || rows[0]?.length === 0) {
      throw new Error("A matrix needs at least one row and one column");
    }
    const width = rows[0].length;
    if (rows.some((row) => row.length !== width)) {
      throw new Error("Matrix rows must have the same length");
    }
    if (rows.length > MatrixValue.maxRows || width > MatrixValue.maxColumns) {
      throw new Error(`Matrices are limited to ${MatrixValue.maxRows} × ${MatrixValue.maxColumns}`);
    }
  }

  static fromRows(rows: MatrixScalar[][]): MatrixValue {
    return new MatrixValue(cloneRows(rows));
  }

  static fromNumbers(rows: Array<Array<number | { re: number; im: number }>>): MatrixValue {
    return new MatrixValue(
      rows.map((row) =>
        row.map((value) =>
          typeof value === "number"
            ? NumberValue.from(value)
            : ComplexValue.from(value.re, value.im)
        )
      )
    );
  }

  getType(): SemanticValueType {
    return "matrix";
  }

  getRows(): MatrixScalar[][] {
    return cloneRows(this.rows);
  }

  getShape(): [number, number] {
    return [this.rows.length, this.rows[0].length];
  }

  getNumericValue(): number {
    throw new Error("MatrixValue cannot be treated as a numeric scalar");
  }

  isNumeric(): boolean {
    return false;
  }

  canConvertTo(targetType: SemanticValueType): boolean {
    return targetType === "matrix";
  }

  toString(options?: DisplayOptions): string {
    return `[${this.rows
      .map((row) => row.map((value) => value.toString(options)).join(", "))
      .join("; ")}]`;
  }

  equals(other: SemanticValue, tolerance = 1e-12): boolean {
    if (!(other instanceof MatrixValue)) return false;
    const [rows, columns] = this.getShape();
    const [otherRows, otherColumns] = other.getShape();
    if (rows !== otherRows || columns !== otherColumns) return false;
    const otherValues = other.rows;
    return this.rows.every((row, rowIndex) =>
      row.every((value, columnIndex) => value.equals(otherValues[rowIndex][columnIndex], tolerance))
    );
  }

  add(_other: SemanticValue): SemanticValue {
    throw new Error("Use matrix expressions to add matrices");
  }

  subtract(_other: SemanticValue): SemanticValue {
    throw new Error("Use matrix expressions to subtract matrices");
  }

  multiply(_other: SemanticValue): SemanticValue {
    throw new Error("Use matrix expressions to multiply matrices");
  }

  divide(_other: SemanticValue): SemanticValue {
    throw new Error("Matrix division is ambiguous; use inv(A) or linsolve(A, b)");
  }

  power(_exponent: number): SemanticValue {
    throw new Error("Use matrix expressions to exponentiate matrices");
  }

  clone(): SemanticValue {
    return new MatrixValue(cloneRows(this.rows));
  }
}
