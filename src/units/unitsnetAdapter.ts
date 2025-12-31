/**
 * UnitsNet.js Adapter for SmartPad
 *
 * This module provides an adapter layer between unitsnet-js and SmartPad's
 * existing units system, allowing for gradual migration while maintaining
 * backward compatibility.
 */

// Import real unitsnet-js classes
import {
  Length,
  LengthUnits,
  Mass,
  MassUnits,
  Duration,
  DurationUnits,
  Temperature,
  TemperatureUnits,
  Area,
  AreaUnits,
  Volume,
  VolumeUnits,
  Speed,
  SpeedUnits,
  Force,
  ForceUnits,
  Pressure,
  PressureUnits,
  Energy,
  EnergyUnits,
  Power,
  PowerUnits,
  ElectricCurrent,
  ElectricCurrentUnits,
  Acceleration,
  AccelerationUnits,
  ElectricPotential,
  ElectricPotentialUnits,
  ElectricResistance,
  ElectricResistanceUnits,
  Frequency,
  FrequencyUnits,
  Angle,
  AngleUnits,
  Information,
  InformationUnits,
  RotationalSpeed,
  RotationalSpeedUnits,
} from "unitsnet-js";
import { CompositeUnit, Quantity, UnitParser } from "./quantity";
import { formatDimension } from "./definitions";

// Type for any unitsnet-js value - using any for now to avoid complex type issues
type UnitsNetValue = any;

// Mathematical constants
export const MATHEMATICAL_CONSTANTS = {
  PI: 3.141592653589793,
  E: 2.718281828459045,
};

function normalizeUnitString(unitString: string): string {
  return unitString.trim().replace(/·/g, "*");
}

/**
 * SmartPad Quantity adapter that wraps unitsnet-js values
 */
export class SmartPadQuantity {
  private _value: number;
  private _unit: string;
  private _unitsnetValue?: UnitsNetValue; // The underlying unitsnet-js value
  private _quantity?: Quantity;

  constructor(value: number, unit: string, unitsnetValue?: UnitsNetValue, quantity?: Quantity) {
    this._value = quantity ? quantity.value : value;
    this._unit = unit || (quantity ? quantity.unit.toString() : unit);
    this._unitsnetValue = unitsnetValue;
    this._quantity = quantity;
  }

  get value(): number {
    return this._value;
  }

  get unit(): string {
    return this._unit;
  }

  get unitsnetValue(): UnitsNetValue | undefined {
    return this._unitsnetValue;
  }

  get quantity(): Quantity | undefined {
    return this._quantity;
  }

  /**
   * Create a SmartPadQuantity with a specific unit string (preserves original unit)
   */
  static fromValueAndUnit(value: number, unit: string): SmartPadQuantity {
    const normalizedUnit = normalizeUnitString(unit);
    if (normalizedUnit === "" || normalizedUnit === "1") {
      return SmartPadQuantity.dimensionless(value);
    }

    try {
      const unitsnetValue = UnitsNetParser.parse(value, normalizedUnit);
      const quantity = SmartPadQuantity.buildQuantity(value, normalizedUnit);
      return new SmartPadQuantity(value, normalizedUnit, unitsnetValue, quantity || undefined);
    } catch {
      const compositeUnit = UnitParser.parse(normalizedUnit);
      const quantity = new Quantity(value, compositeUnit);
      return SmartPadQuantity.fromQuantity(quantity);
    }
  }

  static fromQuantity(quantity: Quantity): SmartPadQuantity {
    return new SmartPadQuantity(quantity.value, quantity.unit.toString(), undefined, quantity);
  }

  /**
   * Create a SmartPadQuantity from a unitsnet-js value
   */
  static fromUnitsNet(unitsnetValue: UnitsNetValue): SmartPadQuantity {
    if (!unitsnetValue) {
      throw new Error("Invalid unitsnet value");
    }

    // Get the base value and unit from unitsnet-js
    let value: number;
    let unit: string;

    // Extract value based on the specific type
    if (unitsnetValue instanceof Length) {
      value = unitsnetValue.Meters;
      unit = "m";
    } else if (unitsnetValue instanceof Mass) {
      value = unitsnetValue.Kilograms;
      unit = "kg";
    } else if (unitsnetValue instanceof Duration) {
      value = unitsnetValue.Seconds;
      unit = "s";
    } else if (unitsnetValue instanceof Temperature) {
      value = unitsnetValue.Kelvins;
      unit = "K";
    } else if (unitsnetValue instanceof Area) {
      value = unitsnetValue.SquareMeters;
      unit = "m^2";
    } else if (unitsnetValue instanceof Volume) {
      value = unitsnetValue.CubicMeters;
      unit = "m^3";
    } else if (unitsnetValue instanceof Speed) {
      value = unitsnetValue.MetersPerSecond;
      unit = "m/s";
    } else if (unitsnetValue instanceof Force) {
      value = unitsnetValue.Newtons;
      unit = "N";
    } else if (unitsnetValue instanceof Pressure) {
      value = unitsnetValue.Pascals;
      unit = "Pa";
    } else if (unitsnetValue instanceof Energy) {
      value = unitsnetValue.Joules;
      unit = "J";
    } else if (unitsnetValue instanceof Power) {
      value = unitsnetValue.Watts;
      unit = "W";
    } else if (unitsnetValue instanceof ElectricCurrent) {
      value = unitsnetValue.Amperes;
      unit = "A";
    } else if (unitsnetValue instanceof ElectricPotential) {
      value = unitsnetValue.Volts;
      unit = "V";
    } else if (unitsnetValue instanceof ElectricResistance) {
      value = unitsnetValue.Ohms;
      unit = "ohm";
    } else if (unitsnetValue instanceof Frequency) {
      value = unitsnetValue.Hertz;
      unit = "Hz";
    } else if (unitsnetValue instanceof Angle) {
      value = unitsnetValue.Radians;
      unit = "rad";
    } else if (unitsnetValue instanceof Information) {
      value = unitsnetValue.Bytes;
      unit = "B";
    } else if (unitsnetValue instanceof RotationalSpeed) {
      value = unitsnetValue.RevolutionsPerMinute;
      unit = "rpm";
    } else if (unitsnetValue instanceof Acceleration) {
      value = unitsnetValue.MetersPerSecondSquared;
      unit = "m/s^2";
    } else {
      throw new Error("Unsupported unitsnet-js type");
    }

    const quantity = SmartPadQuantity.buildQuantity(value, unit);
    return new SmartPadQuantity(value, unit, unitsnetValue, quantity || undefined);
  }

  /**
   * Create a dimensionless quantity
   */
  static dimensionless(value: number): SmartPadQuantity {
    return new SmartPadQuantity(value, "");
  }

  clone(): SmartPadQuantity {
    if (this._quantity) {
      return SmartPadQuantity.fromQuantity(this._quantity);
    }
    return new SmartPadQuantity(this._value, this._unit, this._unitsnetValue);
  }

  private toQuantity(): Quantity | null {
    if (this._quantity) return this._quantity;
    if (this.isDimensionless()) {
      return Quantity.dimensionless(this._value);
    }
    try {
      const parsedUnit = UnitParser.parse(this._unit);
      return new Quantity(this._value, parsedUnit);
    } catch {
      return null;
    }
  }

  private static tryParseCompositeUnit(unitString: string): CompositeUnit | null {
    try {
      return UnitParser.parse(unitString);
    } catch {
      return null;
    }
  }

  private static hasTemperatureDimension(unit: CompositeUnit): boolean {
    return unit.components.some(
      (component) =>
        component.unit.baseOffset !== undefined || component.unit.dimension.temperature !== 0
    );
  }

  private static buildQuantity(value: number, unitString: string): Quantity | null {
    const composite = SmartPadQuantity.tryParseCompositeUnit(unitString);
    if (!composite) return null;
    if (SmartPadQuantity.hasTemperatureDimension(composite)) return null;
    return new Quantity(value, composite);
  }

  /**
   * Convert to a different unit
   */
  convertTo(targetUnit: string): SmartPadQuantity {
    const normalizedTarget = normalizeUnitString(targetUnit);
    if (normalizedTarget === "" || normalizedTarget === "1") {
      if (this.isDimensionless()) {
        return SmartPadQuantity.dimensionless(this._value);
      }
      throw new Error(`Cannot convert ${this._unit} to ${targetUnit}`);
    }

    const isCompositeTarget = /[*/^]/.test(normalizedTarget);
    if (this._unitsnetValue && !isCompositeTarget) {
      try {
        let convertedValue: number;

        if (this._unitsnetValue instanceof Length) {
          convertedValue = this.convertLength(this._unitsnetValue, normalizedTarget);
        } else if (this._unitsnetValue instanceof Mass) {
          convertedValue = this.convertMass(this._unitsnetValue, normalizedTarget);
        } else if (this._unitsnetValue instanceof Duration) {
          convertedValue = this.convertDuration(this._unitsnetValue, normalizedTarget);
        } else if (this._unitsnetValue instanceof Temperature) {
          convertedValue = this.convertTemperature(this._unitsnetValue, normalizedTarget);
        } else if (this._unitsnetValue instanceof Area) {
          convertedValue = this.convertArea(this._unitsnetValue, normalizedTarget);
        } else if (this._unitsnetValue instanceof Volume) {
          convertedValue = this.convertVolume(this._unitsnetValue, normalizedTarget);
        } else if (this._unitsnetValue instanceof Speed) {
          convertedValue = this.convertSpeed(this._unitsnetValue, normalizedTarget);
        } else if (this._unitsnetValue instanceof Force) {
          convertedValue = this.convertForce(this._unitsnetValue, normalizedTarget);
        } else if (this._unitsnetValue instanceof Pressure) {
          convertedValue = this.convertPressure(this._unitsnetValue, normalizedTarget);
        } else if (this._unitsnetValue instanceof Energy) {
          convertedValue = this.convertEnergy(this._unitsnetValue, normalizedTarget);
        } else if (this._unitsnetValue instanceof Power) {
          convertedValue = this.convertPower(this._unitsnetValue, normalizedTarget);
        } else if (this._unitsnetValue instanceof ElectricCurrent) {
          convertedValue = this.convertElectricCurrent(this._unitsnetValue, normalizedTarget);
        } else if (this._unitsnetValue instanceof ElectricPotential) {
          convertedValue = this.convertElectricPotential(this._unitsnetValue, normalizedTarget);
        } else if (this._unitsnetValue instanceof ElectricResistance) {
          convertedValue = this.convertElectricResistance(this._unitsnetValue, normalizedTarget);
        } else if (this._unitsnetValue instanceof RotationalSpeed) {
          convertedValue = this.convertRotationalSpeed(this._unitsnetValue, normalizedTarget);
        } else if (this._unitsnetValue instanceof Acceleration) {
          convertedValue = this.convertAcceleration(this._unitsnetValue, normalizedTarget);
        } else {
          throw new Error(`Cannot convert ${this._unit} to ${normalizedTarget}`);
        }

        const newUnitsNetValue = UnitsNetParser.parse(convertedValue, normalizedTarget);
        return new SmartPadQuantity(convertedValue, normalizedTarget, newUnitsNetValue);
      } catch {
        // Fall back to composite unit conversion below
      }
    }

    const targetComposite = SmartPadQuantity.tryParseCompositeUnit(normalizedTarget);
    const sourceQuantity = this.toQuantity();
    if (
      targetComposite &&
      sourceQuantity &&
      !SmartPadQuantity.hasTemperatureDimension(sourceQuantity.unit) &&
      !SmartPadQuantity.hasTemperatureDimension(targetComposite)
    ) {
      const converted = sourceQuantity.convertToUnit(targetComposite);
      return SmartPadQuantity.fromQuantity(converted);
    }

    if (this._unitsnetValue) {
      // Convert using unitsnet-js based on the type
      let convertedValue: number;

      try {
        if (this._unitsnetValue instanceof Length) {
          convertedValue = this.convertLength(this._unitsnetValue, normalizedTarget);
        } else if (this._unitsnetValue instanceof Mass) {
          convertedValue = this.convertMass(this._unitsnetValue, normalizedTarget);
        } else if (this._unitsnetValue instanceof Duration) {
          convertedValue = this.convertDuration(this._unitsnetValue, normalizedTarget);
        } else if (this._unitsnetValue instanceof Temperature) {
          convertedValue = this.convertTemperature(this._unitsnetValue, normalizedTarget);
        } else if (this._unitsnetValue instanceof Area) {
          convertedValue = this.convertArea(this._unitsnetValue, normalizedTarget);
        } else if (this._unitsnetValue instanceof Volume) {
          convertedValue = this.convertVolume(this._unitsnetValue, normalizedTarget);
        } else if (this._unitsnetValue instanceof Speed) {
          convertedValue = this.convertSpeed(this._unitsnetValue, normalizedTarget);
        } else if (this._unitsnetValue instanceof Force) {
          convertedValue = this.convertForce(this._unitsnetValue, normalizedTarget);
        } else if (this._unitsnetValue instanceof Pressure) {
          convertedValue = this.convertPressure(this._unitsnetValue, normalizedTarget);
        } else if (this._unitsnetValue instanceof Energy) {
          convertedValue = this.convertEnergy(this._unitsnetValue, normalizedTarget);
        } else if (this._unitsnetValue instanceof Power) {
          convertedValue = this.convertPower(this._unitsnetValue, normalizedTarget);
        } else if (this._unitsnetValue instanceof ElectricCurrent) {
          convertedValue = this.convertElectricCurrent(this._unitsnetValue, normalizedTarget);
        } else if (this._unitsnetValue instanceof ElectricPotential) {
          convertedValue = this.convertElectricPotential(this._unitsnetValue, normalizedTarget);
        } else if (this._unitsnetValue instanceof ElectricResistance) {
          convertedValue = this.convertElectricResistance(this._unitsnetValue, normalizedTarget);
        } else if (this._unitsnetValue instanceof RotationalSpeed) {
          convertedValue = this.convertRotationalSpeed(this._unitsnetValue, normalizedTarget);
        } else if (this._unitsnetValue instanceof Acceleration) {
          convertedValue = this.convertAcceleration(this._unitsnetValue, normalizedTarget);
        } else {
          throw new Error(`Cannot convert ${this._unit} to ${normalizedTarget}`);
        }

        // Create a new UnitsNet value in the target unit
        const newUnitsNetValue = UnitsNetParser.parse(convertedValue, normalizedTarget);
        return new SmartPadQuantity(convertedValue, normalizedTarget, newUnitsNetValue);
      } catch {
        // Fall back to composite unit conversion below
      }
    }

    if (!sourceQuantity) {
      throw new Error(`Cannot convert ${this._unit} to ${targetUnit}`);
    }

    try {
      const fallbackTarget = targetComposite || UnitParser.parse(normalizedTarget);
      const converted = sourceQuantity.convertToUnit(fallbackTarget);
      return SmartPadQuantity.fromQuantity(converted);
    } catch (error) {
      throw new Error(
        `Cannot convert ${this._unit} to ${targetUnit}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private convertLength(length: Length, targetUnit: string): number {
    switch (targetUnit) {
      case "m":
        return length.Meters;
      case "mm":
        return length.Millimeters;
      case "cm":
        return length.Centimeters;
      case "km":
        return length.Kilometers;
      case "in":
        return length.Inches;
      case "ft":
        return length.Feet;
      case "mi":
        return length.Miles;
      default:
        throw new Error(`Unknown length unit: ${targetUnit}`);
    }
  }

  private convertMass(mass: Mass, targetUnit: string): number {
    switch (targetUnit) {
      case "kg":
        return mass.Kilograms;
      case "g":
        return mass.Grams;
      case "lb":
        return mass.Pounds;
      case "lbs":
        return mass.Pounds;
      default:
        throw new Error(`Unknown mass unit: ${targetUnit}`);
    }
  }

  private convertDuration(duration: Duration, targetUnit: string): number {
    switch (targetUnit) {
      case "s":
        return duration.Seconds;
      case "min":
        return duration.Minutes;
      case "h":
        return duration.Hours;
      case "day":
        return duration.Days;
      default:
        throw new Error(`Unknown duration unit: ${targetUnit}`);
    }
  }

  private convertTemperature(temperature: Temperature, targetUnit: string): number {
    switch (targetUnit) {
      case "K":
        return temperature.Kelvins;
      case "C":
      case "°C":
        return temperature.DegreesCelsius;
      case "F":
      case "°F":
        return temperature.DegreesFahrenheit;
      default:
        throw new Error(`Unknown temperature unit: ${targetUnit}`);
    }
  }

  private convertArea(area: Area, targetUnit: string): number {
    switch (targetUnit) {
      case "m^2":
      case "sqm":
        return area.SquareMeters;
      case "ft^2":
      case "sqft":
        return area.SquareFeet;
      default:
        throw new Error(`Unknown area unit: ${targetUnit}`);
    }
  }

  private convertVolume(volume: Volume, targetUnit: string): number {
    switch (targetUnit) {
      case "m^3":
        return volume.CubicMeters;
      case "ft^3":
        return volume.CubicFeet;
      default:
        throw new Error(`Unknown volume unit: ${targetUnit}`);
    }
  }

  private convertSpeed(speed: Speed, targetUnit: string): number {
    switch (targetUnit) {
      case "m/s":
        return speed.MetersPerSecond;
      case "km/h":
      case "kph":
        return speed.KilometersPerHour;
      case "mph":
        return speed.MilesPerHour;
      case "ft/s":
        return speed.FeetPerSecond;
      default:
        throw new Error(`Unknown speed unit: ${targetUnit}`);
    }
  }

  // Derive speed from length/time when needed
  private static deriveSpeed(
    numerator: SmartPadQuantity,
    denominator: SmartPadQuantity
  ): SmartPadQuantity {
    const length = UnitsNetParser.parse(numerator.value, numerator.unit) as Length;
    const time = UnitsNetParser.parse(denominator.value, denominator.unit) as Duration;
    if (!(length instanceof Length) || !(time instanceof Duration)) {
      // Fallback to symbolic
      return new SmartPadQuantity(
        numerator.value / denominator.value,
        `${numerator.unit}/${denominator.unit}`
      );
    }
    const sp = Speed.FromMetersPerSecond(length.Meters / time.Seconds);
    return SmartPadQuantity.fromUnitsNet(sp);
  }

  private convertForce(force: Force, targetUnit: string): number {
    switch (targetUnit) {
      case "N":
        return force.Newtons;
      case "lbf":
        return force.PoundsForce;
      default:
        throw new Error(`Unknown force unit: ${targetUnit}`);
    }
  }

  private convertPressure(pressure: Pressure, targetUnit: string): number {
    switch (targetUnit) {
      case "Pa":
        return pressure.Pascals;
      case "kPa":
        return pressure.Kilopascals;
      case "MPa":
        return pressure.Megapascals;
      case "bar":
        return pressure.Bars;
      case "psi":
        return pressure.PoundsForcePerSquareInch;
      default:
        throw new Error(`Unknown pressure unit: ${targetUnit}`);
    }
  }

  private convertEnergy(energy: Energy, targetUnit: string): number {
    switch (targetUnit) {
      case "J":
        return energy.Joules;
      case "kJ":
        return energy.Kilojoules;
      case "MJ":
        return energy.Megajoules;
      case "cal":
        return energy.Calories;
      case "kcal":
        return energy.Kilocalories;
      case "Wh":
        return energy.WattHours;
      case "kWh":
        return energy.KilowattHours;
      case "mJ":
        return energy.Millijoules;
      default:
        throw new Error(`Unknown energy unit: ${targetUnit}`);
    }
  }

  private convertPower(power: Power, targetUnit: string): number {
    switch (targetUnit) {
      case "W":
        return power.Watts;
      case "kW":
        return power.Kilowatts;
      case "MW":
        return power.Megawatts;
      case "hp":
        return power.MechanicalHorsepower;
      default:
        throw new Error(`Unknown power unit: ${targetUnit}`);
    }
  }

  private convertElectricCurrent(current: ElectricCurrent, targetUnit: string): number {
    switch (targetUnit) {
      case "A":
        return current.Amperes;
      case "mA":
        return current.Milliamperes;
      case "uA":
      case "μA":
        return current.Microamperes;
      default:
        throw new Error(`Unknown current unit: ${targetUnit}`);
    }
  }

  private convertElectricPotential(voltage: ElectricPotential, targetUnit: string): number {
    switch (targetUnit) {
      case "V":
        return voltage.Volts;
      case "mV":
        return voltage.Millivolts;
      case "kV":
        return voltage.Kilovolts;
      default:
        throw new Error(`Unknown voltage unit: ${targetUnit}`);
    }
  }

  private convertElectricResistance(resistance: ElectricResistance, targetUnit: string): number {
    switch (targetUnit) {
      case "ohm":
      case "Ω":
        return resistance.Ohms;
      case "kohm":
      case "kΩ":
        return resistance.Kiloohms;
      case "Mohm":
      case "MΩ":
        return resistance.Megaohms;
      default:
        throw new Error(`Unknown resistance unit: ${targetUnit}`);
    }
  }

  private convertRotationalSpeed(rotationalSpeed: RotationalSpeed, targetUnit: string): number {
    switch (targetUnit) {
      case "rpm":
        return rotationalSpeed.RevolutionsPerMinute;
      case "rad/s":
        return rotationalSpeed.RadiansPerSecond;
      case "rev/s":
        return rotationalSpeed.RevolutionsPerSecond;
      default:
        throw new Error(`Unknown rotational speed unit: ${targetUnit}`);
    }
  }

  private convertAcceleration(acceleration: Acceleration, targetUnit: string): number {
    switch (targetUnit) {
      case "m/s^2":
        return acceleration.MetersPerSecondSquared;
      case "ft/s^2":
        return acceleration.FeetPerSecondSquared;
      default:
        throw new Error(`Unknown acceleration unit: ${targetUnit}`);
    }
  }

  /**
   * Add another quantity
   */
  add(other: SmartPadQuantity): SmartPadQuantity {
    if (this.isDimensionless() && other.isDimensionless()) {
      return SmartPadQuantity.dimensionless(this._value + other._value);
    }

    // Strict physics policy: mixing unitless with units only allowed when the unitless value is zero
    if (this.isDimensionless() && !other.isDimensionless()) {
      if (this._value === 0)
        return new SmartPadQuantity(this._value + other._value, other._unit, other._unitsnetValue, other._quantity);
      throw new Error(`Cannot add incompatible units: ${this._unit} and ${other._unit}`);
    } else if (!this.isDimensionless() && other.isDimensionless()) {
      if (other._value === 0)
        return new SmartPadQuantity(this._value + other._value, this._unit, this._unitsnetValue, this._quantity);
      throw new Error(`Cannot add incompatible units: ${this._unit} and ${other._unit}`);
    }

    // Both have units - use unitsnet-js for proper unit conversion and addition
    if (this._unitsnetValue && other._unitsnetValue) {
      // Hard guard: disallow adding different physical types (e.g., m + kg)
      const leftType = this._unitsnetValue.constructor.name;
      const rightType = other._unitsnetValue.constructor.name;
      if (leftType !== rightType) {
        throw new Error(`Cannot add incompatible units: ${this._unit} and ${other._unit}`);
      }
      try {
        const result = this._unitsnetValue.add(other._unitsnetValue);

        // For temperature arithmetic, preserve the unit of the left operand
        if (this._unitsnetValue.constructor.name === "Temperature") {
          const smartPadResult = SmartPadQuantity.fromUnitsNet(result);
          return smartPadResult.convertTo(this._unit);
        }

        return SmartPadQuantity.fromUnitsNet(result);
      } catch (error) {
        throw new Error(`Cannot add incompatible units: ${this._unit} and ${other._unit}`);
      }
    }

    if (this._quantity || other._quantity) {
      const leftQuantity = this.toQuantity();
      const rightQuantity = other.toQuantity();
      if (!leftQuantity || !rightQuantity) {
        throw new Error(`Cannot add incompatible units: ${this._unit} and ${other._unit}`);
      }
      const result = leftQuantity.add(rightQuantity);
      return SmartPadQuantity.fromQuantity(result);
    }

    // Fallback: For units arithmetic with same units
    if (this._unit === other._unit) {
      return new SmartPadQuantity(this._value + other._value, this._unit, this._unitsnetValue);
    }

    throw new Error(`Cannot add incompatible units: ${this._unit} and ${other._unit}`);
  }

  /**
   * Subtract another quantity
   */
  subtract(other: SmartPadQuantity): SmartPadQuantity {
    if (this.isDimensionless() && other.isDimensionless()) {
      return SmartPadQuantity.dimensionless(this._value - other._value);
    }

    // Strict physics policy: mixing unitless with units only allowed when the unitless value is zero
    if (this.isDimensionless() && !other.isDimensionless()) {
      if (this._value === 0)
        return new SmartPadQuantity(this._value - other._value, other._unit, other._unitsnetValue, other._quantity);
      throw new Error(`Cannot subtract incompatible units: ${this._unit} and ${other._unit}`);
    } else if (!this.isDimensionless() && other.isDimensionless()) {
      if (other._value === 0)
        return new SmartPadQuantity(this._value - other._value, this._unit, this._unitsnetValue, this._quantity);
      throw new Error(`Cannot subtract incompatible units: ${this._unit} and ${other._unit}`);
    }

    // Both have units - use unitsnet-js for proper unit conversion and subtraction
    if (this._unitsnetValue && other._unitsnetValue) {
      // Hard guard: disallow subtracting different physical types (e.g., m - kg)
      const leftType = this._unitsnetValue.constructor.name;
      const rightType = other._unitsnetValue.constructor.name;
      if (leftType !== rightType) {
        throw new Error(`Cannot subtract incompatible units: ${this._unit} and ${other._unit}`);
      }
      try {
        const result = this._unitsnetValue.subtract(other._unitsnetValue);

        // Temperature policy for subtraction: return a temperature delta in the left unit
        if (this._unitsnetValue.constructor.name === "Temperature") {
          const tempDeltaKelvin = SmartPadQuantity.fromUnitsNet(result).value; // numeric K difference
          const leftUnit = this._unit;
          if (leftUnit === "K") {
            return new SmartPadQuantity(tempDeltaKelvin, "K");
          }
          if (leftUnit === "C" || leftUnit === "°C") {
            return new SmartPadQuantity(tempDeltaKelvin, "C");
          }
          if (leftUnit === "F" || leftUnit === "°F") {
            const deltaF = tempDeltaKelvin * (9 / 5);
            return new SmartPadQuantity(deltaF, leftUnit);
          }
          // Fallback: keep Kelvin delta
          return new SmartPadQuantity(tempDeltaKelvin, "K");
        }

        return SmartPadQuantity.fromUnitsNet(result);
      } catch (error) {
        throw new Error(`Cannot subtract incompatible units: ${this._unit} and ${other._unit}`);
      }
    }

    if (this._quantity || other._quantity) {
      const leftQuantity = this.toQuantity();
      const rightQuantity = other.toQuantity();
      if (!leftQuantity || !rightQuantity) {
        throw new Error(`Cannot subtract incompatible units: ${this._unit} and ${other._unit}`);
      }
      const result = leftQuantity.subtract(rightQuantity);
      return SmartPadQuantity.fromQuantity(result);
    }

    // Fallback: For units arithmetic with same units
    if (this._unit === other._unit) {
      return new SmartPadQuantity(this._value - other._value, this._unit, this._unitsnetValue);
    }

    throw new Error(`Cannot subtract incompatible units: ${this._unit} and ${other._unit}`);
  }

  /**
   * Multiply by another quantity
   */
  multiply(other: SmartPadQuantity): SmartPadQuantity {
    const resultValue = this._value * other._value;

    if (this.isDimensionless() && other.isDimensionless()) {
      return SmartPadQuantity.dimensionless(resultValue);
    }

    if (this.isDimensionless()) {
      if (other._unitsnetValue) {
        return SmartPadQuantity.fromValueAndUnit(resultValue, other._unit);
      }
      if (other._quantity) {
        return SmartPadQuantity.fromQuantity(new Quantity(resultValue, other._quantity.unit));
      }
      return new SmartPadQuantity(resultValue, other._unit, other._unitsnetValue);
    }

    if (other.isDimensionless()) {
      if (this._unitsnetValue) {
        return SmartPadQuantity.fromValueAndUnit(resultValue, this._unit);
      }
      if (this._quantity) {
        return SmartPadQuantity.fromQuantity(new Quantity(resultValue, this._quantity.unit));
      }
      return new SmartPadQuantity(resultValue, this._unit, this._unitsnetValue);
    }

    // Use unitsnet multiplication where possible
    if (this._unitsnetValue && other._unitsnetValue) {
      try {
        // Use type heuristics for common physics products
        if (this._unitsnetValue instanceof Length && other._unitsnetValue instanceof Length) {
          const area = Area.FromSquareMeters(
            this._unitsnetValue.Meters * other._unitsnetValue.Meters
          );
          return SmartPadQuantity.fromUnitsNet(area);
        }
        // Area * Length => Volume
        if (this._unitsnetValue instanceof Area && other._unitsnetValue instanceof Length) {
          const volume = Volume.FromCubicMeters(
            this._unitsnetValue.SquareMeters * other._unitsnetValue.Meters
          );
          return SmartPadQuantity.fromUnitsNet(volume);
        }
        if (this._unitsnetValue instanceof Length && other._unitsnetValue instanceof Area) {
          const volume = Volume.FromCubicMeters(
            other._unitsnetValue.SquareMeters * this._unitsnetValue.Meters
          );
          return SmartPadQuantity.fromUnitsNet(volume);
        }
        // Mass * Acceleration => Force
        if (this._unitsnetValue instanceof Mass && other._unitsnetValue instanceof Acceleration) {
          const force = Force.FromNewtons(
            this._unitsnetValue.Kilograms * other._unitsnetValue.MetersPerSecondSquared
          );
          return SmartPadQuantity.fromUnitsNet(force);
        }
        if (this._unitsnetValue instanceof Acceleration && other._unitsnetValue instanceof Mass) {
          const force = Force.FromNewtons(
            other._unitsnetValue.Kilograms * this._unitsnetValue.MetersPerSecondSquared
          );
          return SmartPadQuantity.fromUnitsNet(force);
        }
        // Area * Length => Volume
        if (this._unitsnetValue instanceof Force && other._unitsnetValue instanceof Length) {
          const energy = Energy.FromJoules(
            this._unitsnetValue.Newtons * other._unitsnetValue.Meters
          );
          return SmartPadQuantity.fromUnitsNet(energy);
        }
        if (this._unitsnetValue instanceof Length && other._unitsnetValue instanceof Force) {
          const energy = Energy.FromJoules(
            other._unitsnetValue.Newtons * this._unitsnetValue.Meters
          );
          return SmartPadQuantity.fromUnitsNet(energy);
        }
        // Power * Duration => Energy
        if (this._unitsnetValue instanceof Power && other._unitsnetValue instanceof Duration) {
          const joules = this._unitsnetValue.Watts * other._unitsnetValue.Seconds;
          const energy = Energy.FromJoules(joules);
          return SmartPadQuantity.fromUnitsNet(energy);
        }
        if (this._unitsnetValue instanceof Duration && other._unitsnetValue instanceof Power) {
          const joules = this._unitsnetValue.Seconds * other._unitsnetValue.Watts;
          const energy = Energy.FromJoules(joules);
          return SmartPadQuantity.fromUnitsNet(energy);
        }
        // ElectricPotential * ElectricCurrent => Power (W)
        if (
          this._unitsnetValue instanceof ElectricPotential &&
          other._unitsnetValue instanceof ElectricCurrent
        ) {
          const power = Power.FromWatts(this._unitsnetValue.Volts * other._unitsnetValue.Amperes);
          return SmartPadQuantity.fromUnitsNet(power);
        }
        if (
          this._unitsnetValue instanceof ElectricCurrent &&
          other._unitsnetValue instanceof ElectricPotential
        ) {
          const power = Power.FromWatts(this._unitsnetValue.Amperes * other._unitsnetValue.Volts);
          return SmartPadQuantity.fromUnitsNet(power);
        }
        // Area * Speed => Volume flow (m^3/s)
        if (this._unitsnetValue instanceof Area && other._unitsnetValue instanceof Speed) {
          const value = this._unitsnetValue.SquareMeters * other._unitsnetValue.MetersPerSecond;
          return new SmartPadQuantity(value, "m^3/s");
        }
        if (this._unitsnetValue instanceof Speed && other._unitsnetValue instanceof Area) {
          const value = this._unitsnetValue.MetersPerSecond * other._unitsnetValue.SquareMeters;
          return new SmartPadQuantity(value, "m^3/s");
        }
      } catch {}
    }

    if (this._quantity || other._quantity) {
      const leftQuantity = this.toQuantity();
      const rightQuantity = other.toQuantity();
      if (!leftQuantity || !rightQuantity) {
        throw new Error(`Cannot multiply incompatible units: ${this._unit} and ${other._unit}`);
      }
      const result = leftQuantity.multiply(rightQuantity);
      return SmartPadQuantity.fromQuantity(result);
    }

    // Mass * speed^2 => Energy (J)
    if (this._unitsnetValue instanceof Mass && other._unit === "m^2/s^2") {
      const joules = this._unitsnetValue.Kilograms * other._value;
      return SmartPadQuantity.fromUnitsNet(Energy.FromJoules(joules));
    }
    if (other._unitsnetValue instanceof Mass && this._unit === "m^2/s^2") {
      const joules = other._unitsnetValue.Kilograms * this._value;
      return SmartPadQuantity.fromUnitsNet(Energy.FromJoules(joules));
    }

    // If same basic unit, compress to power form (e.g., m*m => m^2)
    if (this._unit && this._unit === other._unit) {
      return SmartPadQuantity.fromValueAndUnit(resultValue, `${this._unit}^2`);
    }

    // Symbolic fallback with normalized ordering for readability
    const left = this._unit;
    const right = other._unit;
    const containsDivision = left.includes("/") || right.includes("/");
    const unitStr = containsDivision ? `${right}*${left}` : `${left}*${right}`;
    return SmartPadQuantity.fromValueAndUnit(resultValue, unitStr);
  }

  /**
   * Divide by another quantity
   */
  divide(other: SmartPadQuantity): SmartPadQuantity {
    if (other._value === 0) {
      throw new Error("Division by zero");
    }
    const resultValue = this._value / other._value;

    if (this.isDimensionless() && other.isDimensionless()) {
      return SmartPadQuantity.dimensionless(resultValue);
    }

    if (this.isDimensionless()) {
      return SmartPadQuantity.dimensionless(resultValue);
    }

    if (other.isDimensionless()) {
      if (this._unitsnetValue) {
        return SmartPadQuantity.fromValueAndUnit(resultValue, this._unit);
      }
      if (this._quantity) {
        return SmartPadQuantity.fromQuantity(new Quantity(resultValue, this._quantity.unit));
      }
      return new SmartPadQuantity(resultValue, this._unit, this._unitsnetValue);
    }

    // Unitsnet-aware derivations
    if (this._unitsnetValue && other._unitsnetValue) {
      try {
        // Length / Time = Speed
        if (this._unitsnetValue instanceof Length && other._unitsnetValue instanceof Duration) {
          return SmartPadQuantity.deriveSpeed(this, other);
        }
        // Length / Speed = Duration
        if (this._unitsnetValue instanceof Length && other._unitsnetValue instanceof Speed) {
          const seconds = this._unitsnetValue.Meters / other._unitsnetValue.MetersPerSecond;
          return SmartPadQuantity.fromUnitsNet(Duration.FromSeconds(seconds));
        }
        // Speed / Time = Acceleration
        if (this._unitsnetValue instanceof Speed && other._unitsnetValue instanceof Duration) {
          const accel = Acceleration.FromMetersPerSecondSquared(
            this._unitsnetValue.MetersPerSecond / other._unitsnetValue.Seconds
          );
          return SmartPadQuantity.fromUnitsNet(accel);
        }
        // Energy / Length = Force
        if (this._unitsnetValue instanceof Energy && other._unitsnetValue instanceof Length) {
          const force = Force.FromNewtons(this._unitsnetValue.Joules / other._unitsnetValue.Meters);
          return SmartPadQuantity.fromUnitsNet(force);
        }
        // Energy / Time = Power
        if (this._unitsnetValue instanceof Energy && other._unitsnetValue instanceof Duration) {
          const watts = this._unitsnetValue.Joules / other._unitsnetValue.Seconds;
          return SmartPadQuantity.fromUnitsNet(Power.FromWatts(watts));
        }
        // ElectricPotential / ElectricCurrent = Resistance (ohm)
        if (
          this._unitsnetValue instanceof ElectricPotential &&
          other._unitsnetValue instanceof ElectricCurrent
        ) {
          const value = this._unitsnetValue.Volts / other._unitsnetValue.Amperes;
          return new SmartPadQuantity(value, "ohm");
        }
        // Force / Area = Pressure
        if (this._unitsnetValue instanceof Force && other._unitsnetValue instanceof Area) {
          const pressure = Pressure.FromPascals(
            this._unitsnetValue.Newtons / other._unitsnetValue.SquareMeters
          );
          return SmartPadQuantity.fromUnitsNet(pressure);
        }
      } catch {}
    }

    if (this._quantity || other._quantity) {
      const leftQuantity = this.toQuantity();
      const rightQuantity = other.toQuantity();
      if (!leftQuantity || !rightQuantity) {
        throw new Error(`Cannot divide incompatible units: ${this._unit} and ${other._unit}`);
      }
      const result = leftQuantity.divide(rightQuantity);
      return SmartPadQuantity.fromQuantity(result);
    }

    // Symbolic fallback
    return SmartPadQuantity.fromValueAndUnit(resultValue, `${this._unit}/${other._unit}`);
  }

  /**
   * Raise to a power
   */
  power(exponent: number): SmartPadQuantity {
    const resultValue = Math.pow(this._value, exponent);

    if (this.isDimensionless()) {
      return SmartPadQuantity.dimensionless(resultValue);
    }

    if (exponent === 2) {
      // If this is a Length, return an Area with proper unitsnet backing
      try {
        if (this._unitsnetValue instanceof Length) {
          const area = Area.FromSquareMeters(Math.pow(this._unitsnetValue.Meters, 2));
          return SmartPadQuantity.fromUnitsNet(area);
        }
      } catch {}
    }

    if (this._quantity) {
      const result = this._quantity.power(exponent);
      return SmartPadQuantity.fromQuantity(result);
    }

    // Handle square root specially
    if (exponent === 0.5) {
      if (this._unit === "m^2") {
        return new SmartPadQuantity(resultValue, "m");
      }
      return new SmartPadQuantity(resultValue, this._unit + "^0.5");
    }

    // Handle integer powers
    if (exponent === 2) {
      const applyExponent = (part: string, power: number): string => {
        const match = part.match(/^(.+?)\^(\d+)$/);
        if (match) {
          const base = match[1];
          const current = parseInt(match[2], 10);
          return `${base}^${current * power}`;
        }
        return `${part}^${power}`;
      };

      if (this._unit.includes("/")) {
        const [numerator, denominator] = this._unit.split("/");
        const poweredNumerator = applyExponent(numerator, exponent);
        const poweredDenominator = applyExponent(denominator, exponent);
        return SmartPadQuantity.fromValueAndUnit(
          resultValue,
          `${poweredNumerator}/${poweredDenominator}`
        );
      }

      return SmartPadQuantity.fromValueAndUnit(resultValue, applyExponent(this._unit, exponent));
    }

    // General case
    const resultUnit = exponent === 1 ? this._unit : this._unit + "^" + exponent;
    return SmartPadQuantity.fromValueAndUnit(resultValue, resultUnit);
  }

  /**
   * Check if this is dimensionless
   */
  isDimensionless(): boolean {
    if (this._quantity) {
      return this._quantity.isDimensionless();
    }
    return this._unit === "" || this._unit === "1";
  }

  /**
   * Get the best display unit (with smart thresholds)
   */
  getBestDisplayUnit(): SmartPadQuantity {
    if (!this._unitsnetValue) {
      return this;
    }

    try {
      // Apply smart thresholds for unit selection
      const value = this._value;
      const unit = this._unit;

      // Length units - smart thresholds
      if (unit === "m") {
        if (value < 0.01) return this.convertTo("mm");
        if (value >= 1000) return this.convertTo("km");
      }

      // Mass units
      if (unit === "kg") {
        if (value < 0.001) return this.convertTo("g");
        if (value >= 1000) return this.convertTo("t");
      }

      // Electric current units
      if (unit === "A") {
        if (value <= 0.000001) return this.convertTo("uA");
        if (value < 0.001) return this.convertTo("mA");
      }

      // Power units
      if (unit === "W") {
        if (value >= 1000000) return this.convertTo("MW");
        if (value >= 1000) return this.convertTo("kW");
      }

      // Time units
      if (unit === "s") {
        if (value >= 3600) return this.convertTo("h");
        if (value >= 60) return this.convertTo("min");
      }

      return this;
    } catch (error) {
      // If conversion fails, return original
      return this;
    }
  }

  /**
   * Convert to string representation
   */
  toString(
    precision = 6,
    options?: {
      scientificUpperThreshold?: number;
      scientificLowerThreshold?: number;
      preferBaseUnit?: boolean;
    }
  ): string {
    const baseQuantity = options?.preferBaseUnit ? this.toBaseUnit() : this;
    const displayQuantity = baseQuantity.getBestDisplayUnit();
    const value = displayQuantity._value;
    const unit = displayQuantity._unit;

    // Format number, removing unnecessary trailing zeros
    const formattedValue = this.formatNumber(value, precision, options);

    if (unit === "") {
      return formattedValue;
    }

    return `${formattedValue} ${unit}`;
  }

  /**
   * Convert to base SI units for the current dimension
   */
  toBaseUnit(): SmartPadQuantity {
    const quantity = this.toQuantity();
    if (!quantity || quantity.isDimensionless()) {
      return this;
    }
    const baseUnit = formatDimension(quantity.unit.getDimension());
    if (!baseUnit || baseUnit === "1" || baseUnit === this._unit) {
      return this;
    }
    try {
      return this.convertTo(baseUnit);
    } catch {
      return this;
    }
  }

  /**
   * Format a number, removing trailing zeros
   */
  private formatNumber(
    value: number,
    precision: number,
    options?: { scientificUpperThreshold?: number; scientificLowerThreshold?: number }
  ): string {
    if (!isFinite(value)) return "Infinity";
    if (value === 0) return "0";
    const abs = Math.abs(value);
    // Scientific notation for very large/small values to align with plain math formatting
    const upperThreshold = options?.scientificUpperThreshold ?? 1e12;
    const lowerThreshold = options?.scientificLowerThreshold ?? 1e-4;
    if (
      abs >= upperThreshold ||
      (abs > 0 && lowerThreshold > 0 && abs < lowerThreshold)
    ) {
      const s = value.toExponential(3);
      const [mantissa, exp] = s.split("e");
      const parts = mantissa.split(".");
      const intPart = parts[0];
      const fracPart = (parts[1] || "").padEnd(3, "0");
      return `${intPart}.${fracPart}e${exp}`;
    }
    if (Number.isInteger(value)) return value.toString();
    const fixed = value.toFixed(precision);
    const fixedNumber = parseFloat(fixed);
    if (fixedNumber === 0) {
      return value.toString();
    }
    return fixedNumber.toString();
  }

  /**
   * Check equality with tolerance
   */
  equals(other: SmartPadQuantity, tolerance = 1e-10): boolean {
    if (this._quantity || other._quantity) {
      const left = this.toQuantity();
      const right = other.toQuantity();
      if (!left || !right) return false;
      return left.equals(right, tolerance);
    }

    // Check units match
    if (this._unit !== other._unit) {
      return false;
    }
    // Check values are close
    return Math.abs(this._value - other._value) <= tolerance;
  }
}

/**
 * Unit parser that uses unitsnet-js for unit recognition
 */
export class UnitsNetParser {
  private static unitMappings: Record<string, (value: number) => UnitsNetValue> = {
    // Length units
    m: (v) => Length.FromMeters(v),
    meter: (v) => Length.FromMeters(v),
    meters: (v) => Length.FromMeters(v),
    mm: (v) => Length.FromMillimeters(v),
    cm: (v) => Length.FromCentimeters(v),
    km: (v) => Length.FromKilometers(v),
    in: (v) => Length.FromInches(v),
    inch: (v) => Length.FromInches(v),
    inches: (v) => Length.FromInches(v),
    ft: (v) => Length.FromFeet(v),
    foot: (v) => Length.FromFeet(v),
    feet: (v) => Length.FromFeet(v),
    mi: (v) => Length.FromMiles(v),
    mile: (v) => Length.FromMiles(v),
    miles: (v) => Length.FromMiles(v),

    // Mass units
    kg: (v) => Mass.FromKilograms(v),
    kilogram: (v) => Mass.FromKilograms(v),
    kilograms: (v) => Mass.FromKilograms(v),
    g: (v) => Mass.FromGrams(v),
    gram: (v) => Mass.FromGrams(v),
    grams: (v) => Mass.FromGrams(v),
    lb: (v) => Mass.FromPounds(v),
    pound: (v) => Mass.FromPounds(v),
    pounds: (v) => Mass.FromPounds(v),
    // Treat lbs as mass for user-friendliness in mixed arithmetic tests; keep lbf for force
    lbs: (v) => Mass.FromPounds(v),

    // Time units
    s: (v) => Duration.FromSeconds(v),
    second: (v) => Duration.FromSeconds(v),
    seconds: (v) => Duration.FromSeconds(v),
    min: (v) => Duration.FromMinutes(v),
    minute: (v) => Duration.FromMinutes(v),
    minutes: (v) => Duration.FromMinutes(v),
    h: (v) => Duration.FromHours(v),
    hour: (v) => Duration.FromHours(v),
    hours: (v) => Duration.FromHours(v),
    day: (v) => Duration.FromDays(v),
    days: (v) => Duration.FromDays(v),

    // Temperature units
    K: (v) => Temperature.FromKelvins(v),
    kelvin: (v) => Temperature.FromKelvins(v),
    kelvins: (v) => Temperature.FromKelvins(v),
    C: (v) => Temperature.FromDegreesCelsius(v),
    "°C": (v) => Temperature.FromDegreesCelsius(v),
    celsius: (v) => Temperature.FromDegreesCelsius(v),
    F: (v) => Temperature.FromDegreesFahrenheit(v),
    "°F": (v) => Temperature.FromDegreesFahrenheit(v),
    fahrenheit: (v) => Temperature.FromDegreesFahrenheit(v),

    // Area units
    "m^2": (v) => Area.FromSquareMeters(v),
    sqm: (v) => Area.FromSquareMeters(v),
    "ft^2": (v) => Area.FromSquareFeet(v),
    sqft: (v) => Area.FromSquareFeet(v),

    // Volume units
    "m^3": (v) => Volume.FromCubicMeters(v),
    "ft^3": (v) => Volume.FromCubicFeet(v),

    // Speed units
    "m/s": (v) => Speed.FromMetersPerSecond(v),
    "km/h": (v) => Speed.FromKilometersPerHour(v),
    kph: (v) => Speed.FromKilometersPerHour(v),
    mph: (v) => Speed.FromMilesPerHour(v),
    "ft/s": (v) => Speed.FromFeetPerSecond(v),

    // Acceleration units
    "m/s^2": (v) => Acceleration.FromMetersPerSecondSquared(v),
    "ft/s^2": (v) => Acceleration.FromFeetPerSecondSquared(v),

    // Force units
    N: (v) => Force.FromNewtons(v),
    newton: (v) => Force.FromNewtons(v),
    newtons: (v) => Force.FromNewtons(v),
    lbf: (v) => Force.FromPoundsForce(v),

    // Pressure units
    Pa: (v) => Pressure.FromPascals(v),
    pascal: (v) => Pressure.FromPascals(v),
    pascals: (v) => Pressure.FromPascals(v),
    kPa: (v) => Pressure.FromKilopascals(v),
    MPa: (v) => Pressure.FromMegapascals(v),
    bar: (v) => Pressure.FromBars(v),
    psi: (v) => Pressure.FromPoundsForcePerSquareInch(v),

    // Energy units
    J: (v) => Energy.FromJoules(v),
    joule: (v) => Energy.FromJoules(v),
    joules: (v) => Energy.FromJoules(v),
    mJ: (v) => Energy.FromMillijoules(v),
    kJ: (v) => Energy.FromKilojoules(v),
    MJ: (v) => Energy.FromMegajoules(v),
    cal: (v) => Energy.FromCalories(v),
    kcal: (v) => Energy.FromKilocalories(v),
    Wh: (v) => Energy.FromWattHours(v),
    kWh: (v) => Energy.FromKilowattHours(v),

    // Power units
    W: (v) => Power.FromWatts(v),
    watt: (v) => Power.FromWatts(v),
    watts: (v) => Power.FromWatts(v),
    kW: (v) => Power.FromKilowatts(v),
    MW: (v) => Power.FromMegawatts(v),
    hp: (v) => Power.FromMechanicalHorsepower(v),

    // Electric units
    A: (v) => ElectricCurrent.FromAmperes(v),
    ampere: (v) => ElectricCurrent.FromAmperes(v),
    amperes: (v) => ElectricCurrent.FromAmperes(v),
    mA: (v) => ElectricCurrent.FromMilliamperes(v),
    uA: (v) => ElectricCurrent.FromMicroamperes(v),
    μA: (v) => ElectricCurrent.FromMicroamperes(v),
    V: (v) => ElectricPotential.FromVolts(v),
    volt: (v) => ElectricPotential.FromVolts(v),
    volts: (v) => ElectricPotential.FromVolts(v),
    mV: (v) => ElectricPotential.FromMillivolts(v),
    kV: (v) => ElectricPotential.FromKilovolts(v),
    ohm: (v) => ElectricResistance.FromOhms(v),
    Ω: (v) => ElectricResistance.FromOhms(v),
    kohm: (v) => ElectricResistance.FromKiloohms(v),
    kΩ: (v) => ElectricResistance.FromKiloohms(v),
    Mohm: (v) => ElectricResistance.FromMegaohms(v),
    MΩ: (v) => ElectricResistance.FromMegaohms(v),

    // Frequency units
    Hz: (v) => Frequency.FromHertz(v),
    hertz: (v) => Frequency.FromHertz(v),
    kHz: (v) => Frequency.FromKilohertz(v),
    MHz: (v) => Frequency.FromMegahertz(v),

    // Angle units
    rad: (v) => Angle.FromRadians(v),
    radian: (v) => Angle.FromRadians(v),
    radians: (v) => Angle.FromRadians(v),
    deg: (v) => Angle.FromDegrees(v),
    degree: (v) => Angle.FromDegrees(v),
    degrees: (v) => Angle.FromDegrees(v),

    // Information units
    B: (v) => Information.FromBytes(v),
    byte: (v) => Information.FromBytes(v),
    bytes: (v) => Information.FromBytes(v),
    KB: (v) => Information.FromKilobytes(v),
    MB: (v) => Information.FromMegabytes(v),
    GB: (v) => Information.FromGigabytes(v),

    // Rotational speed units
    rpm: (v) => RotationalSpeed.FromRevolutionsPerMinute(v),
    "rad/s": (v) => RotationalSpeed.FromRadiansPerSecond(v),
    "rev/s": (v) => RotationalSpeed.FromRevolutionsPerSecond(v),
  };

  /**
   * Parse a unit string and return a unitsnet-js value
   */
  static parse(value: number, unitString: string): UnitsNetValue | null {
    const normalizedUnit = this.normalizeUnitString(unitString);

    if (normalizedUnit === "" || normalizedUnit === "1") {
      return null; // Dimensionless
    }

    const unitFactory = this.unitMappings[normalizedUnit];
    if (!unitFactory) {
      throw new Error(`Unknown unit: ${unitString}`);
    }

    return unitFactory(value);
  }

  /**
   * Normalize unit string for parsing
   */
  private static normalizeUnitString(unitString: string): string {
    return normalizeUnitString(unitString); // Preserve case for units like 'C' vs 'c'
  }

  private static isKnownUnitString(unitString: string): boolean {
    const normalized = this.normalizeUnitString(unitString);
    if (normalized === "" || normalized === "1") return false;
    if (this.unitMappings[normalized]) return true;
    try {
      UnitParser.parse(normalized);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a string contains units
   */
  static containsUnits(expression: string): boolean {
    const unitPattern =
      /(?:^|[^\w.])\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\s*([a-zA-Z°µμΩ][a-zA-Z0-9°µμΩ\/\^\-\*\·]*)/g;
    let match: RegExpExecArray | null;

    while ((match = unitPattern.exec(expression))) {
      const unitStr = match[1];
      if (this.isKnownUnitString(unitStr)) {
        return true;
      }
    }

    return false;
  }
}

/**
 * Mathematical function evaluator using unitsnet-js
 */
export class UnitsNetMathEvaluator {
  /**
   * Evaluate mathematical functions
   */
  static evaluateFunction(name: string, args: SmartPadQuantity[]): SmartPadQuantity {
    const funcName = name.toLowerCase();

    switch (funcName) {
      case "sqrt":
        if (args.length !== 1) throw new Error("sqrt requires exactly 1 argument");
        return args[0].power(0.5);

      case "pow":
        if (args.length !== 2) throw new Error("pow requires exactly 2 arguments");
        if (!args[1].isDimensionless()) {
          throw new Error("Power must be dimensionless");
        }
        return args[0].power(args[1].value);

      case "abs":
        if (args.length !== 1) throw new Error("abs requires exactly 1 argument");
        const absValue = Math.abs(args[0].value);
        return args[0].isDimensionless()
          ? SmartPadQuantity.dimensionless(absValue)
          : SmartPadQuantity.fromValueAndUnit(absValue, args[0].unit);

      case "round":
        if (args.length !== 1) throw new Error("round requires exactly 1 argument");
        const roundedValue = Math.round(args[0].value);
        return args[0].isDimensionless()
          ? SmartPadQuantity.dimensionless(roundedValue)
          : SmartPadQuantity.fromValueAndUnit(roundedValue, args[0].unit);

      case "floor":
        if (args.length !== 1) throw new Error("floor requires exactly 1 argument");
        const flooredValue = Math.floor(args[0].value);
        return args[0].isDimensionless()
          ? SmartPadQuantity.dimensionless(flooredValue)
          : SmartPadQuantity.fromValueAndUnit(flooredValue, args[0].unit);

      case "ceil":
        if (args.length !== 1) throw new Error("ceil requires exactly 1 argument");
        const ceiledValue = Math.ceil(args[0].value);
        return args[0].isDimensionless()
          ? SmartPadQuantity.dimensionless(ceiledValue)
          : SmartPadQuantity.fromValueAndUnit(ceiledValue, args[0].unit);

      case "max": {
        if (args.length < 1) throw new Error("max requires at least 1 argument");
        const baseUnit = args[0].unit;
        const compatible = args.every((arg) => arg.unit === baseUnit);
        if (!compatible) {
          throw new Error("max requires compatible units");
        }
        const maxArg = args.reduce((prev, curr) => (curr.value > prev.value ? curr : prev));
        return baseUnit === ""
          ? SmartPadQuantity.dimensionless(maxArg.value)
          : SmartPadQuantity.fromValueAndUnit(maxArg.value, baseUnit);
      }

      case "min": {
        if (args.length < 1) throw new Error("min requires at least 1 argument");
        const baseUnit = args[0].unit;
        const compatible = args.every((arg) => arg.unit === baseUnit);
        if (!compatible) {
          throw new Error("min requires compatible units");
        }
        const minArg = args.reduce((prev, curr) => (curr.value < prev.value ? curr : prev));
        return baseUnit === ""
          ? SmartPadQuantity.dimensionless(minArg.value)
          : SmartPadQuantity.fromValueAndUnit(minArg.value, baseUnit);
      }

      case "sin":
      case "cos":
      case "tan":
        if (args.length !== 1) throw new Error(`${funcName} requires exactly 1 argument`);
        if (!args[0].isDimensionless()) {
          throw new Error(`${funcName} requires dimensionless argument`);
        }
        const result = Math[funcName](args[0].value);
        return SmartPadQuantity.dimensionless(result);

      case "asin":
      case "acos":
      case "atan":
        if (args.length !== 1) throw new Error(`${funcName} requires exactly 1 argument`);
        if (!args[0].isDimensionless()) {
          throw new Error(`${funcName} requires dimensionless argument`);
        }
        const trigResult = Math[funcName](args[0].value);
        return SmartPadQuantity.dimensionless(trigResult);

      case "log":
      case "ln":
        if (args.length !== 1) throw new Error(`${funcName} requires exactly 1 argument`);
        if (!args[0].isDimensionless()) {
          throw new Error(`${funcName} requires dimensionless argument`);
        }
        const logResult = funcName === "log" ? Math.log10(args[0].value) : Math.log(args[0].value);
        return SmartPadQuantity.dimensionless(logResult);

      case "exp":
        if (args.length !== 1) throw new Error("exp requires exactly 1 argument");
        if (!args[0].isDimensionless()) {
          throw new Error("exp requires dimensionless argument");
        }
        const expResult = Math.exp(args[0].value);
        return SmartPadQuantity.dimensionless(expResult);

      default:
        throw new Error(`Unknown function: ${name}`);
    }
  }
}
