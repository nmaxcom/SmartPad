/**
 * Unit Definitions Tests
 *
 * Tests unit registry and dimension operations including:
 * - Dimension arithmetic and compatibility
 * - Unit registry management
 * - Default unit definitions
 * - Unit conversion factors
 */

import {
  createDimension,
  DIMENSIONS,
  dimensionsEqual,
  multiplyDimensions,
  divideDimensions,
  powerDimension,
  formatDimension,
  UnitRegistry,
  defaultUnitRegistry,
} from "../../src/units/definitions";

describe("Dimension Operations", () => {
  test("should create dimensions correctly", () => {
    const length = createDimension(1);
    expect(length).toEqual({
      length: 1,
      mass: 0,
      time: 0,
      current: 0,
      temperature: 0,
      amount: 0,
      luminosity: 0,
    });

    const velocity = createDimension(1, 0, -1);
    expect(velocity).toEqual({
      length: 1,
      mass: 0,
      time: -1,
      current: 0,
      temperature: 0,
      amount: 0,
      luminosity: 0,
    });
  });

  test("should compare dimensions correctly", () => {
    const length1 = createDimension(1);
    const length2 = createDimension(1);
    const mass = createDimension(0, 1);

    expect(dimensionsEqual(length1, length2)).toBe(true);
    expect(dimensionsEqual(length1, mass)).toBe(false);
  });

  test("should multiply dimensions correctly", () => {
    const length = createDimension(1);
    const time = createDimension(0, 0, 1);
    const result = multiplyDimensions(length, time);

    expect(result).toEqual(createDimension(1, 0, 1));
  });

  test("should divide dimensions correctly", () => {
    const length = createDimension(1);
    const time = createDimension(0, 0, 1);
    const velocity = divideDimensions(length, time);

    expect(velocity).toEqual(createDimension(1, 0, -1));
    expect(dimensionsEqual(velocity, DIMENSIONS.VELOCITY)).toBe(true);
  });

  test("should raise dimensions to powers correctly", () => {
    const length = createDimension(1);
    const area = powerDimension(length, 2);
    const volume = powerDimension(length, 3);

    expect(dimensionsEqual(area, DIMENSIONS.AREA)).toBe(true);
    expect(dimensionsEqual(volume, DIMENSIONS.VOLUME)).toBe(true);
  });

  test("should format dimensions correctly", () => {
    expect(formatDimension(DIMENSIONS.LENGTH)).toBe("m");
    expect(formatDimension(DIMENSIONS.AREA)).toBe("m^2");
    expect(formatDimension(DIMENSIONS.VELOCITY)).toBe("m/s");
    expect(formatDimension(DIMENSIONS.ACCELERATION)).toBe("m/s^2");
    expect(formatDimension(DIMENSIONS.FORCE)).toBe("kg*m/s^2");
    expect(formatDimension(DIMENSIONS.DIMENSIONLESS)).toBe("1");
  });
});

describe("Unit Registry", () => {
  test("should register and retrieve units", () => {
    const registry = new UnitRegistry();

    const meterUnit = {
      symbol: "m",
      name: "meter",
      dimension: DIMENSIONS.LENGTH,
      baseMultiplier: 1,
      category: "length",
    };

    registry.register(meterUnit, ["meter", "meters"]);

    expect(registry.get("m")).toEqual(meterUnit);
    expect(registry.get("meter")).toEqual(meterUnit);
    expect(registry.get("meters")).toEqual(meterUnit);
    expect(registry.has("m")).toBe(true);
    expect(registry.has("meter")).toBe(true);
    expect(registry.has("unknown")).toBe(false);
  });

  test("should get units by category", () => {
    const registry = new UnitRegistry();

    const meter = {
      symbol: "m",
      name: "meter",
      dimension: DIMENSIONS.LENGTH,
      baseMultiplier: 1,
      category: "length",
    };

    const kilogram = {
      symbol: "kg",
      name: "kilogram",
      dimension: DIMENSIONS.MASS,
      baseMultiplier: 1,
      category: "mass",
    };

    registry.register(meter);
    registry.register(kilogram);

    const lengthUnits = registry.getByCategory("length");
    expect(lengthUnits).toHaveLength(1);
    expect(lengthUnits[0]).toEqual(meter);
  });

  test("should get compatible units", () => {
    const registry = new UnitRegistry();

    const meter = {
      symbol: "m",
      name: "meter",
      dimension: DIMENSIONS.LENGTH,
      baseMultiplier: 1,
      category: "length",
    };

    const kilometer = {
      symbol: "km",
      name: "kilometer",
      dimension: DIMENSIONS.LENGTH,
      baseMultiplier: 1000,
      category: "length",
    };

    const kilogram = {
      symbol: "kg",
      name: "kilogram",
      dimension: DIMENSIONS.MASS,
      baseMultiplier: 1,
      category: "mass",
    };

    registry.register(meter);
    registry.register(kilometer);
    registry.register(kilogram);

    const lengthUnits = registry.getCompatible(DIMENSIONS.LENGTH);
    expect(lengthUnits).toHaveLength(2);
    expect(lengthUnits.map((u) => u.symbol)).toContain("m");
    expect(lengthUnits.map((u) => u.symbol)).toContain("km");
  });
});

describe("Default Unit Registry", () => {
  test("should have basic SI units", () => {
    expect(defaultUnitRegistry.has("m")).toBe(true);
    expect(defaultUnitRegistry.has("kg")).toBe(true);
    expect(defaultUnitRegistry.has("s")).toBe(true);
  });

  test("should have length units", () => {
    expect(defaultUnitRegistry.has("mm")).toBe(true);
    expect(defaultUnitRegistry.has("cm")).toBe(true);
    expect(defaultUnitRegistry.has("km")).toBe(true);
    expect(defaultUnitRegistry.has("in")).toBe(true);
    expect(defaultUnitRegistry.has("ft")).toBe(true);
    expect(defaultUnitRegistry.has("mi")).toBe(true);
  });

  test("should have time units", () => {
    expect(defaultUnitRegistry.has("min")).toBe(true);
    expect(defaultUnitRegistry.has("h")).toBe(true);
    expect(defaultUnitRegistry.has("day")).toBe(true);
  });

  test("should have mass units", () => {
    expect(defaultUnitRegistry.has("g")).toBe(true);
    expect(defaultUnitRegistry.has("lb")).toBe(true);
  });

  test("should have temperature units", () => {
    expect(defaultUnitRegistry.has("°C")).toBe(true);
    expect(defaultUnitRegistry.has("°F")).toBe(true);
    expect(defaultUnitRegistry.has("K")).toBe(true);
  });

  test("should support aliases", () => {
    expect(defaultUnitRegistry.has("meter")).toBe(true);
    expect(defaultUnitRegistry.has("meters")).toBe(true);
    expect(defaultUnitRegistry.has("hour")).toBe(true);
    expect(defaultUnitRegistry.has("hours")).toBe(true);
  });

  test("should have correct conversion factors", () => {
    const km = defaultUnitRegistry.get("km");
    const mi = defaultUnitRegistry.get("mi");
    const h = defaultUnitRegistry.get("h");

    expect(km?.baseMultiplier).toBe(1000);
    expect(mi?.baseMultiplier).toBe(1609.344);
    expect(h?.baseMultiplier).toBe(3600);
  });
});
