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
      {
        length: 0,
        mass: 0,
        time: 0,
        current: 0,
        temperature: 0,
        amount: 0,
        luminosity: 0,
        count: 0,
      }
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
    if (
      !dimensionsEqual(dimension, {
      length: 0,
      mass: 0,
      time: 0,
      current: 0,
      temperature: 0,
      amount: 0,
      luminosity: 0,
      count: 0,
      })
    ) {
      return false;
    }
    return !this.components.some((component) => component.unit.dimension.count !== 0);
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

    if (this.components.length === 1) {
      const component = this.components[0];
      const unitStr =
        Math.abs(component.power) === 1
          ? component.unit.symbol
          : `${component.unit.symbol}^${Math.abs(component.power)}`;
      return component.power < 0 ? `1/${unitStr}` : unitStr;
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
      { symbol: "Hz", dimension: createDimension(0, 0, -1) }, // Frequency: 1/s
      { symbol: "N", dimension: createDimension(1, 1, -2) }, // Force: kg*m/s^2
      { symbol: "Pa", dimension: createDimension(-1, 1, -2) }, // Pressure: kg/(m*s^2)
      { symbol: "J", dimension: createDimension(2, 1, -2) }, // Energy: kg*m^2/s^2
      { symbol: "W", dimension: createDimension(2, 1, -3) }, // Power: kg*m^2/s^3
      { symbol: "V", dimension: createDimension(2, 1, -3, -1) }, // Voltage: kg*m^2/(A*s^3)
      { symbol: "ohm", dimension: createDimension(2, 1, -3, -2) }, // Resistance: kg*m^2/(A^2*s^3)
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

    if (this.unit.isCompatibleWith(other.unit)) {
      const thisBaseFactor = this.unit.getBaseConversionFactor();
      const otherBaseFactor = other.unit.getBaseConversionFactor();
      const newValue = (this.value * thisBaseFactor) / (other.value * otherBaseFactor);
      const dimension = this.unit.getDimension();
      const isPureCount =
        dimension.length === 0 &&
        dimension.mass === 0 &&
        dimension.time === 0 &&
        dimension.current === 0 &&
        dimension.temperature === 0 &&
        dimension.amount === 0 &&
        dimension.luminosity === 0 &&
        dimension.count !== 0;
      const newUnit = isPureCount ? this.unit.divide(other.unit) : CompositeUnit.dimensionless();
      return new Quantity(newValue, newUnit);
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
    let unitStr = this.unit.toString();
    const absValue = Math.abs(formattedValue);
    const pluralForms: Record<string, string> = {
      day: "days",
      week: "weeks",
      month: "months",
      year: "years",
      unit: "units",
      person: "people",
      request: "requests",
      word: "words",
      serving: "servings",
      defect: "defects",
      batch: "batches",
    };
    if (
      pluralForms[unitStr] &&
      absValue !== 1 &&
      !unitStr.includes("/") &&
      !unitStr.includes("^") &&
      !unitStr.includes("*")
    ) {
      unitStr = pluralForms[unitStr];
    }

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
    const tokens = this.tokenize(expr);
    let index = 0;

    const current = () => tokens[index];
    const consume = (expectedType?: string, expectedValue?: string) => {
      const token = current();
      if (!token) {
        throw new Error("Unexpected end of unit expression");
      }
      if (expectedType && token.type !== expectedType) {
        throw new Error(`Expected ${expectedType}, got ${token.type}`);
      }
      if (expectedValue && token.value !== expectedValue) {
        throw new Error(`Expected ${expectedValue}, got ${token.value}`);
      }
      index++;
      return token;
    };
    const matchOp = (value: string) =>
      current()?.type === "op" && current()?.value === value;

    const parseSignedNumber = (): number => {
      let sign = 1;
      if (matchOp("+") || matchOp("-")) {
        sign = current()?.value === "-" ? -1 : 1;
        consume("op");
      }
      const token = consume("number");
      const value = parseFloat(token.value);
      if (Number.isNaN(value)) {
        throw new Error(`Invalid exponent: ${token.value}`);
      }
      return sign * value;
    };

    const parsePrimary = (): CompositeUnit => {
      const token = current();
      if (!token) {
        throw new Error("Unexpected end of unit expression");
      }
      if (token.type === "unit") {
        const unitDef = defaultUnitRegistry.get(token.value);
        if (!unitDef) {
          throw new Error(`Unknown unit factor: ${token.value}`);
        }
        consume("unit");
        return CompositeUnit.fromUnit(unitDef);
      }
      if (token.type === "number") {
        if (token.value !== "1") {
          throw new Error(`Unexpected number in unit expression: ${token.value}`);
        }
        consume("number");
        return CompositeUnit.dimensionless();
      }
      if (token.type === "lparen") {
        consume("lparen");
        const inner = parseExpression();
        consume("rparen");
        return inner;
      }
      throw new Error(`Unexpected token: ${token.value}`);
    };

    const parseFactor = (): CompositeUnit => {
      let base = parsePrimary();
      if (matchOp("^")) {
        consume("op", "^");
        const exponent = parseSignedNumber();
        base = base.power(exponent);
      }
      return base;
    };

    const parseExpression = (): CompositeUnit => {
      let left = parseFactor();
      while (matchOp("*") || matchOp("/")) {
        const op = consume("op").value;
        const right = parseFactor();
        left = op === "*" ? left.multiply(right) : left.divide(right);
      }
      return left;
    };

    const result = parseExpression();
    if (index < tokens.length) {
      throw new Error(`Unexpected token: ${tokens[index].value}`);
    }
    return result.simplify();
  }

  private static tokenize(expr: string): Array<{ type: string; value: string }> {
    const tokens: Array<{ type: string; value: string }> = [];
    let pos = 0;
    const isUnitChar = (ch: string) => /[A-Za-z°µμΩ]/.test(ch);
    const isNumberChar = (ch: string) => /[\d.]/.test(ch);

    while (pos < expr.length) {
      const ch = expr[pos];
      if (/\s/.test(ch)) {
        pos++;
        continue;
      }
      if (ch === "(") {
        tokens.push({ type: "lparen", value: ch });
        pos++;
        continue;
      }
      if (ch === ")") {
        tokens.push({ type: "rparen", value: ch });
        pos++;
        continue;
      }
      if ("*/^+-".includes(ch)) {
        tokens.push({ type: "op", value: ch });
        pos++;
        continue;
      }
      if (isNumberChar(ch)) {
        let value = "";
        while (pos < expr.length && isNumberChar(expr[pos])) {
          value += expr[pos];
          pos++;
        }
        tokens.push({ type: "number", value });
        continue;
      }
      if (isUnitChar(ch)) {
        let value = "";
        while (pos < expr.length && isUnitChar(expr[pos])) {
          value += expr[pos];
          pos++;
        }
        tokens.push({ type: "unit", value });
        continue;
      }
      throw new Error(`Unexpected character in unit expression: ${ch}`);
    }

    return tokens;
  }
}
