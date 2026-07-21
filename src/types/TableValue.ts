import { DisplayOptions, SemanticValue, SemanticValueType } from "./SemanticValue";
import { ListValue } from "./ListValue";

export interface TableColumn {
  readonly name: string;
  readonly values: SemanticValue[];
  readonly derived?: boolean;
}

const normalizeColumnName = (name: string): string => name.replace(/\s+/g, " ").trim();

export class TableValue extends SemanticValue {
  static readonly maxRows = 500;
  static readonly maxColumns = 40;

  private readonly columns: TableColumn[];

  constructor(private readonly name: string, columns: TableColumn[]) {
    super();
    if (!name.trim()) throw new Error("A table needs a name");
    if (columns.length === 0) throw new Error("A table needs at least one column");
    if (columns.length > TableValue.maxColumns) {
      throw new Error(`Tables are limited to ${TableValue.maxColumns} columns`);
    }
    const names = columns.map((column) => normalizeColumnName(column.name));
    if (names.some((columnName) => !columnName)) {
      throw new Error("Table column names cannot be empty");
    }
    if (new Set(names.map((columnName) => columnName.toLowerCase())).size !== names.length) {
      throw new Error("Table column names must be unique");
    }
    const rowCount = columns[0].values.length;
    if (rowCount > TableValue.maxRows) {
      throw new Error(`Tables are limited to ${TableValue.maxRows} data rows`);
    }
    if (columns.some((column) => column.values.length !== rowCount)) {
      throw new Error("Every table column must have the same number of rows");
    }
    this.columns = columns.map((column, index) => ({
      name: names[index],
      values: column.values.map((value) => value.clone()),
      derived: column.derived,
    }));
  }

  getType(): SemanticValueType {
    return "table";
  }

  getName(): string {
    return this.name;
  }

  getColumns(): TableColumn[] {
    return this.columns.map((column) => ({
      ...column,
      values: column.values.map((value) => value.clone()),
    }));
  }

  getColumn(name: string): ListValue | null {
    const normalized = normalizeColumnName(name).toLowerCase();
    const column = this.columns.find((entry) => entry.name.toLowerCase() === normalized);
    return column ? ListValue.fromItems(column.values.map((value) => value.clone())) : null;
  }

  withColumn(name: string, values: SemanticValue[], derived = true): TableValue {
    if (values.length !== this.getRowCount()) {
      throw new Error(
        `Derived column "${name}" needs ${this.getRowCount()} values, received ${values.length}`
      );
    }
    const normalized = normalizeColumnName(name);
    const existingIndex = this.columns.findIndex(
      (column) => column.name.toLowerCase() === normalized.toLowerCase()
    );
    const columns = this.getColumns();
    const next = { name: normalized, values, derived };
    if (existingIndex >= 0) columns[existingIndex] = next;
    else columns.push(next);
    return new TableValue(this.name, columns);
  }

  getRowCount(): number {
    return this.columns[0]?.values.length ?? 0;
  }

  getNumericValue(): number {
    throw new Error("TableValue cannot be treated as a numeric scalar");
  }

  isNumeric(): boolean {
    return false;
  }

  canConvertTo(targetType: SemanticValueType): boolean {
    return targetType === "table";
  }

  toString(_options?: DisplayOptions): string {
    const rows = this.getRowCount();
    const rowLabel = rows === 1 ? "row" : "rows";
    const columnLabel = this.columns.length === 1 ? "column" : "columns";
    return `${rows} ${rowLabel} × ${this.columns.length} ${columnLabel}`;
  }

  equals(other: SemanticValue): boolean {
    if (!(other instanceof TableValue) || other.name !== this.name) return false;
    const otherColumns = other.columns;
    if (otherColumns.length !== this.columns.length) return false;
    return this.columns.every((column, columnIndex) => {
      const candidate = otherColumns[columnIndex];
      return (
        candidate.name === column.name &&
        candidate.values.length === column.values.length &&
        column.values.every((value, valueIndex) => value.equals(candidate.values[valueIndex]))
      );
    });
  }

  add(_other: SemanticValue): SemanticValue {
    throw new Error("Tables do not support scalar addition");
  }

  subtract(_other: SemanticValue): SemanticValue {
    throw new Error("Tables do not support scalar subtraction");
  }

  multiply(_other: SemanticValue): SemanticValue {
    throw new Error("Tables do not support scalar multiplication");
  }

  divide(_other: SemanticValue): SemanticValue {
    throw new Error("Tables do not support scalar division");
  }

  power(_exponent: number): SemanticValue {
    throw new Error("Tables cannot be exponentiated");
  }

  clone(): SemanticValue {
    return new TableValue(this.name, this.getColumns());
  }
}
