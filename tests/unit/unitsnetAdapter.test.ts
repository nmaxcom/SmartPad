/**
 * UnitsNet.js Adapter Tests
 *
 * Tests the adapter layer between unitsnet-js and SmartPad's units system.
 */

import {
  SmartPadQuantity,
  UnitsNetParser,
  UnitsNetMathEvaluator,
  MATHEMATICAL_CONSTANTS,
} from "../../src/units/unitsnetAdapter";

describe("UnitsNet.js Adapter", () => {
  describe("SmartPadQuantity", () => {
    test("should create dimensionless quantity", () => {
      const quantity = SmartPadQuantity.dimensionless(42);

      expect(quantity.value).toBe(42);
      expect(quantity.unit).toBe("");
      expect(quantity.isDimensionless()).toBe(true);
    });

    test("should create quantity with units", () => {
      const quantity = new SmartPadQuantity(10, "m");

      expect(quantity.value).toBe(10);
      expect(quantity.unit).toBe("m");
      expect(quantity.isDimensionless()).toBe(false);
    });

    test("should add quantities correctly", () => {
      const q1 = new SmartPadQuantity(5, "m");
      const q2 = new SmartPadQuantity(3, "m");
      const result = q1.add(q2);

      expect(result.value).toBe(8);
      expect(result.unit).toBe("m");
    });

    test("should subtract quantities correctly", () => {
      const q1 = new SmartPadQuantity(10, "kg");
      const q2 = new SmartPadQuantity(3, "kg");
      const result = q1.subtract(q2);

      expect(result.value).toBe(7);
      expect(result.unit).toBe("kg");
    });

    test("should multiply quantities correctly", () => {
      const q1 = new SmartPadQuantity(5, "m");
      const q2 = new SmartPadQuantity(3, "m");
      const result = q1.multiply(q2);

      expect(result.value).toBe(15);
      expect(result.unit).toBe("m^2");
    });

    test("should preserve energy magnitude for pressure-volume products after conversion", () => {
      const pressure = SmartPadQuantity.fromValueAndUnit(101, "kPa").convertTo("psi");
      const volume = SmartPadQuantity.fromValueAndUnit(2, "L");
      const work = pressure.multiply(volume);

      expect(work.unit).toBe("J");
      expect(work.value).toBeCloseTo(202, 4);
      expect(work.toString(4)).toMatch(/202(\.0+)?\s*J/);
    });

    test("should divide quantities correctly", () => {
      const q1 = new SmartPadQuantity(100, "m");
      const q2 = new SmartPadQuantity(10, "s");
      const result = q1.divide(q2);

      expect(result.value).toBe(10);
      expect(result.unit).toBe("m/s");
    });

    test("should convert composite units across prefixes", () => {
      const mass = SmartPadQuantity.fromValueAndUnit(5, "kg");
      const area = SmartPadQuantity.fromValueAndUnit(2.5, "m^2");
      const density = mass.divide(area);
      const converted = density.convertTo("g/cm^2");

      expect(converted.value).toBeCloseTo(0.2, 10);
      expect(converted.unit).toBe("g/cm^2");
    });

    test("should convert flow rates to base units", () => {
      const flow = SmartPadQuantity.fromValueAndUnit(12, "L/min");
      const converted = flow.convertTo("m^3/s");

      expect(converted.value).toBeCloseTo(0.0002, 10);
      expect(converted.unit).toBe("m^3/s");
    });

    test("should convert rpm to Hz", () => {
      const spin = SmartPadQuantity.fromValueAndUnit(1200, "rpm");
      const converted = spin.convertTo("Hz");

      expect(converted.value).toBeCloseTo(20, 10);
      expect(converted.unit).toBe("Hz");
    });

    test("should convert mpg to km/L", () => {
      const economy = SmartPadQuantity.fromValueAndUnit(28, "mpg");
      const converted = economy.convertTo("km/L");

      expect(converted.value).toBeCloseTo(11.904, 3);
      expect(converted.unit).toBe("km/L");
    });

    test("should convert energy to kWh", () => {
      const energy = SmartPadQuantity.fromValueAndUnit(3600000, "J");
      const converted = energy.convertTo("kWh");

      expect(converted.value).toBeCloseTo(1, 10);
      expect(converted.unit).toBe("kWh");
    });

    test("should raise quantity to power", () => {
      const q1 = new SmartPadQuantity(5, "m");
      const result = q1.power(2);

      expect(result.value).toBe(25);
      expect(result.unit).toBe("m^2");
    });

    test("should handle dimensionless arithmetic", () => {
      const q1 = SmartPadQuantity.dimensionless(10);
      const q2 = SmartPadQuantity.dimensionless(5);
      const result = q1.add(q2);

      expect(result.value).toBe(15);
      expect(result.isDimensionless()).toBe(true);
    });

    test("should convert to string correctly", () => {
      const quantity = new SmartPadQuantity(10.5, "m");
      // Default precision trims trailing zeros for readability
      expect(quantity.toString()).toBe("10.5 m");
      // Even with precision specified, trailing zeros are trimmed
      expect(quantity.toString(2)).toBe("10.5 m");
    });

    test("should convert dimensionless to string correctly", () => {
      const quantity = SmartPadQuantity.dimensionless(3.14159);
      expect(quantity.toString(3)).toBe("3.142");
    });

    test("should check equality with tolerance", () => {
      const q1 = new SmartPadQuantity(10, "m");
      const q2 = new SmartPadQuantity(10.0001, "m");
      const q3 = new SmartPadQuantity(10, "kg");

      expect(q1.equals(q2, 1e-3)).toBe(true); // Use larger tolerance for this test
      expect(q1.equals(q3)).toBe(false);
    });
  });

  describe("UnitsNetParser", () => {
    test("should parse basic length units", () => {
      const result = UnitsNetParser.parse(10, "m");
      expect(result).toBeDefined();
      expect(result.value).toBe(10);
    });

    test("should parse mass units", () => {
      const result = UnitsNetParser.parse(5, "kg");
      expect(result).toBeDefined();
      expect(result.value).toBe(5);
    });

    test("should parse time units", () => {
      const result = UnitsNetParser.parse(60, "s");
      expect(result).toBeDefined();
      expect(result.value).toBe(60);
    });

    test("should parse temperature units", () => {
      const result = UnitsNetParser.parse(25, "C");
      expect(result).toBeDefined();
      expect(result.DegreesCelsius).toBe(25); // Access the Celsius value properly
    });

    test("should parse area units", () => {
      const result = UnitsNetParser.parse(100, "m^2");
      expect(result).toBeDefined();
      expect(result.value).toBe(100);
    });

    test("should parse volume units", () => {
      const result = UnitsNetParser.parse(1000, "m^3");
      expect(result).toBeDefined();
      expect(result.value).toBe(1000);
    });

    test("should parse speed units", () => {
      const result = UnitsNetParser.parse(60, "km/h");
      expect(result).toBeDefined();
      expect(result.KilometersPerHour).toBeCloseTo(60, 5); // Access the km/h value properly
    });

    test("should parse force units", () => {
      const result = UnitsNetParser.parse(100, "N");
      expect(result).toBeDefined();
      expect(result.value).toBe(100);
    });

    test("should parse pressure units", () => {
      const result = UnitsNetParser.parse(101325, "Pa");
      expect(result).toBeDefined();
      expect(result.value).toBe(101325);
    });

    test("should parse energy units", () => {
      const result = UnitsNetParser.parse(1000, "J");
      expect(result).toBeDefined();
      expect(result.value).toBe(1000);
    });

    test("should parse power units", () => {
      const result = UnitsNetParser.parse(100, "W");
      expect(result).toBeDefined();
      expect(result.value).toBe(100);
    });

    test("should parse electric units", () => {
      const current = UnitsNetParser.parse(5, "A");
      const voltage = UnitsNetParser.parse(12, "V");
      const resistance = UnitsNetParser.parse(10, "ohm");

      expect(current).toBeDefined();
      expect(voltage).toBeDefined();
      expect(resistance).toBeDefined();
    });

    test("should parse dimensionless values", () => {
      const result1 = UnitsNetParser.parse(42, "");
      const result2 = UnitsNetParser.parse(42, "1");

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    test("should throw error for unknown units", () => {
      expect(() => UnitsNetParser.parse(10, "unknown")).toThrow("Unknown unit: unknown");
    });

    test("should detect units in expressions", () => {
      expect(UnitsNetParser.containsUnits("10 m")).toBe(true);
      expect(UnitsNetParser.containsUnits("5 kg + 3 m")).toBe(true);
      expect(UnitsNetParser.containsUnits("100")).toBe(false);
      expect(UnitsNetParser.containsUnits("x + y")).toBe(false);
    });
  });

  describe("UnitsNetMathEvaluator", () => {
    test("should evaluate sqrt function", () => {
      const arg = new SmartPadQuantity(16, "m^2");
      const result = UnitsNetMathEvaluator.evaluateFunction("sqrt", [arg]);

      expect(result.value).toBe(4);
      expect(result.unit).toBe("m");
    });

    test("should evaluate pow function", () => {
      const base = new SmartPadQuantity(5, "m");
      const exponent = SmartPadQuantity.dimensionless(2);
      const result = UnitsNetMathEvaluator.evaluateFunction("pow", [base, exponent]);

      expect(result.value).toBe(25);
      expect(result.unit).toBe("m^2");
    });

    test("should evaluate abs function", () => {
      const arg = new SmartPadQuantity(-10, "m");
      const result = UnitsNetMathEvaluator.evaluateFunction("abs", [arg]);

      expect(result.value).toBe(10);
      expect(result.unit).toBe("m");
    });

    test("should evaluate trigonometric functions", () => {
      const arg = SmartPadQuantity.dimensionless(Math.PI / 2);

      const sinResult = UnitsNetMathEvaluator.evaluateFunction("sin", [arg]);
      const cosResult = UnitsNetMathEvaluator.evaluateFunction("cos", [arg]);
      const tanResult = UnitsNetMathEvaluator.evaluateFunction("tan", [arg]);

      expect(sinResult.value).toBeCloseTo(1, 5);
      expect(cosResult.value).toBeCloseTo(0, 5);
      expect(Math.abs(tanResult.value)).toBeGreaterThan(1e10); // Very large number approaching infinity
    });

    test("should evaluate inverse trigonometric functions", () => {
      const arg = SmartPadQuantity.dimensionless(0.5);

      const asinResult = UnitsNetMathEvaluator.evaluateFunction("asin", [arg]);
      const acosResult = UnitsNetMathEvaluator.evaluateFunction("acos", [arg]);
      const atanResult = UnitsNetMathEvaluator.evaluateFunction("atan", [arg]);

      expect(asinResult.value).toBeCloseTo(Math.PI / 6, 5);
      expect(acosResult.value).toBeCloseTo(Math.PI / 3, 5);
      expect(atanResult.value).toBeCloseTo(Math.atan(0.5), 5);
    });

    test("should evaluate logarithmic functions", () => {
      const arg = SmartPadQuantity.dimensionless(100);

      const logResult = UnitsNetMathEvaluator.evaluateFunction("log", [arg]);
      const lnResult = UnitsNetMathEvaluator.evaluateFunction("ln", [arg]);

      expect(logResult.value).toBeCloseTo(2, 5);
      expect(lnResult.value).toBeCloseTo(Math.log(100), 5);
    });

    test("should evaluate exp function", () => {
      const arg = SmartPadQuantity.dimensionless(1);
      const result = UnitsNetMathEvaluator.evaluateFunction("exp", [arg]);

      expect(result.value).toBeCloseTo(Math.E, 5);
    });

    test("should throw error for non-dimensionless trigonometric arguments", () => {
      const arg = new SmartPadQuantity(90, "deg");

      expect(() => UnitsNetMathEvaluator.evaluateFunction("sin", [arg])).toThrow(
        "sin requires dimensionless argument"
      );
    });

    test("should throw error for non-dimensionless logarithmic arguments", () => {
      const arg = new SmartPadQuantity(100, "m");

      expect(() => UnitsNetMathEvaluator.evaluateFunction("log", [arg])).toThrow(
        "log requires dimensionless argument"
      );
    });

    test("should throw error for non-dimensionless power exponent", () => {
      const base = new SmartPadQuantity(5, "m");
      const exponent = new SmartPadQuantity(2, "s");

      expect(() => UnitsNetMathEvaluator.evaluateFunction("pow", [base, exponent])).toThrow(
        "Power must be dimensionless"
      );
    });

    test("should throw error for unknown function", () => {
      const arg = SmartPadQuantity.dimensionless(10);

      expect(() => UnitsNetMathEvaluator.evaluateFunction("unknown", [arg])).toThrow(
        "Unknown function: unknown"
      );
    });
  });

  describe("Mathematical Constants", () => {
    test("should have correct PI value", () => {
      expect(MATHEMATICAL_CONSTANTS.PI).toBe(3.141592653589793);
    });

    test("should have correct E value", () => {
      expect(MATHEMATICAL_CONSTANTS.E).toBe(2.718281828459045);
    });
  });
});
