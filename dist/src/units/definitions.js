"use strict";
/**
 * Unit Definitions and Dimensional Analysis for SmartPad
 *
 * This module provides the foundation for SmartPad's units system,
 * supporting dimensional analysis and unit conversions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultUnitRegistry = exports.UnitRegistry = exports.DIMENSIONS = void 0;
exports.createDimension = createDimension;
exports.dimensionsEqual = dimensionsEqual;
exports.multiplyDimensions = multiplyDimensions;
exports.divideDimensions = divideDimensions;
exports.powerDimension = powerDimension;
exports.formatDimension = formatDimension;
/**
 * Create a dimension with specified powers
 */
function createDimension(length = 0, mass = 0, time = 0, current = 0, temperature = 0, amount = 0, luminosity = 0) {
    return { length, mass, time, current, temperature, amount, luminosity };
}
/**
 * Common dimensions for quick reference
 */
exports.DIMENSIONS = {
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
    FREQUENCY: createDimension(0, 0, -1), // 1/s (Hz)
    FORCE: createDimension(1, 1, -2), // kg*m/s^2 (N)
    ENERGY: createDimension(2, 1, -2), // kg*m^2/s^2 (J)
    POWER: createDimension(2, 1, -3), // kg*m^2/s^3 (W)
    PRESSURE: createDimension(-1, 1, -2), // kg/(m*s^2) (Pa)
    // Dimensionless
    DIMENSIONLESS: createDimension(),
};
/**
 * Check if two dimensions are equal
 */
function dimensionsEqual(a, b) {
    return (a.length === b.length &&
        a.mass === b.mass &&
        a.time === b.time &&
        a.current === b.current &&
        a.temperature === b.temperature &&
        a.amount === b.amount &&
        a.luminosity === b.luminosity);
}
/**
 * Multiply two dimensions (add exponents)
 */
function multiplyDimensions(a, b) {
    return createDimension(a.length + b.length, a.mass + b.mass, a.time + b.time, a.current + b.current, a.temperature + b.temperature, a.amount + b.amount, a.luminosity + b.luminosity);
}
/**
 * Divide two dimensions (subtract exponents)
 */
function divideDimensions(a, b) {
    return createDimension(a.length - b.length, a.mass - b.mass, a.time - b.time, a.current - b.current, a.temperature - b.temperature, a.amount - b.amount, a.luminosity - b.luminosity);
}
/**
 * Raise a dimension to a power
 */
function powerDimension(dimension, power) {
    return createDimension(dimension.length * power, dimension.mass * power, dimension.time * power, dimension.current * power, dimension.temperature * power, dimension.amount * power, dimension.luminosity * power);
}
const SI_PREFIXES = [
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
class UnitRegistry {
    units = new Map();
    aliases = new Map(); // symbol -> canonical symbol
    prefixedCache = new Map();
    getDirect(symbol) {
        const canonical = this.aliases.get(symbol) || symbol;
        return this.units.get(canonical);
    }
    resolvePrefixedUnit(symbol) {
        const cached = this.prefixedCache.get(symbol);
        if (cached)
            return cached;
        for (const prefix of SI_PREFIXES_DESC) {
            if (!symbol.startsWith(prefix.symbol))
                continue;
            const baseSymbol = symbol.slice(prefix.symbol.length);
            if (!baseSymbol)
                continue;
            if (this.isDoublePrefixed(baseSymbol)) {
                return undefined;
            }
            const baseUnit = this.getDirect(baseSymbol);
            if (!baseUnit || baseUnit.baseOffset !== undefined)
                continue;
            const derived = {
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
    isDoublePrefixed(symbol) {
        if (symbol.length <= 1)
            return false;
        return SI_PREFIXES_DESC.some((prefix) => {
            if (!symbol.startsWith(prefix.symbol))
                return false;
            const innerSymbol = symbol.slice(prefix.symbol.length);
            if (!innerSymbol)
                return false;
            return Boolean(this.getDirect(innerSymbol));
        });
    }
    /**
     * Register a unit definition
     */
    register(unit, aliases = []) {
        this.units.set(unit.symbol, unit);
        // Register aliases
        for (const alias of aliases) {
            this.aliases.set(alias, unit.symbol);
        }
    }
    /**
     * Get unit definition by symbol (including aliases)
     */
    get(symbol) {
        const direct = this.getDirect(symbol);
        if (direct)
            return direct;
        return this.resolvePrefixedUnit(symbol);
    }
    /**
     * Check if a unit symbol is defined
     */
    has(symbol) {
        return !!this.get(symbol);
    }
    /**
     * Get all units in a category
     */
    getByCategory(category) {
        return Array.from(this.units.values()).filter((unit) => unit.category === category);
    }
    /**
     * Get all units with compatible dimensions
     */
    getCompatible(dimension) {
        return Array.from(this.units.values()).filter((unit) => dimensionsEqual(unit.dimension, dimension));
    }
    /**
     * Get all registered units
     */
    getAll() {
        return Array.from(this.units.values());
    }
}
exports.UnitRegistry = UnitRegistry;
/**
 * Default unit registry with common units
 */
exports.defaultUnitRegistry = new UnitRegistry();
// Base SI Units
exports.defaultUnitRegistry.register({
    symbol: "m",
    name: "meter",
    dimension: exports.DIMENSIONS.LENGTH,
    baseMultiplier: 1,
    category: "length",
}, ["meter", "meters"]);
exports.defaultUnitRegistry.register({
    symbol: "kg",
    name: "kilogram",
    dimension: exports.DIMENSIONS.MASS,
    baseMultiplier: 1,
    category: "mass",
}, ["kilogram", "kilograms"]);
exports.defaultUnitRegistry.register({
    symbol: "s",
    name: "second",
    dimension: exports.DIMENSIONS.TIME,
    baseMultiplier: 1,
    category: "time",
}, ["second", "seconds", "sec"]);
// Length units
exports.defaultUnitRegistry.register({
    symbol: "mm",
    name: "millimeter",
    dimension: exports.DIMENSIONS.LENGTH,
    baseMultiplier: 0.001,
    category: "length",
}, ["millimeter", "millimeters"]);
exports.defaultUnitRegistry.register({
    symbol: "cm",
    name: "centimeter",
    dimension: exports.DIMENSIONS.LENGTH,
    baseMultiplier: 0.01,
    category: "length",
}, ["centimeter", "centimeters"]);
exports.defaultUnitRegistry.register({
    symbol: "km",
    name: "kilometer",
    dimension: exports.DIMENSIONS.LENGTH,
    baseMultiplier: 1000,
    category: "length",
}, ["kilometer", "kilometers"]);
exports.defaultUnitRegistry.register({
    symbol: "in",
    name: "inch",
    dimension: exports.DIMENSIONS.LENGTH,
    baseMultiplier: 0.0254,
    category: "length",
}, ["inch", "inches"]);
exports.defaultUnitRegistry.register({
    symbol: "ft",
    name: "foot",
    dimension: exports.DIMENSIONS.LENGTH,
    baseMultiplier: 0.3048,
    category: "length",
}, ["foot", "feet"]);
exports.defaultUnitRegistry.register({
    symbol: "mi",
    name: "mile",
    dimension: exports.DIMENSIONS.LENGTH,
    baseMultiplier: 1609.344,
    category: "length",
}, ["mile", "miles"]);
// Time units
exports.defaultUnitRegistry.register({
    symbol: "min",
    name: "minute",
    dimension: exports.DIMENSIONS.TIME,
    baseMultiplier: 60,
    category: "time",
}, ["minute", "minutes"]);
exports.defaultUnitRegistry.register({
    symbol: "h",
    name: "hour",
    dimension: exports.DIMENSIONS.TIME,
    baseMultiplier: 3600,
    category: "time",
}, ["hour", "hours", "hr"]);
exports.defaultUnitRegistry.register({
    symbol: "day",
    name: "day",
    dimension: exports.DIMENSIONS.TIME,
    baseMultiplier: 86400,
    category: "time",
}, ["days"]);
exports.defaultUnitRegistry.register({
    symbol: "week",
    name: "week",
    dimension: exports.DIMENSIONS.TIME,
    baseMultiplier: 604800,
    category: "time",
}, ["weeks", "wk", "w"]);
exports.defaultUnitRegistry.register({
    symbol: "month",
    name: "month",
    dimension: exports.DIMENSIONS.TIME,
    baseMultiplier: 2592000,
    category: "time",
}, ["months", "mo"]);
exports.defaultUnitRegistry.register({
    symbol: "year",
    name: "year",
    dimension: exports.DIMENSIONS.TIME,
    baseMultiplier: 31536000,
    category: "time",
}, ["years", "yr", "y"]);
// Frequency units
exports.defaultUnitRegistry.register({
    symbol: "Hz",
    name: "hertz",
    dimension: exports.DIMENSIONS.FREQUENCY,
    baseMultiplier: 1,
    category: "frequency",
}, ["hertz"]);
exports.defaultUnitRegistry.register({
    symbol: "rpm",
    name: "revolutions per minute",
    dimension: exports.DIMENSIONS.FREQUENCY,
    baseMultiplier: 1 / 60,
    category: "frequency",
}, ["rev/min"]);
// Mass units
exports.defaultUnitRegistry.register({
    symbol: "g",
    name: "gram",
    dimension: exports.DIMENSIONS.MASS,
    baseMultiplier: 0.001,
    category: "mass",
}, ["gram", "grams"]);
exports.defaultUnitRegistry.register({
    symbol: "lb",
    name: "pound",
    dimension: exports.DIMENSIONS.MASS,
    baseMultiplier: 0.45359237,
    category: "mass",
}, ["pound", "pounds", "lbs"]);
// Speed units
exports.defaultUnitRegistry.register({
    symbol: "mph",
    name: "miles per hour",
    dimension: exports.DIMENSIONS.VELOCITY,
    baseMultiplier: 1609.344 / 3600,
    category: "speed",
}, ["mi/h"]);
exports.defaultUnitRegistry.register({
    symbol: "kph",
    name: "kilometers per hour",
    dimension: exports.DIMENSIONS.VELOCITY,
    baseMultiplier: 1000 / 3600,
    category: "speed",
}, ["km/h"]);
exports.defaultUnitRegistry.register({
    symbol: "ft/s",
    name: "feet per second",
    dimension: exports.DIMENSIONS.VELOCITY,
    baseMultiplier: 0.3048,
    category: "speed",
}, ["ft/sec"]);
// Temperature units (with offsets)
exports.defaultUnitRegistry.register({
    symbol: "°C",
    name: "Celsius",
    dimension: exports.DIMENSIONS.TEMPERATURE,
    baseMultiplier: 1,
    baseOffset: 273.15,
    category: "temperature",
}, ["celsius", "C"]);
exports.defaultUnitRegistry.register({
    symbol: "°F",
    name: "Fahrenheit",
    dimension: exports.DIMENSIONS.TEMPERATURE,
    baseMultiplier: 5 / 9,
    baseOffset: (459.67 * 5) / 9,
    category: "temperature",
}, ["fahrenheit", "F"]);
exports.defaultUnitRegistry.register({
    symbol: "K",
    name: "Kelvin",
    dimension: exports.DIMENSIONS.TEMPERATURE,
    baseMultiplier: 1,
    category: "temperature",
}, ["kelvin"]);
// Volume units
exports.defaultUnitRegistry.register({
    symbol: "L",
    name: "liter",
    dimension: exports.DIMENSIONS.VOLUME,
    baseMultiplier: 0.001,
    category: "volume",
}, ["l", "liter", "liters", "litre", "litres"]);
exports.defaultUnitRegistry.register({
    symbol: "gal",
    name: "gallon",
    dimension: exports.DIMENSIONS.VOLUME,
    baseMultiplier: 0.003785411784,
    category: "volume",
}, ["gallon", "gallons"]);
exports.defaultUnitRegistry.register({
    symbol: "mol",
    name: "mole",
    dimension: exports.DIMENSIONS.AMOUNT,
    baseMultiplier: 1,
    category: "amount",
}, ["mole", "moles"]);
exports.defaultUnitRegistry.register({
    symbol: "cd",
    name: "candela",
    dimension: exports.DIMENSIONS.LUMINOSITY,
    baseMultiplier: 1,
    category: "luminosity",
}, ["candela", "candelas"]);
// Current units
exports.defaultUnitRegistry.register({
    symbol: "A",
    name: "ampere",
    dimension: exports.DIMENSIONS.CURRENT,
    baseMultiplier: 1,
    category: "current",
}, ["ampere", "amperes", "amp", "amps"]);
exports.defaultUnitRegistry.register({
    symbol: "mA",
    name: "milliampere",
    dimension: exports.DIMENSIONS.CURRENT,
    baseMultiplier: 0.001,
    category: "current",
}, ["milliampere", "milliamperes"]);
// Electrical units (derived)
exports.defaultUnitRegistry.register({
    symbol: "V",
    name: "volt",
    dimension: createDimension(2, 1, -3, -1), // kg*m^2/(A*s^3)
    baseMultiplier: 1,
    category: "electrical",
}, ["volt", "volts"]);
exports.defaultUnitRegistry.register({
    symbol: "W",
    name: "watt",
    dimension: exports.DIMENSIONS.POWER,
    baseMultiplier: 1,
    category: "power",
}, ["watt", "watts"]);
exports.defaultUnitRegistry.register({
    symbol: "J",
    name: "joule",
    dimension: exports.DIMENSIONS.ENERGY,
    baseMultiplier: 1,
    category: "energy",
}, ["joule", "joules"]);
exports.defaultUnitRegistry.register({
    symbol: "Wh",
    name: "watt-hour",
    dimension: exports.DIMENSIONS.ENERGY,
    baseMultiplier: 3600,
    category: "energy",
}, ["watt-hour", "watt-hours", "Wh"]);
exports.defaultUnitRegistry.register({
    symbol: "N",
    name: "newton",
    dimension: exports.DIMENSIONS.FORCE,
    baseMultiplier: 1,
    category: "force",
}, ["newton", "newtons"]);
exports.defaultUnitRegistry.register({
    symbol: "Pa",
    name: "pascal",
    dimension: exports.DIMENSIONS.PRESSURE,
    baseMultiplier: 1,
    category: "pressure",
}, ["pascal", "pascals"]);
exports.defaultUnitRegistry.register({
    symbol: "bar",
    name: "bar",
    dimension: exports.DIMENSIONS.PRESSURE,
    baseMultiplier: 100000,
    category: "pressure",
}, ["bars"]);
exports.defaultUnitRegistry.register({
    symbol: "psi",
    name: "pound per square inch",
    dimension: exports.DIMENSIONS.PRESSURE,
    baseMultiplier: 6894.757,
    category: "pressure",
}, ["pounds per square inch"]);
exports.defaultUnitRegistry.register({
    symbol: "atm",
    name: "standard atmosphere",
    dimension: exports.DIMENSIONS.PRESSURE,
    baseMultiplier: 101325,
    category: "pressure",
}, ["atmosphere", "atmospheres"]);
exports.defaultUnitRegistry.register({
    symbol: "ohm",
    name: "ohm",
    dimension: createDimension(2, 1, -3, -2),
    baseMultiplier: 1,
    category: "electrical",
}, ["Ω"]);
exports.defaultUnitRegistry.register({
    symbol: "mpg",
    name: "miles per gallon",
    dimension: createDimension(-2),
    baseMultiplier: 425143.707430272,
    category: "fuelEconomy",
}, ["miles per gallon"]);
/**
 * Format a dimension for display (e.g., "m*kg/s^2")
 */
function formatDimension(dimension) {
    const components = [];
    // Positive exponents in numerator (in standard SI order)
    if (dimension.mass > 0)
        components.push(dimension.mass === 1 ? "kg" : `kg^${dimension.mass}`);
    if (dimension.length > 0)
        components.push(dimension.length === 1 ? "m" : `m^${dimension.length}`);
    if (dimension.time > 0)
        components.push(dimension.time === 1 ? "s" : `s^${dimension.time}`);
    if (dimension.current > 0)
        components.push(dimension.current === 1 ? "A" : `A^${dimension.current}`);
    if (dimension.temperature > 0)
        components.push(dimension.temperature === 1 ? "K" : `K^${dimension.temperature}`);
    if (dimension.amount > 0)
        components.push(dimension.amount === 1 ? "mol" : `mol^${dimension.amount}`);
    if (dimension.luminosity > 0)
        components.push(dimension.luminosity === 1 ? "cd" : `cd^${dimension.luminosity}`);
    // Negative exponents in denominator (in standard SI order)
    const denominatorComponents = [];
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
