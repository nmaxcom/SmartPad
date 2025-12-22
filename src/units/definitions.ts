/**
 * Unit Definitions and Dimensional Analysis for SmartPad
 *
 * This module provides the foundation for SmartPad's units system,
 * supporting dimensional analysis and unit conversions.
 */

/**
 * Fundamental physical dimensions based on SI base units
 */
export interface Dimension {
  readonly length: number; // meter (m)
  readonly mass: number; // kilogram (kg)
  readonly time: number; // second (s)
  readonly current: number; // ampere (A)
  readonly temperature: number; // kelvin (K)
  readonly amount: number; // mole (mol)
  readonly luminosity: number; // candela (cd)
}

/**
 * Create a dimension with specified powers
 */
export function createDimension(
  length = 0,
  mass = 0,
  time = 0,
  current = 0,
  temperature = 0,
  amount = 0,
  luminosity = 0
): Dimension {
  return { length, mass, time, current, temperature, amount, luminosity };
}

/**
 * Common dimensions for quick reference
 */
export const DIMENSIONS = {
  // Base dimensions
  LENGTH: createDimension(1), // m
  MASS: createDimension(0, 1), // kg
  TIME: createDimension(0, 0, 1), // s
  CURRENT: createDimension(0, 0, 0, 1), // A
  TEMPERATURE: createDimension(0, 0, 0, 0, 1), // K
  AMOUNT: createDimension(0, 0, 0, 0, 0, 1), // mol
  LUMINOSITY: createDimension(0, 0, 0, 0, 0, 0, 1), // cd

  // Derived dimensions
  AREA: createDimension(2), // m^2
  VOLUME: createDimension(3), // m^3
  VELOCITY: createDimension(1, 0, -1), // m/s
  ACCELERATION: createDimension(1, 0, -2), // m/s^2
  FORCE: createDimension(1, 1, -2), // kg*m/s^2 (N)
  ENERGY: createDimension(2, 1, -2), // kg*m^2/s^2 (J)
  POWER: createDimension(2, 1, -3), // kg*m^2/s^3 (W)
  PRESSURE: createDimension(-1, 1, -2), // kg/(m*s^2) (Pa)

  // Dimensionless
  DIMENSIONLESS: createDimension(),
} as const;

/**
 * Check if two dimensions are equal
 */
export function dimensionsEqual(a: Dimension, b: Dimension): boolean {
  return (
    a.length === b.length &&
    a.mass === b.mass &&
    a.time === b.time &&
    a.current === b.current &&
    a.temperature === b.temperature &&
    a.amount === b.amount &&
    a.luminosity === b.luminosity
  );
}

/**
 * Multiply two dimensions (add exponents)
 */
export function multiplyDimensions(a: Dimension, b: Dimension): Dimension {
  return createDimension(
    a.length + b.length,
    a.mass + b.mass,
    a.time + b.time,
    a.current + b.current,
    a.temperature + b.temperature,
    a.amount + b.amount,
    a.luminosity + b.luminosity
  );
}

/**
 * Divide two dimensions (subtract exponents)
 */
export function divideDimensions(a: Dimension, b: Dimension): Dimension {
  return createDimension(
    a.length - b.length,
    a.mass - b.mass,
    a.time - b.time,
    a.current - b.current,
    a.temperature - b.temperature,
    a.amount - b.amount,
    a.luminosity - b.luminosity
  );
}

/**
 * Raise a dimension to a power
 */
export function powerDimension(dimension: Dimension, power: number): Dimension {
  return createDimension(
    dimension.length * power,
    dimension.mass * power,
    dimension.time * power,
    dimension.current * power,
    dimension.temperature * power,
    dimension.amount * power,
    dimension.luminosity * power
  );
}

/**
 * Definition of a physical unit
 */
export interface UnitDefinition {
  readonly symbol: string; // "m", "kg", "km", "mph"
  readonly name: string; // "meter", "kilogram", "kilometer", "miles per hour"
  readonly dimension: Dimension; // Physical dimension
  readonly baseMultiplier: number; // Factor to convert to base SI unit
  readonly baseOffset?: number; // Offset for temperature conversions
  readonly category: string; // "length", "mass", "time", etc.
}

/**
 * Registry of all defined units
 */
export class UnitRegistry {
  private units = new Map<string, UnitDefinition>();
  private aliases = new Map<string, string>(); // symbol -> canonical symbol

  /**
   * Register a unit definition
   */
  register(unit: UnitDefinition, aliases: string[] = []): void {
    this.units.set(unit.symbol, unit);

    // Register aliases
    for (const alias of aliases) {
      this.aliases.set(alias, unit.symbol);
    }
  }

  /**
   * Get unit definition by symbol (including aliases)
   */
  get(symbol: string): UnitDefinition | undefined {
    const canonical = this.aliases.get(symbol) || symbol;
    return this.units.get(canonical);
  }

  /**
   * Check if a unit symbol is defined
   */
  has(symbol: string): boolean {
    return this.units.has(symbol) || this.aliases.has(symbol);
  }

  /**
   * Get all units in a category
   */
  getByCategory(category: string): UnitDefinition[] {
    return Array.from(this.units.values()).filter((unit) => unit.category === category);
  }

  /**
   * Get all units with compatible dimensions
   */
  getCompatible(dimension: Dimension): UnitDefinition[] {
    return Array.from(this.units.values()).filter((unit) =>
      dimensionsEqual(unit.dimension, dimension)
    );
  }

  /**
   * Get all registered units
   */
  getAll(): UnitDefinition[] {
    return Array.from(this.units.values());
  }
}

/**
 * Default unit registry with common units
 */
export const defaultUnitRegistry = new UnitRegistry();

// Base SI Units
defaultUnitRegistry.register(
  {
    symbol: "m",
    name: "meter",
    dimension: DIMENSIONS.LENGTH,
    baseMultiplier: 1,
    category: "length",
  },
  ["meter", "meters"]
);

defaultUnitRegistry.register(
  {
    symbol: "kg",
    name: "kilogram",
    dimension: DIMENSIONS.MASS,
    baseMultiplier: 1,
    category: "mass",
  },
  ["kilogram", "kilograms"]
);

defaultUnitRegistry.register(
  {
    symbol: "s",
    name: "second",
    dimension: DIMENSIONS.TIME,
    baseMultiplier: 1,
    category: "time",
  },
  ["second", "seconds", "sec"]
);

// Length units
defaultUnitRegistry.register(
  {
    symbol: "mm",
    name: "millimeter",
    dimension: DIMENSIONS.LENGTH,
    baseMultiplier: 0.001,
    category: "length",
  },
  ["millimeter", "millimeters"]
);

defaultUnitRegistry.register(
  {
    symbol: "cm",
    name: "centimeter",
    dimension: DIMENSIONS.LENGTH,
    baseMultiplier: 0.01,
    category: "length",
  },
  ["centimeter", "centimeters"]
);

defaultUnitRegistry.register(
  {
    symbol: "km",
    name: "kilometer",
    dimension: DIMENSIONS.LENGTH,
    baseMultiplier: 1000,
    category: "length",
  },
  ["kilometer", "kilometers"]
);

defaultUnitRegistry.register(
  {
    symbol: "in",
    name: "inch",
    dimension: DIMENSIONS.LENGTH,
    baseMultiplier: 0.0254,
    category: "length",
  },
  ["inch", "inches"]
);

defaultUnitRegistry.register(
  {
    symbol: "ft",
    name: "foot",
    dimension: DIMENSIONS.LENGTH,
    baseMultiplier: 0.3048,
    category: "length",
  },
  ["foot", "feet"]
);

defaultUnitRegistry.register(
  {
    symbol: "mi",
    name: "mile",
    dimension: DIMENSIONS.LENGTH,
    baseMultiplier: 1609.344,
    category: "length",
  },
  ["mile", "miles"]
);

// Time units
defaultUnitRegistry.register(
  {
    symbol: "min",
    name: "minute",
    dimension: DIMENSIONS.TIME,
    baseMultiplier: 60,
    category: "time",
  },
  ["minute", "minutes"]
);

defaultUnitRegistry.register(
  {
    symbol: "h",
    name: "hour",
    dimension: DIMENSIONS.TIME,
    baseMultiplier: 3600,
    category: "time",
  },
  ["hour", "hours", "hr"]
);

defaultUnitRegistry.register(
  {
    symbol: "day",
    name: "day",
    dimension: DIMENSIONS.TIME,
    baseMultiplier: 86400,
    category: "time",
  },
  ["days"]
);

// Mass units
defaultUnitRegistry.register(
  {
    symbol: "g",
    name: "gram",
    dimension: DIMENSIONS.MASS,
    baseMultiplier: 0.001,
    category: "mass",
  },
  ["gram", "grams"]
);

defaultUnitRegistry.register(
  {
    symbol: "lb",
    name: "pound",
    dimension: DIMENSIONS.MASS,
    baseMultiplier: 0.45359237,
    category: "mass",
  },
  ["pound", "pounds"]
);

// Temperature units (with offsets)
defaultUnitRegistry.register(
  {
    symbol: "°C",
    name: "Celsius",
    dimension: DIMENSIONS.TEMPERATURE,
    baseMultiplier: 1,
    baseOffset: 273.15,
    category: "temperature",
  },
  ["celsius", "C"]
);

defaultUnitRegistry.register(
  {
    symbol: "°F",
    name: "Fahrenheit",
    dimension: DIMENSIONS.TEMPERATURE,
    baseMultiplier: 5 / 9,
    baseOffset: (459.67 * 5) / 9,
    category: "temperature",
  },
  ["fahrenheit", "F"]
);

defaultUnitRegistry.register(
  {
    symbol: "K",
    name: "Kelvin",
    dimension: DIMENSIONS.TEMPERATURE,
    baseMultiplier: 1,
    category: "temperature",
  },
  ["kelvin"]
);

// Current units
defaultUnitRegistry.register(
  {
    symbol: "A",
    name: "ampere",
    dimension: DIMENSIONS.CURRENT,
    baseMultiplier: 1,
    category: "current",
  },
  ["ampere", "amperes", "amp", "amps"]
);

defaultUnitRegistry.register(
  {
    symbol: "mA",
    name: "milliampere",
    dimension: DIMENSIONS.CURRENT,
    baseMultiplier: 0.001,
    category: "current",
  },
  ["milliampere", "milliamperes"]
);

// Electrical units (derived)
defaultUnitRegistry.register(
  {
    symbol: "V",
    name: "volt",
    dimension: createDimension(2, 1, -3, -1), // kg*m^2/(A*s^3)
    baseMultiplier: 1,
    category: "electrical",
  },
  ["volt", "volts"]
);

defaultUnitRegistry.register(
  {
    symbol: "W",
    name: "watt",
    dimension: DIMENSIONS.POWER,
    baseMultiplier: 1,
    category: "power",
  },
  ["watt", "watts"]
);

defaultUnitRegistry.register(
  {
    symbol: "J",
    name: "joule",
    dimension: DIMENSIONS.ENERGY,
    baseMultiplier: 1,
    category: "energy",
  },
  ["joule", "joules"]
);

defaultUnitRegistry.register(
  {
    symbol: "N",
    name: "newton",
    dimension: DIMENSIONS.FORCE,
    baseMultiplier: 1,
    category: "force",
  },
  ["newton", "newtons"]
);

defaultUnitRegistry.register(
  {
    symbol: "Pa",
    name: "pascal",
    dimension: DIMENSIONS.PRESSURE,
    baseMultiplier: 1,
    category: "pressure",
  },
  ["pascal", "pascals"]
);

/**
 * Format a dimension for display (e.g., "m*kg/s^2")
 */
export function formatDimension(dimension: Dimension): string {
  const components: string[] = [];

  // Positive exponents in numerator (in standard SI order)
  if (dimension.mass > 0) components.push(dimension.mass === 1 ? "kg" : `kg^${dimension.mass}`);
  if (dimension.length > 0) components.push(dimension.length === 1 ? "m" : `m^${dimension.length}`);
  if (dimension.time > 0) components.push(dimension.time === 1 ? "s" : `s^${dimension.time}`);
  if (dimension.current > 0)
    components.push(dimension.current === 1 ? "A" : `A^${dimension.current}`);
  if (dimension.temperature > 0)
    components.push(dimension.temperature === 1 ? "K" : `K^${dimension.temperature}`);
  if (dimension.amount > 0)
    components.push(dimension.amount === 1 ? "mol" : `mol^${dimension.amount}`);
  if (dimension.luminosity > 0)
    components.push(dimension.luminosity === 1 ? "cd" : `cd^${dimension.luminosity}`);

  // Negative exponents in denominator (in standard SI order)
  const denominatorComponents: string[] = [];
  if (dimension.mass < 0)
    denominatorComponents.push(dimension.mass === -1 ? "kg" : `kg^${-dimension.mass}`);
  if (dimension.length < 0)
    denominatorComponents.push(dimension.length === -1 ? "m" : `m^${-dimension.length}`);
  if (dimension.time < 0)
    denominatorComponents.push(dimension.time === -1 ? "s" : `s^${-dimension.time}`);
  if (dimension.current < 0)
    denominatorComponents.push(dimension.current === -1 ? "A" : `A^${-dimension.current}`);
  if (dimension.temperature < 0)
    denominatorComponents.push(dimension.temperature === -1 ? "K" : `K^${-dimension.temperature}`);
  if (dimension.amount < 0)
    denominatorComponents.push(dimension.amount === -1 ? "mol" : `mol^${-dimension.amount}`);
  if (dimension.luminosity < 0)
    denominatorComponents.push(dimension.luminosity === -1 ? "cd" : `cd^${-dimension.luminosity}`);

  if (components.length === 0 && denominatorComponents.length === 0) {
    return "1"; // dimensionless
  }

  if (denominatorComponents.length === 0) {
    return components.join("*");
  }

  if (components.length === 0) {
    return `1/${denominatorComponents.join("*")}`;
  }

  return `${components.join("*")}/${denominatorComponents.join("*")}`;
}
