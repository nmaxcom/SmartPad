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
  readonly count: number; // countable units (unit)
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
  luminosity = 0,
  count = 0
): Dimension {
  return { length, mass, time, current, temperature, amount, luminosity, count };
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
  COUNT: createDimension(0, 0, 0, 0, 0, 0, 0, 1), // unit
  INFORMATION: createDimension(0, 0, 0, 0, 0, 0, 0, 1), // bit (modeled on count dimension)

  // Derived dimensions
  AREA: createDimension(2), // m^2
  VOLUME: createDimension(3), // m^3
  VELOCITY: createDimension(1, 0, -1), // m/s
  ACCELERATION: createDimension(1, 0, -2), // m/s^2
  FREQUENCY: createDimension(0, 0, -1), // 1/s (Hz)
  FORCE: createDimension(1, 1, -2), // kg*m/s^2 (N)
  ENERGY: createDimension(2, 1, -2), // kg*m^2/s^2 (J)
  POWER: createDimension(2, 1, -3), // kg*m^2/s^3 (W)
  PRESSURE: createDimension(-1, 1, -2), // kg/(m*s^2) (Pa)
  INFORMATION_RATE: createDimension(0, 0, -1, 0, 0, 0, 0, 1), // bit/s

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
    a.luminosity === b.luminosity &&
    a.count === b.count
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
    a.luminosity + b.luminosity,
    a.count + b.count
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
    a.luminosity - b.luminosity,
    a.count - b.count
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
    dimension.luminosity * power,
    dimension.count * power
  );
}

/**
 * Definition of a physical unit
 */
export interface UnitDefinition {
  readonly symbol: string; // "m", "kg", "km", "mph"
  readonly name: string; // "meter", "kilogram", "kilometer", "miles per hour"
  readonly plural?: string; // optional display plural (e.g., person -> people)
  readonly dimension: Dimension; // Physical dimension
  readonly baseMultiplier: number; // Factor to convert to base SI unit
  readonly baseOffset?: number; // Offset for temperature conversions
  readonly category: string; // "length", "mass", "time", etc.
}

interface UnitPrefixDefinition {
  readonly symbol: string;
  readonly name: string;
  readonly factor: number;
}

const SI_PREFIXES: UnitPrefixDefinition[] = [
  { symbol: "Y", name: "yotta", factor: 1e24 },
  { symbol: "Z", name: "zetta", factor: 1e21 },
  { symbol: "E", name: "exa", factor: 1e18 },
  { symbol: "P", name: "peta", factor: 1e15 },
  { symbol: "T", name: "tera", factor: 1e12 },
  { symbol: "G", name: "giga", factor: 1e9 },
  { symbol: "M", name: "mega", factor: 1e6 },
  { symbol: "k", name: "kilo", factor: 1e3 },
  { symbol: "h", name: "hecto", factor: 1e2 },
  { symbol: "da", name: "deka", factor: 1e1 },
  { symbol: "d", name: "deci", factor: 1e-1 },
  { symbol: "c", name: "centi", factor: 1e-2 },
  { symbol: "m", name: "milli", factor: 1e-3 },
  { symbol: "u", name: "micro", factor: 1e-6 },
  { symbol: "µ", name: "micro", factor: 1e-6 },
  { symbol: "μ", name: "micro", factor: 1e-6 },
  { symbol: "n", name: "nano", factor: 1e-9 },
  { symbol: "p", name: "pico", factor: 1e-12 },
  { symbol: "f", name: "femto", factor: 1e-15 },
  { symbol: "a", name: "atto", factor: 1e-18 },
  { symbol: "z", name: "zepto", factor: 1e-21 },
  { symbol: "y", name: "yocto", factor: 1e-24 },
];

const SI_PREFIXES_DESC = [...SI_PREFIXES].sort((a, b) => b.symbol.length - a.symbol.length);

/**
 * Registry of all defined units
 */
export class UnitRegistry {
  private units = new Map<string, UnitDefinition>();
  private aliases = new Map<string, string>(); // symbol -> canonical symbol
  private prefixedCache = new Map<string, UnitDefinition>();
  private dynamicUnits = new Map<string, UnitDefinition>(); // lowercased symbol -> unit
  private blockedUnits = new Map<string, string>();
  private staticUnits = new Set<string>();
  private staticAliases = new Set<string>();

  private getDirect(symbol: string): UnitDefinition | undefined {
    const canonical = this.aliases.get(symbol) || symbol;
    return this.units.get(canonical);
  }

  private resolveDynamicUnit(symbol: string): UnitDefinition | undefined {
    if (!symbol) return undefined;
    const direct = this.dynamicUnits.get(symbol);
    if (direct) return direct;
    const hasUpper = /[A-Z]/.test(symbol);
    const lower = symbol.toLowerCase();
    if (!hasUpper) {
      const directLower = this.dynamicUnits.get(lower);
      if (directLower) return directLower;
    }
    const baseSymbol = hasUpper ? symbol : lower;
    if (baseSymbol.endsWith("es")) {
      const base = baseSymbol.slice(0, -2);
      const plural = this.dynamicUnits.get(base);
      if (plural) return plural;
    }
    if (baseSymbol.endsWith("s")) {
      const base = baseSymbol.slice(0, -1);
      return this.dynamicUnits.get(base);
    }
    return undefined;
  }

  private singularizeCountSymbol(symbol: string): string {
    if (symbol.endsWith("ies")) {
      return `${symbol.slice(0, -3)}y`;
    }
    if (
      symbol.endsWith("es") &&
      /(s|x|z|ch|sh)$/.test(symbol.slice(0, -2))
    ) {
      return symbol.slice(0, -2);
    }
    if (symbol.endsWith("s") && symbol.length > 1) {
      return symbol.slice(0, -1);
    }
    return symbol;
  }

  private pluralizeCountSymbol(symbol: string): string {
    if (symbol.endsWith("y") && !/[aeiou]y$/i.test(symbol)) {
      return `${symbol.slice(0, -1)}ies`;
    }
    if (/(s|x|z|ch|sh)$/.test(symbol)) {
      return `${symbol}es`;
    }
    return `${symbol}s`;
  }

  private resolveAdHocUnit(symbol: string): UnitDefinition | undefined {
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(symbol)) return undefined;

    const normalized = /[A-Z]/.test(symbol) ? symbol : symbol.toLowerCase();
    const singular = this.singularizeCountSymbol(normalized);
    const plural = this.pluralizeCountSymbol(singular);
    const definition: UnitDefinition = {
      symbol: singular,
      name: singular,
      plural,
      dimension: DIMENSIONS.COUNT,
      baseMultiplier: 1,
      category: "count",
    };

    if (!this.units.has(singular)) {
      this.units.set(singular, definition);
      this.aliases.set(plural, singular);
    }

    if (symbol !== singular && !this.aliases.has(symbol)) {
      this.aliases.set(symbol, singular);
    }

    return this.units.get(singular);
  }

  private resolvePrefixedUnit(symbol: string): UnitDefinition | undefined {
    const cached = this.prefixedCache.get(symbol);
    if (cached) return cached;

    for (const prefix of SI_PREFIXES_DESC) {
      if (!symbol.startsWith(prefix.symbol)) continue;

      const baseSymbol = symbol.slice(prefix.symbol.length);
      if (!baseSymbol) continue;
      if (this.isDoublePrefixed(baseSymbol)) {
        return undefined;
      }

      const baseUnit = this.getDirect(baseSymbol);
      if (!baseUnit || baseUnit.baseOffset !== undefined) continue;

      const derived: UnitDefinition = {
        symbol,
        name: `${prefix.name}${baseUnit.name}`,
        dimension: baseUnit.dimension,
        baseMultiplier: baseUnit.baseMultiplier * prefix.factor,
        category: baseUnit.category,
      };

      this.prefixedCache.set(symbol, derived);
      return derived;
    }

    return undefined;
  }

  private isDoublePrefixed(symbol: string): boolean {
    if (symbol.length <= 1) return false;
    return SI_PREFIXES_DESC.some((prefix) => {
      if (!symbol.startsWith(prefix.symbol)) return false;
      const innerSymbol = symbol.slice(prefix.symbol.length);
      if (!innerSymbol) return false;
      return Boolean(this.getDirect(innerSymbol));
    });
  }

  /**
   * Register a unit definition
   */
  register(unit: UnitDefinition, aliases: string[] = []): void {
    this.units.set(unit.symbol, unit);
    this.staticUnits.add(unit.symbol);

    // Register aliases
    for (const alias of aliases) {
      this.aliases.set(alias, unit.symbol);
      this.staticAliases.add(alias);
    }
  }

  /**
   * Get unit definition by symbol (including aliases)
   */
  get(symbol: string): UnitDefinition | undefined {
    const dynamic = this.resolveDynamicUnit(symbol);
    if (dynamic) return dynamic;

    const direct = this.getDirect(symbol);
    if (direct) return direct;

    const prefixed = this.resolvePrefixedUnit(symbol);
    if (prefixed) return prefixed;

    return this.resolveAdHocUnit(symbol);
  }

  getOrError(symbol: string): UnitDefinition {
    const message = this.getBlockedMessage(symbol);
    if (message) {
      throw new Error(message);
    }
    const unit = this.get(symbol);
    if (!unit) {
      throw new Error(`Unknown unit factor: ${symbol}`);
    }
    return unit;
  }

  /**
   * Replace the current dynamic units map (used for per-context unit aliases).
   */
  setDynamicUnits(units: Map<string, UnitDefinition>, blocked: Map<string, string> = new Map()): void {
    this.dynamicUnits = units;
    this.blockedUnits = blocked;
    this.prefixedCache.clear();
  }

  /**
   * Clear all dynamic units.
   */
  clearDynamicUnits(): void {
    this.dynamicUnits.clear();
    this.blockedUnits.clear();
    this.prefixedCache.clear();
  }

  isBlocked(symbol: string): boolean {
    return Boolean(this.getBlockedMessage(symbol));
  }

  getBlockedMessage(symbol: string): string | undefined {
    return this.getBlockedMessageInternal(symbol);
  }

  private getBlockedMessageInternal(symbol: string): string | undefined {
    if (this.blockedUnits.has(symbol)) return this.blockedUnits.get(symbol);
    const lower = symbol.toLowerCase();
    return this.blockedUnits.get(lower);
  }

  /**
   * Check if a unit symbol is defined
   */
  has(symbol: string): boolean {
    return !!this.get(symbol);
  }

  isBuiltinSymbol(symbol: string): boolean {
    if (!symbol) return false;
    const hasUpper = /[A-Z]/.test(symbol);
    const candidates = hasUpper ? [symbol] : [symbol, symbol.toLowerCase()];
    for (const cand of candidates) {
      if (this.staticUnits.has(cand) || this.staticAliases.has(cand)) {
        return true;
      }
    }
    for (const prefix of SI_PREFIXES_DESC) {
      if (!symbol.startsWith(prefix.symbol)) continue;
      const baseSymbol = symbol.slice(prefix.symbol.length);
      if (!baseSymbol) continue;
      if (this.staticUnits.has(baseSymbol)) return true;
      if (!/[A-Z]/.test(baseSymbol)) {
        const lowerBase = baseSymbol.toLowerCase();
        if (this.staticUnits.has(lowerBase)) return true;
      }
    }
    return false;
  }

  isKnownSymbol(symbol: string): boolean {
    if (!symbol) return false;
    const dynamic = this.resolveDynamicUnit(symbol);
    if (dynamic) return true;
    const direct = this.getDirect(symbol);
    if (direct) return true;
    const prefixed = this.resolvePrefixedUnit(symbol);
    if (prefixed) return true;
    return false;
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

defaultUnitRegistry.register(
  {
    symbol: "unit",
    name: "unit",
    dimension: DIMENSIONS.COUNT,
    baseMultiplier: 1,
    category: "count",
  },
  ["units", "count", "counts", "item", "items"]
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

defaultUnitRegistry.register(
  {
    symbol: "week",
    name: "week",
    dimension: DIMENSIONS.TIME,
    baseMultiplier: 604800,
    category: "time",
  },
  ["weeks", "wk", "w"]
);

defaultUnitRegistry.register(
  {
    symbol: "month",
    name: "month",
    dimension: DIMENSIONS.TIME,
    baseMultiplier: 2592000,
    category: "time",
  },
  ["months", "mo"]
);

defaultUnitRegistry.register(
  {
    symbol: "year",
    name: "year",
    dimension: DIMENSIONS.TIME,
    baseMultiplier: 31536000,
    category: "time",
  },
  ["years", "yr", "y"]
);

// Frequency units
defaultUnitRegistry.register(
  {
    symbol: "Hz",
    name: "hertz",
    dimension: DIMENSIONS.FREQUENCY,
    baseMultiplier: 1,
    category: "frequency",
  },
  ["hertz"]
);

defaultUnitRegistry.register(
  {
    symbol: "rpm",
    name: "revolutions per minute",
    dimension: DIMENSIONS.FREQUENCY,
    baseMultiplier: 1 / 60,
    category: "frequency",
  },
  ["rev/min"]
);

// Information units (base in bits)
defaultUnitRegistry.register(
  {
    symbol: "bit",
    name: "bit",
    dimension: DIMENSIONS.INFORMATION,
    baseMultiplier: 1,
    category: "information",
  },
  ["bits"]
);

defaultUnitRegistry.register(
  {
    symbol: "B",
    name: "byte",
    dimension: DIMENSIONS.INFORMATION,
    baseMultiplier: 8,
    category: "information",
  },
  ["byte", "bytes"]
);

defaultUnitRegistry.register(
  {
    symbol: "kbit",
    name: "kilobit",
    dimension: DIMENSIONS.INFORMATION,
    baseMultiplier: 1e3,
    category: "information",
  },
  ["kb"]
);

defaultUnitRegistry.register(
  {
    symbol: "Mbit",
    name: "megabit",
    dimension: DIMENSIONS.INFORMATION,
    baseMultiplier: 1e6,
    category: "information",
  },
  ["Mb"]
);

defaultUnitRegistry.register(
  {
    symbol: "Gbit",
    name: "gigabit",
    dimension: DIMENSIONS.INFORMATION,
    baseMultiplier: 1e9,
    category: "information",
  },
  ["Gb"]
);

defaultUnitRegistry.register(
  {
    symbol: "Tbit",
    name: "terabit",
    dimension: DIMENSIONS.INFORMATION,
    baseMultiplier: 1e12,
    category: "information",
  },
  ["Tb"]
);

defaultUnitRegistry.register(
  {
    symbol: "kB",
    name: "kilobyte",
    dimension: DIMENSIONS.INFORMATION,
    baseMultiplier: 8e3,
    category: "information",
  },
  ["KB"]
);

defaultUnitRegistry.register(
  {
    symbol: "MB",
    name: "megabyte",
    dimension: DIMENSIONS.INFORMATION,
    baseMultiplier: 8e6,
    category: "information",
  },
  ["megabyte", "megabytes"]
);

defaultUnitRegistry.register(
  {
    symbol: "GB",
    name: "gigabyte",
    dimension: DIMENSIONS.INFORMATION,
    baseMultiplier: 8e9,
    category: "information",
  },
  ["gigabyte", "gigabytes"]
);

defaultUnitRegistry.register(
  {
    symbol: "TB",
    name: "terabyte",
    dimension: DIMENSIONS.INFORMATION,
    baseMultiplier: 8e12,
    category: "information",
  },
  ["terabyte", "terabytes"]
);

defaultUnitRegistry.register(
  {
    symbol: "KiB",
    name: "kibibyte",
    dimension: DIMENSIONS.INFORMATION,
    baseMultiplier: 8192,
    category: "information",
  },
  ["kibibyte", "kibibytes"]
);

defaultUnitRegistry.register(
  {
    symbol: "MiB",
    name: "mebibyte",
    dimension: DIMENSIONS.INFORMATION,
    baseMultiplier: 8388608,
    category: "information",
  },
  ["mebibyte", "mebibytes"]
);

defaultUnitRegistry.register(
  {
    symbol: "GiB",
    name: "gibibyte",
    dimension: DIMENSIONS.INFORMATION,
    baseMultiplier: 8589934592,
    category: "information",
  },
  ["gibibyte", "gibibytes"]
);

defaultUnitRegistry.register(
  {
    symbol: "TiB",
    name: "tebibyte",
    dimension: DIMENSIONS.INFORMATION,
    baseMultiplier: 8796093022208,
    category: "information",
  },
  ["tebibyte", "tebibytes"]
);

// Information throughput units (base in bit/s)
defaultUnitRegistry.register(
  {
    symbol: "bit/s",
    name: "bits per second",
    dimension: DIMENSIONS.INFORMATION_RATE,
    baseMultiplier: 1,
    category: "informationRate",
  },
  ["bps"]
);

defaultUnitRegistry.register(
  {
    symbol: "kbit/s",
    name: "kilobits per second",
    dimension: DIMENSIONS.INFORMATION_RATE,
    baseMultiplier: 1e3,
    category: "informationRate",
  },
  ["kbps", "Kb/s"]
);

defaultUnitRegistry.register(
  {
    symbol: "Mbit/s",
    name: "megabits per second",
    dimension: DIMENSIONS.INFORMATION_RATE,
    baseMultiplier: 1e6,
    category: "informationRate",
  },
  ["Mbps", "Mb/s"]
);

defaultUnitRegistry.register(
  {
    symbol: "Gbit/s",
    name: "gigabits per second",
    dimension: DIMENSIONS.INFORMATION_RATE,
    baseMultiplier: 1e9,
    category: "informationRate",
  },
  ["Gbps", "Gb/s"]
);

defaultUnitRegistry.register(
  {
    symbol: "Tbit/s",
    name: "terabits per second",
    dimension: DIMENSIONS.INFORMATION_RATE,
    baseMultiplier: 1e12,
    category: "informationRate",
  },
  ["Tbps", "Tb/s"]
);

defaultUnitRegistry.register(
  {
    symbol: "B/s",
    name: "bytes per second",
    dimension: DIMENSIONS.INFORMATION_RATE,
    baseMultiplier: 8,
    category: "informationRate",
  },
  ["Bps"]
);

defaultUnitRegistry.register(
  {
    symbol: "KB/s",
    name: "kilobytes per second",
    dimension: DIMENSIONS.INFORMATION_RATE,
    baseMultiplier: 8e3,
    category: "informationRate",
  },
  ["KBps"]
);

defaultUnitRegistry.register(
  {
    symbol: "MB/s",
    name: "megabytes per second",
    dimension: DIMENSIONS.INFORMATION_RATE,
    baseMultiplier: 8e6,
    category: "informationRate",
  },
  ["MBps"]
);

defaultUnitRegistry.register(
  {
    symbol: "GB/s",
    name: "gigabytes per second",
    dimension: DIMENSIONS.INFORMATION_RATE,
    baseMultiplier: 8e9,
    category: "informationRate",
  },
  ["GBps"]
);

defaultUnitRegistry.register(
  {
    symbol: "TB/s",
    name: "terabytes per second",
    dimension: DIMENSIONS.INFORMATION_RATE,
    baseMultiplier: 8e12,
    category: "informationRate",
  },
  ["TBps"]
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
  ["pound", "pounds", "lbs"]
);

// Speed units
defaultUnitRegistry.register(
  {
    symbol: "mph",
    name: "miles per hour",
    dimension: DIMENSIONS.VELOCITY,
    baseMultiplier: 1609.344 / 3600,
    category: "speed",
  },
  ["mi/h"]
);

defaultUnitRegistry.register(
  {
    symbol: "kph",
    name: "kilometers per hour",
    dimension: DIMENSIONS.VELOCITY,
    baseMultiplier: 1000 / 3600,
    category: "speed",
  },
  ["km/h"]
);

defaultUnitRegistry.register(
  {
    symbol: "ft/s",
    name: "feet per second",
    dimension: DIMENSIONS.VELOCITY,
    baseMultiplier: 0.3048,
    category: "speed",
  },
  ["ft/sec"]
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

// Volume units
defaultUnitRegistry.register(
  {
    symbol: "L",
    name: "liter",
    dimension: DIMENSIONS.VOLUME,
    baseMultiplier: 0.001,
    category: "volume",
  },
  ["l", "liter", "liters", "litre", "litres"]
);

defaultUnitRegistry.register(
  {
    symbol: "gal",
    name: "gallon",
    dimension: DIMENSIONS.VOLUME,
    baseMultiplier: 0.003785411784,
    category: "volume",
  },
  ["gallon", "gallons"]
);

defaultUnitRegistry.register(
  {
    symbol: "mol",
    name: "mole",
    dimension: DIMENSIONS.AMOUNT,
    baseMultiplier: 1,
    category: "amount",
  },
  ["mole", "moles"]
);

defaultUnitRegistry.register(
  {
    symbol: "cd",
    name: "candela",
    dimension: DIMENSIONS.LUMINOSITY,
    baseMultiplier: 1,
    category: "luminosity",
  },
  ["candela", "candelas"]
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
    symbol: "Wh",
    name: "watt-hour",
    dimension: DIMENSIONS.ENERGY,
    baseMultiplier: 3600,
    category: "energy",
  },
  ["watt-hour", "watt-hours", "Wh"]
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

defaultUnitRegistry.register(
  {
    symbol: "bar",
    name: "bar",
    dimension: DIMENSIONS.PRESSURE,
    baseMultiplier: 100000,
    category: "pressure",
  },
  ["bars"]
);

defaultUnitRegistry.register(
  {
    symbol: "psi",
    name: "pound per square inch",
    dimension: DIMENSIONS.PRESSURE,
    baseMultiplier: 6894.757,
    category: "pressure",
  },
  ["pounds per square inch"]
);

defaultUnitRegistry.register(
  {
    symbol: "atm",
    name: "standard atmosphere",
    dimension: DIMENSIONS.PRESSURE,
    baseMultiplier: 101325,
    category: "pressure",
  },
  ["atmosphere", "atmospheres"]
);

defaultUnitRegistry.register(
  {
    symbol: "ohm",
    name: "ohm",
    dimension: createDimension(2, 1, -3, -2),
    baseMultiplier: 1,
    category: "electrical",
  },
  ["Ω"]
);

defaultUnitRegistry.register(
  {
    symbol: "mpg",
    name: "miles per gallon",
    dimension: createDimension(-2),
    baseMultiplier: 425143.707430272,
    category: "fuelEconomy",
  },
  ["miles per gallon"]
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
  if (dimension.count > 0)
    components.push(dimension.count === 1 ? "count" : `count^${dimension.count}`);

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
  if (dimension.count < 0)
    denominatorComponents.push(dimension.count === -1 ? "count" : `count^${-dimension.count}`);

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
