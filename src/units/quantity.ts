/**
 * Quantity - Values with Units for SmartPad
 *
 * This module provides the Quantity class which represents a numeric value
 * combined with a unit, supporting dimensional analysis and unit conversions.
 */

import {
  Dimension,
  UnitDefinition,
  dimensionsEqual,
  multiplyDimensions,
  divideDimensions,
  powerDimension,
  formatDimension,
  defaultUnitRegistry,
  createDimension,
} from "./definitions";

/**
 * A component of a composite unit (e.g., "m" with power 2 for "m^2")
 */
export interface UnitComponent {
  readonly unit: UnitDefinition;
  readonly power: number;
}

/**
 * A composite unit that can represent complex units like "kg*m/s^2"
 */
export class CompositeUnit {
  constructor(public readonly components: UnitComponent[]) {}

  /**
   * Create a simple unit from a single unit definition
   */
  static fromUnit(unit: UnitDefinition, power = 1): CompositeUnit {
    return new CompositeUnit([{ unit, power }]);
  }

  /**
   * Create a dimensionless unit
   */
  static dimensionless(): CompositeUnit {
    return new CompositeUnit([]);
  }

  /**
   * Get the overall dimension of this composite unit
   */
  getDimension(): Dimension {
    return this.components.reduce(
      (dimension, component) => {
        const componentDimension = powerDimension(component.unit.dimension, component.power);
        return multiplyDimensions(dimension, componentDimension);
      },
      { length: 0, mass: 0, time: 0, current: 0, temperature: 0, amount: 0, luminosity: 0 }
    );
  }

  /**
   * Check if this unit is compatible (same dimension) with another
   */
  isCompatibleWith(other: CompositeUnit): boolean {
    return dimensionsEqual(this.getDimension(), other.getDimension());
  }

  /**
   * Check if this is a dimensionless unit
   */
  isDimensionless(): boolean {
    const dimension = this.getDimension();
    return dimensionsEqual(dimension, {
      length: 0,
      mass: 0,
      time: 0,
      current: 0,
      temperature: 0,
      amount: 0,
      luminosity: 0,
    });
  }

  /**
   * Multiply this unit with another unit
   */
  multiply(other: CompositeUnit): CompositeUnit {
    const newComponents = [...this.components, ...other.components];
    return new CompositeUnit(newComponents).simplify();
  }

  /**
   * Divide this unit by another unit
   */
  divide(other: CompositeUnit): CompositeUnit {
    const invertedComponents = other.components.map((component) => ({
      unit: component.unit,
      power: -component.power,
    }));
    const newComponents = [...this.components, ...invertedComponents];
    return new CompositeUnit(newComponents).simplify();
  }

  /**
   * Raise this unit to a power
   */
  power(exponent: number): CompositeUnit {
    const newComponents = this.components.map((component) => ({
      unit: component.unit,
      power: component.power * exponent,
    }));
    return new CompositeUnit(newComponents).simplify();
  }

  /**
   * Simplify the unit by combining components with the same unit
   */
  simplify(): CompositeUnit {
    const unitMap = new Map<string, number>();

    // Combine powers for the same unit
    for (const component of this.components) {
      const symbol = component.unit.symbol;
      const currentPower = unitMap.get(symbol) || 0;
      unitMap.set(symbol, currentPower + component.power);
    }

    // Filter out units with zero power
    const newComponents: UnitComponent[] = [];
    unitMap.forEach((power, symbol) => {
      if (power !== 0) {
        const unit = defaultUnitRegistry.get(symbol);
        if (unit) {
          newComponents.push({ unit, power });
        }
      }
    });

    return new CompositeUnit(newComponents);
  }

  /**
   * Get the conversion factor to convert to base SI units
   */
  getBaseConversionFactor(): number {
    return this.components.reduce((factor, component) => {
      return factor * Math.pow(component.unit.baseMultiplier, component.power);
    }, 1);
  }

  /**
   * Format the unit for display (e.g., "kg*m/s^2")
   */
  toString(): string {
    if (this.components.length === 0) {
      return "1"; // dimensionless
    }

    // Try to find a derived unit that matches this dimension
    const derivedUnit = this.findDerivedUnit();
    if (derivedUnit) {
      return derivedUnit;
    }

    const positiveComponents: string[] = [];
    const negativeComponents: string[] = [];

    for (const component of this.components) {
      const unitStr =
        Math.abs(component.power) === 1
          ? component.unit.symbol
          : `${component.unit.symbol}^${Math.abs(component.power)}`;

      if (component.power > 0) {
        positiveComponents.push(unitStr);
      } else {
        negativeComponents.push(unitStr);
      }
    }

    if (negativeComponents.length === 0) {
      return positiveComponents.join("*");
    }

    if (positiveComponents.length === 0) {
      return `1/${negativeComponents.join("*")}`;
    }

    // Group negative components with parentheses when there are multiple
    const denominatorStr =
      negativeComponents.length > 1
        ? `(${negativeComponents.join("*")})`
        : negativeComponents.join("*");

    return `${positiveComponents.join("*")}/${denominatorStr}`;
  }

  /**
   * Try to find a derived SI unit that matches this composite unit's dimension
   */
  private findDerivedUnit(): string | null {
    const dimension = this.getDimension();

    // Check common derived units
    const derivedUnits = [
      { symbol: "N", dimension: createDimension(1, 1, -2) }, // Force: kg*m/s^2
      { symbol: "Pa", dimension: createDimension(-1, 1, -2) }, // Pressure: kg/(m*s^2)
      { symbol: "J", dimension: createDimension(2, 1, -2) }, // Energy: kg*m^2/s^2
      { symbol: "W", dimension: createDimension(2, 1, -3) }, // Power: kg*m^2/s^3
    ];

    for (const unit of derivedUnits) {
      if (dimensionsEqual(dimension, unit.dimension)) {
        return unit.symbol;
      }
    }

    return null;
  }
}

/**
 * A physical quantity with a numeric value and unit
 */
export class Quantity {
  constructor(
    public readonly value: number,
    public readonly unit: CompositeUnit
  ) {}

  /**
   * Create a quantity from a value and unit symbol
   */
  static fromUnit(value: number, unitSymbol: string): Quantity {
    const unitDef = defaultUnitRegistry.get(unitSymbol);
    if (!unitDef) {
      throw new Error(`Unknown unit: ${unitSymbol}`);
    }
    return new Quantity(value, CompositeUnit.fromUnit(unitDef));
  }

  /**
   * Create a dimensionless quantity
   */
  static dimensionless(value: number): Quantity {
    return new Quantity(value, CompositeUnit.dimensionless());
  }

  /**
   * Check if this quantity is dimensionless
   */
  isDimensionless(): boolean {
    return this.unit.isDimensionless();
  }

  /**
   * Add two quantities (must have compatible units)
   */
  add(other: Quantity): Quantity {
    if (!this.unit.isCompatibleWith(other.unit)) {
      const thisDim = formatDimension(this.unit.getDimension());
      const otherDim = formatDimension(other.unit.getDimension());
      throw new Error(`Cannot add ${thisDim} and ${otherDim}: incompatible dimensions`);
    }

    // Convert other quantity to this unit's system
    const otherConverted = other.convertToUnit(this.unit);
    return new Quantity(this.value + otherConverted.value, this.unit);
  }

  /**
   * Subtract two quantities (must have compatible units)
   */
  subtract(other: Quantity): Quantity {
    if (!this.unit.isCompatibleWith(other.unit)) {
      const thisDim = formatDimension(this.unit.getDimension());
      const otherDim = formatDimension(other.unit.getDimension());
      throw new Error(`Cannot subtract ${thisDim} and ${otherDim}: incompatible dimensions`);
    }

    // Convert other quantity to this unit's system
    const otherConverted = other.convertToUnit(this.unit);
    return new Quantity(this.value - otherConverted.value, this.unit);
  }

  /**
   * Multiply two quantities
   */
  multiply(other: Quantity): Quantity {
    const newValue = this.value * other.value;
    const newUnit = this.unit.multiply(other.unit);
    return new Quantity(newValue, newUnit);
  }

  /**
   * Divide two quantities
   */
  divide(other: Quantity): Quantity {
    if (other.value === 0) {
      throw new Error("Division by zero");
    }

    const newValue = this.value / other.value;
    const newUnit = this.unit.divide(other.unit);
    return new Quantity(newValue, newUnit);
  }

  /**
   * Raise quantity to a power
   */
  power(exponent: number): Quantity {
    const newValue = Math.pow(this.value, exponent);
    const newUnit = this.unit.power(exponent);
    return new Quantity(newValue, newUnit);
  }

  /**
   * Convert to a different compatible unit
   */
  convertTo(targetUnitSymbol: string): Quantity {
    const targetUnit = defaultUnitRegistry.get(targetUnitSymbol);
    if (!targetUnit) {
      throw new Error(`Unknown unit: ${targetUnitSymbol}`);
    }

    const targetCompositeUnit = CompositeUnit.fromUnit(targetUnit);
    return this.convertToUnit(targetCompositeUnit);
  }

  /**
   * Convert to a different compatible composite unit
   */
  convertToUnit(targetUnit: CompositeUnit): Quantity {
    if (!this.unit.isCompatibleWith(targetUnit)) {
      const thisDim = formatDimension(this.unit.getDimension());
      const targetDim = formatDimension(targetUnit.getDimension());
      throw new Error(`Cannot convert ${thisDim} to ${targetDim}: incompatible dimensions`);
    }

    // Convert to base units, then to target units
    const thisBaseFactor = this.unit.getBaseConversionFactor();
    const targetBaseFactor = targetUnit.getBaseConversionFactor();

    const baseValue = this.value * thisBaseFactor;
    const targetValue = baseValue / targetBaseFactor;

    return new Quantity(targetValue, targetUnit);
  }

  /**
   * Get the best unit for display (prefer simpler, more common units)
   */
  getBestDisplayUnit(): Quantity {
    // For now, just return the quantity as-is
    // Future enhancement: implement smart unit selection
    return this;
  }

  /**
   * Format the quantity for display
   */
  toString(precision = 6): string {
    // Format the value
    const formattedValue = parseFloat(this.value.toPrecision(precision));

    // Format the unit
    const unitStr = this.unit.toString();

    if (unitStr === "1") {
      return formattedValue.toString();
    }

    return `${formattedValue} ${unitStr}`;
  }

  /**
   * Check if two quantities are equal (same value and compatible units)
   */
  equals(other: Quantity, tolerance = 1e-10): boolean {
    if (!this.unit.isCompatibleWith(other.unit)) {
      return false;
    }

    const otherConverted = other.convertToUnit(this.unit);
    return Math.abs(this.value - otherConverted.value) < tolerance;
  }
}

/**
 * Parser for unit expressions like "m/s^2" or "kg*m/s^2"
 */
export class UnitParser {
  /**
   * Parse a unit string into a CompositeUnit
   */
  static parse(unitString: string): CompositeUnit {
    // Handle dimensionless case
    if (!unitString || unitString === "1") {
      return CompositeUnit.dimensionless();
    }

    try {
      return this.parseUnitExpression(unitString);
    } catch (error) {
      throw new Error(`Cannot parse unit: ${unitString}`);
    }
  }

  /**
   * Parse a complex unit expression
   */
  private static parseUnitExpression(expr: string): CompositeUnit {
    // Handle simple single units first
    const unit = defaultUnitRegistry.get(expr);
    if (unit) {
      return CompositeUnit.fromUnit(unit);
    }

    // Handle division (e.g., "m/s", "m/s^2", "kg*m/s^2")
    if (expr.includes("/")) {
      const parts = expr.split("/");
      if (parts.length === 2) {
        const numerator = this.parseUnitTerm(parts[0]);
        const denominator = this.parseUnitTerm(parts[1]);
        return numerator.divide(denominator);
      }
    }

    // Handle just the numerator (no division)
    return this.parseUnitTerm(expr);
  }

  /**
   * Parse a unit term (handles multiplication and powers)
   */
  private static parseUnitTerm(term: string): CompositeUnit {
    // Handle multiplication (e.g., "kg*m")
    if (term.includes("*")) {
      const factors = term.split("*");
      let result = CompositeUnit.dimensionless();

      for (const factor of factors) {
        const factorUnit = this.parseUnitFactor(factor);
        result = result.multiply(factorUnit);
      }

      return result;
    }

    // Single factor
    return this.parseUnitFactor(term);
  }

  /**
   * Parse a single unit factor (handles powers)
   */
  private static parseUnitFactor(factor: string): CompositeUnit {
    // Handle powers (e.g., "s^2", "m^3")
    if (factor.includes("^")) {
      const parts = factor.split("^");
      if (parts.length === 2) {
        const baseUnit = defaultUnitRegistry.get(parts[0]);
        const power = parseInt(parts[1]);

        if (baseUnit && !isNaN(power)) {
          return CompositeUnit.fromUnit(baseUnit).power(power);
        }
      }
    }

    // Simple unit
    const unit = defaultUnitRegistry.get(factor);
    if (unit) {
      return CompositeUnit.fromUnit(unit);
    }

    throw new Error(`Unknown unit factor: ${factor}`);
  }
}
