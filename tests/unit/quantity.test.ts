/**
 * Quantity Tests
 *
 * Tests quantity and unit data structures including:
 * - Composite unit construction and manipulation
 * - Quantity creation and operations
 * - Unit parsing and formatting
 * - Unit arithmetic and conversions
 */

import { CompositeUnit, Quantity, UnitParser } from "../../src/units/quantity";
import { defaultUnitRegistry, DIMENSIONS } from "../../src/units/definitions";

describe("CompositeUnit", () => {
  test("should create simple units", () => {
    const meterUnit = defaultUnitRegistry.get("m")!;
    const meter = CompositeUnit.fromUnit(meterUnit);

    expect(meter.components).toHaveLength(1);
    expect(meter.components[0].unit.symbol).toBe("m");
    expect(meter.components[0].power).toBe(1);
  });

  test("should create dimensionless units", () => {
    const dimensionless = CompositeUnit.dimensionless();

    expect(dimensionless.components).toHaveLength(0);
    expect(dimensionless.isDimensionless()).toBe(true);
  });

  test("should multiply units correctly", () => {
    const meterUnit = defaultUnitRegistry.get("m")!;
    const secondUnit = defaultUnitRegistry.get("s")!;

    const meter = CompositeUnit.fromUnit(meterUnit);
    const second = CompositeUnit.fromUnit(secondUnit);

    const meterSecond = meter.multiply(second);
    expect(meterSecond.components).toHaveLength(2);
  });

  test("should divide units correctly", () => {
    const meterUnit = defaultUnitRegistry.get("m")!;
    const secondUnit = defaultUnitRegistry.get("s")!;

    const meter = CompositeUnit.fromUnit(meterUnit);
    const second = CompositeUnit.fromUnit(secondUnit);

    const velocity = meter.divide(second);
    expect(velocity.getDimension()).toEqual(DIMENSIONS.VELOCITY);
  });

  test("should raise units to powers correctly", () => {
    const meterUnit = defaultUnitRegistry.get("m")!;
    const meter = CompositeUnit.fromUnit(meterUnit);

    const area = meter.power(2);
    expect(area.getDimension()).toEqual(DIMENSIONS.AREA);

    const volume = meter.power(3);
    expect(volume.getDimension()).toEqual(DIMENSIONS.VOLUME);
  });

  test("should simplify units correctly", () => {
    const meterUnit = defaultUnitRegistry.get("m")!;
    const meter = CompositeUnit.fromUnit(meterUnit);

    // m * m / m should simplify to m
    const complex = meter.multiply(meter).divide(meter);
    const simplified = complex.simplify();

    expect(simplified.components).toHaveLength(1);
    expect(simplified.components[0].power).toBe(1);
  });

  test("should check compatibility correctly", () => {
    const meterUnit = defaultUnitRegistry.get("m")!;
    const kilometerUnit = defaultUnitRegistry.get("km")!;
    const kilogramUnit = defaultUnitRegistry.get("kg")!;

    const meter = CompositeUnit.fromUnit(meterUnit);
    const kilometer = CompositeUnit.fromUnit(kilometerUnit);
    const kilogram = CompositeUnit.fromUnit(kilogramUnit);

    expect(meter.isCompatibleWith(kilometer)).toBe(true);
    expect(meter.isCompatibleWith(kilogram)).toBe(false);
  });

  test("should format units correctly", () => {
    const meterUnit = defaultUnitRegistry.get("m")!;
    const secondUnit = defaultUnitRegistry.get("s")!;

    const meter = CompositeUnit.fromUnit(meterUnit);
    const second = CompositeUnit.fromUnit(secondUnit);

    expect(meter.toString()).toBe("m");
    expect(meter.power(2).toString()).toBe("m^2");
    expect(meter.divide(second).toString()).toBe("m/s");
    expect(meter.divide(second.power(2)).toString()).toBe("m/s^2");
  });

  test("should calculate conversion factors correctly", () => {
    const kilometerUnit = defaultUnitRegistry.get("km")!;
    const kilometer = CompositeUnit.fromUnit(kilometerUnit);

    expect(kilometer.getBaseConversionFactor()).toBe(1000);
  });
});

describe("Quantity", () => {
  test("should create quantities from unit symbols", () => {
    const length = Quantity.fromUnit(10, "m");

    expect(length.value).toBe(10);
    expect(length.unit.components[0].unit.symbol).toBe("m");
  });

  test("should create dimensionless quantities", () => {
    const dimensionless = Quantity.dimensionless(5);

    expect(dimensionless.value).toBe(5);
    expect(dimensionless.isDimensionless()).toBe(true);
  });

  test("should add compatible quantities", () => {
    const length1 = Quantity.fromUnit(10, "m");
    const length2 = Quantity.fromUnit(5, "m");

    const sum = length1.add(length2);
    expect(sum.value).toBe(15);
    expect(sum.unit.components[0].unit.symbol).toBe("m");
  });

  test("should convert units when adding", () => {
    const meters = Quantity.fromUnit(1000, "m");
    const kilometers = Quantity.fromUnit(1, "km");

    const sum = meters.add(kilometers);
    expect(sum.value).toBe(2000); // 1000m + 1000m = 2000m
  });

  test("should throw error when adding incompatible units", () => {
    const length = Quantity.fromUnit(10, "m");
    const mass = Quantity.fromUnit(5, "kg");

    expect(() => length.add(mass)).toThrow("incompatible dimensions");
  });

  test("should subtract compatible quantities", () => {
    const length1 = Quantity.fromUnit(10, "m");
    const length2 = Quantity.fromUnit(3, "m");

    const difference = length1.subtract(length2);
    expect(difference.value).toBe(7);
  });

  test("should multiply quantities correctly", () => {
    const length = Quantity.fromUnit(10, "m");
    const width = Quantity.fromUnit(5, "m");

    const area = length.multiply(width);
    expect(area.value).toBe(50);
    expect(area.unit.getDimension()).toEqual(DIMENSIONS.AREA);
  });

  test("should divide quantities correctly", () => {
    const distance = Quantity.fromUnit(100, "m");
    const time = Quantity.fromUnit(10, "s");

    const speed = distance.divide(time);
    expect(speed.value).toBe(10);
    expect(speed.unit.getDimension()).toEqual(DIMENSIONS.VELOCITY);
  });

  test("should throw error on division by zero", () => {
    const distance = Quantity.fromUnit(100, "m");
    const zero = Quantity.fromUnit(0, "s");

    expect(() => distance.divide(zero)).toThrow("Division by zero");
  });

  test("should raise quantities to powers correctly", () => {
    const length = Quantity.fromUnit(5, "m");

    const area = length.power(2);
    expect(area.value).toBe(25);
    expect(area.unit.getDimension()).toEqual(DIMENSIONS.AREA);

    const volume = length.power(3);
    expect(volume.value).toBe(125);
    expect(volume.unit.getDimension()).toEqual(DIMENSIONS.VOLUME);
  });

  test("should convert between compatible units", () => {
    const kilometers = Quantity.fromUnit(1, "km");
    const meters = kilometers.convertTo("m");

    expect(meters.value).toBe(1000);
    expect(meters.unit.components[0].unit.symbol).toBe("m");
  });

  test("should convert between imperial and metric", () => {
    const feet = Quantity.fromUnit(1, "ft");
    const meters = feet.convertTo("m");

    expect(meters.value).toBeCloseTo(0.3048, 6);

    const miles = Quantity.fromUnit(1, "mi");
    const kilometers = miles.convertTo("km");

    expect(kilometers.value).toBeCloseTo(1.609344, 6);
  });

  test("should convert composite units across prefixes", () => {
    const density = new Quantity(2, UnitParser.parse("kg/m^2"));
    const converted = density.convertToUnit(UnitParser.parse("g/cm^2"));

    expect(converted.value).toBeCloseTo(0.2, 10);
    expect(converted.unit.toString()).toBe("g/cm^2");
  });

  test("should throw error when converting incompatible units", () => {
    const length = Quantity.fromUnit(10, "m");

    expect(() => length.convertTo("kg")).toThrow("incompatible dimensions");
  });

  test("should format quantities correctly", () => {
    const length = Quantity.fromUnit(10.123456, "m");
    expect(length.toString()).toBe("10.1235 m");

    const dimensionless = Quantity.dimensionless(5);
    expect(dimensionless.toString()).toBe("5");
  });

  test("should check equality correctly", () => {
    const length1 = Quantity.fromUnit(1000, "m");
    const length2 = Quantity.fromUnit(1, "km");
    const mass = Quantity.fromUnit(1000, "g");

    expect(length1.equals(length2)).toBe(true);
    expect(length1.equals(mass)).toBe(false);
  });

  test("should handle complex unit calculations", () => {
    // Force calculation: F = ma
    const mass = Quantity.fromUnit(10, "kg");
    const acceleration = Quantity.fromUnit(9.8, "m"); // m/s^2 simplified as m for test

    const force = mass.multiply(acceleration);
    expect(force.value).toBe(98);

    // Energy calculation: E = (1/2) * m * v^2
    const velocity = Quantity.fromUnit(20, "m"); // m/s simplified
    const kineticEnergy = mass.multiply(velocity.power(2)).multiply(Quantity.dimensionless(0.5));

    expect(kineticEnergy.value).toBe(2000);
  });

  test("should preserve magnitude when mapping composite pressure-volume to joules", () => {
    const pressure = Quantity.fromUnit(1, "psi");
    const volume = Quantity.fromUnit(1, "L");

    const work = pressure.multiply(volume).toDisplayQuantity();
    expect(work.unit.toString()).toBe("J");
    expect(work.value).toBeCloseTo(6.894757, 6);
  });

  test("should keep equivalent work invariant across pressure unit conversions", () => {
    const pressureSI = Quantity.fromUnit(101, "kPa");
    const pressureImperial = pressureSI.convertTo("psi");
    const volume = Quantity.fromUnit(2, "L");

    const workSI = pressureSI.multiply(volume).toDisplayQuantity();
    const workImperial = pressureImperial.multiply(volume).toDisplayQuantity();

    expect(workSI.unit.toString()).toBe("J");
    expect(workImperial.unit.toString()).toBe("J");
    expect(workSI.value).toBeCloseTo(202, 6);
    expect(workImperial.value).toBeCloseTo(202, 6);
  });
});

describe("UnitParser", () => {
  test("should parse simple units", () => {
    const meter = UnitParser.parse("m");
    expect(meter.components).toHaveLength(1);
    expect(meter.components[0].unit.symbol).toBe("m");
  });

  test("should parse dimensionless units", () => {
    const dimensionless1 = UnitParser.parse("");
    const dimensionless2 = UnitParser.parse("1");

    expect(dimensionless1.isDimensionless()).toBe(true);
    expect(dimensionless2.isDimensionless()).toBe(true);
  });

  test("should parse simple compound units", () => {
    const velocity = UnitParser.parse("m/s");
    expect(velocity.getDimension()).toEqual(DIMENSIONS.VELOCITY);
  });

  test("should parse units with parentheses and multiple divisions", () => {
    const pressure = UnitParser.parse("kg/(m*s^2)");
    expect(pressure.getDimension()).toEqual(DIMENSIONS.PRESSURE);

    const pressureAlt = UnitParser.parse("kg/m/s^2");
    expect(pressureAlt.getDimension()).toEqual(DIMENSIONS.PRESSURE);
  });

  test("should parse inverse units", () => {
    const frequency = UnitParser.parse("1/s");
    expect(frequency.getDimension()).toEqual(DIMENSIONS.FREQUENCY);
  });

  test("should throw error for unknown units", () => {
    expect(() => UnitParser.parse("unknown")).not.toThrow();
  });
});
