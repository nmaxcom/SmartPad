import { SemanticValue, DisplayOptions, SemanticValueType } from "./SemanticValue";
import { DateValue, formatZoneLabel, getDateLocaleEffective } from "./DateValue";

const pad2 = (value: number): string => String(value).padStart(2, "0");

const isDateTimeList = (items: SemanticValue[]): items is DateValue[] =>
  items.length > 0 &&
  items.every(
    (item) =>
      item instanceof DateValue && (item as DateValue).hasTimeComponent()
  );

const formatDatePart = (value: DateValue, options?: DisplayOptions): string => {
  const dt = value.getDateTime();
  if (options?.dateFormat === "locale") {
    const locale = options.dateLocale || getDateLocaleEffective();
    return dt.setLocale(locale).toLocaleString({
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }
  return `${dt.year}-${pad2(dt.month)}-${pad2(dt.day)}`;
};

const formatTimePart = (value: DateValue, options?: DisplayOptions): string => {
  const dt = value.getDateTime();
  if (options?.dateFormat === "locale") {
    const locale = options.dateLocale || getDateLocaleEffective();
    return dt.setLocale(locale).toLocaleString({
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  return `${pad2(dt.hour)}:${pad2(dt.minute)}`;
};

const formatCompactDateTimeList = (
  items: DateValue[],
  options?: DisplayOptions
): string => {
  const groups: Array<{ date: string; times: string[]; zone: string }> = [];
  for (const item of items) {
    const dateText = formatDatePart(item, options);
    const timeText = formatTimePart(item, options);
    const zoneText = formatZoneLabel(item.getZone(), item.getDateTime());
    const last = groups[groups.length - 1];
    if (!last || last.date !== dateText) {
      groups.push({ date: dateText, times: [timeText], zone: zoneText });
      continue;
    }
    last.times.push(timeText);
  }

  return groups
    .map((group) => `${group.date}: ${group.times.join(", ")} ${group.zone}`)
    .join("; ");
};

export class ListValue extends SemanticValue {
  private readonly items: SemanticValue[];
  private readonly delimiter: string;
  private readonly nestedList: boolean;

  constructor(items: SemanticValue[], delimiter = ", ") {
    super();
    const flattened = ListValue.flatten(items);
    this.items = flattened.items;
    this.nestedList = flattened.containsNestedList;
    this.delimiter = delimiter;
  }

  static fromItems(items: SemanticValue[], delimiter = ", "): ListValue {
    return new ListValue(items, delimiter);
  }

  static flatten(items: SemanticValue[]): { items: SemanticValue[]; containsNestedList: boolean } {
    const flattened: SemanticValue[] = [];
    let containsNestedList = false;
    for (const item of items) {
      if (item instanceof ListValue) {
        containsNestedList = true;
        const inner = ListValue.flatten(item.getItems());
        flattened.push(...inner.items);
        containsNestedList = containsNestedList || inner.containsNestedList;
      } else {
        flattened.push(item);
      }
    }
    return { items: flattened, containsNestedList };
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
    if (isDateTimeList(this.items)) {
      return formatCompactDateTimeList(this.items, options);
    }
    return this.items.map((item) => item.toString(options)).join(", ");
  }

  containsNestedList(): boolean {
    return this.nestedList;
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
