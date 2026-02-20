/**
 * Units Reference Tests
 * 
 * This test suite verifies that the units reference system is working correctly.
 */

import { 
  SUPPORTED_UNITS, 
  getUnitsByCategory, 
  getUnitCategories, 
  searchUnits, 
  getTotalUnitCount 
} from "../../../src/syntax/registry";

describe("Units Reference System", () => {
  describe("Units Registry", () => {
    test("should have all expected unit categories", () => {
      const categories = getUnitCategories();
      expect(categories).toContain("length");
      expect(categories).toContain("mass");
      expect(categories).toContain("time");
      expect(categories).toContain("temperature");
      expect(categories).toContain("area");
      expect(categories).toContain("volume");
      expect(categories).toContain("speed");
      expect(categories).toContain("acceleration");
      expect(categories).toContain("force");
      expect(categories).toContain("pressure");
      expect(categories).toContain("energy");
      expect(categories).toContain("power");
      expect(categories).toContain("electric");
      expect(categories).toContain("computer");
    });

    test("should have correct total unit count", () => {
      const totalCount = getTotalUnitCount();
      expect(totalCount).toBeGreaterThan(40);
      expect(totalCount).toBeLessThan(50);
    });

    test("should have length units", () => {
      const lengthUnits = getUnitsByCategory("length");
      expect(lengthUnits.length).toBe(7);
      
      const meterUnit = lengthUnits.find(unit => unit.symbol === "m");
      expect(meterUnit).toBeDefined();
      expect(meterUnit?.name).toBe("meter");
      expect(meterUnit?.aliases).toContain("meter");
      expect(meterUnit?.aliases).toContain("meters");
    });

    test("should have mass units", () => {
      const massUnits = getUnitsByCategory("mass");
      expect(massUnits.length).toBe(3);
      
      const kgUnit = massUnits.find(unit => unit.symbol === "kg");
      expect(kgUnit).toBeDefined();
      expect(kgUnit?.name).toBe("kilogram");
      expect(kgUnit?.aliases).toContain("kilogram");
      expect(kgUnit?.aliases).toContain("kilograms");
    });

    test("should have temperature units", () => {
      const tempUnits = getUnitsByCategory("temperature");
      expect(tempUnits.length).toBe(3);
      
      const celsiusUnit = tempUnits.find(unit => unit.symbol === "C");
      expect(celsiusUnit).toBeDefined();
      expect(celsiusUnit?.name).toBe("celsius");
      expect(celsiusUnit?.aliases).toContain("°C");
    });
  });

  describe("Unit Search", () => {
    test("should find units by symbol", () => {
      const results = searchUnits("m");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(unit => unit.symbol === "m")).toBe(true);
    });

    test("should find units by name", () => {
      const results = searchUnits("meter");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(unit => unit.name === "meter")).toBe(true);
    });

    test("should find units by alias", () => {
      const results = searchUnits("meters");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(unit => unit.aliases.includes("meters"))).toBe(true);
    });

    test("should find multiple units for common terms", () => {
      const results = searchUnits("pound");
      expect(results.length).toBeGreaterThan(0);
      // Should find both mass (lb) and force (lbf) units
      expect(results.some(unit => unit.symbol === "lb")).toBe(true);
      expect(results.some(unit => unit.symbol === "lbf")).toBe(true);
    });
  });

  describe("Specific Unit Categories", () => {
    test("should have comprehensive length units", () => {
      const lengthUnits = getUnitsByCategory("length");
      const symbols = lengthUnits.map(unit => unit.symbol);
      
      expect(symbols).toContain("m");   // meter
      expect(symbols).toContain("mm");  // millimeter
      expect(symbols).toContain("cm");  // centimeter
      expect(symbols).toContain("km");  // kilometer
      expect(symbols).toContain("in");  // inch
      expect(symbols).toContain("ft");  // foot
      expect(symbols).toContain("mi");  // mile
    });

    test("should have comprehensive electric units", () => {
      const electricUnits = getUnitsByCategory("electric");
      const symbols = electricUnits.map(unit => unit.symbol);
      
      expect(symbols).toContain("A");   // ampere
      expect(symbols).toContain("V");   // volt
      expect(symbols).toContain("Ω");   // ohm
    });

    test("should have comprehensive computer units", () => {
      const computerUnits = getUnitsByCategory("computer");
      const symbols = computerUnits.map(unit => unit.symbol);

      expect(symbols).toContain("bit");
      expect(symbols).toContain("byte");
      expect(symbols).toContain("KB");
      expect(symbols).toContain("MB");
      expect(symbols).toContain("GB");
      expect(symbols).toContain("TB");
    });

    test("should have comprehensive energy units", () => {
      const energyUnits = getUnitsByCategory("energy");
      const symbols = energyUnits.map(unit => unit.symbol);
      
      expect(symbols).toContain("J");    // joule
      expect(symbols).toContain("cal");  // calorie
      expect(symbols).toContain("kWh");  // kilowatt hour
    });
  });

  describe("Unit Aliases", () => {
    test("should have proper aliases for common units", () => {
      const lengthUnits = getUnitsByCategory("length");
      const meterUnit = lengthUnits.find(unit => unit.symbol === "m");
      
      expect(meterUnit?.aliases).toContain("meter");
      expect(meterUnit?.aliases).toContain("meters");
    });

    test("should handle special characters in aliases", () => {
      const tempUnits = getUnitsByCategory("temperature");
      const celsiusUnit = tempUnits.find(unit => unit.symbol === "C");
      
      expect(celsiusUnit?.aliases).toContain("°C");
      expect(celsiusUnit?.aliases).toContain("celsius");
    });

    test("should have multiple aliases for pound units", () => {
      const massUnits = getUnitsByCategory("mass");
      const poundUnit = massUnits.find(unit => unit.symbol === "lb");
      
      expect(poundUnit?.aliases).toContain("pound");
      expect(poundUnit?.aliases).toContain("pounds");
      expect(poundUnit?.aliases).toContain("lbs");
    });
  });
});
