import { UnitValue } from "./UnitValue";
import { SmartPadQuantity } from "../units/unitsnetAdapter";
import { DisplayOptions } from "./SemanticValue";

export class UnitValueWithDisplay extends UnitValue {
  private readonly displayValue: number;
  private readonly displayUnit: string;

  constructor(base: UnitValue, displayValue: number, displayUnit: string) {
    super(base.getQuantity(), { forceUnitDisplay: true });
    this.displayValue = displayValue;
    this.displayUnit = displayUnit;
  }

  toString(options?: DisplayOptions): string {
    const precision = options?.precision ?? 6;
    const quantity = new SmartPadQuantity(this.displayValue, this.displayUnit);
    return quantity.toString(precision, { ...options, forceUnit: true });
  }
}
