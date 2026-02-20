/**
 * SmartPad Syntax Registry
 * 
 * This file serves as the single source of truth for all supported syntax patterns.
 * Each syntax pattern includes:
 * - The actual syntax string
 * - A description of what it does
 * - Expected output format
 * - Category for organization
 */

export interface SyntaxPattern {
  syntax: string;
  description: string;
  output: string;
  category: string;
  examples?: string[];
}

export const SYNTAX_REGISTRY: SyntaxPattern[] = [
  // ===== PERCENTAGES =====
  {
    syntax: "x% of y =>",
    description: "Calculate percentage of a value",
    output: "numeric result",
    category: "percentages",
    examples: ["30% of 500 =>", "15% of 200 =>"]
  },
  {
    syntax: "x% on y =>",
    description: "Add percentage to a value (increase)",
    output: "numeric result",
    category: "percentages",
    examples: ["20% on 80 =>", "10% on 100 =>"]
  },
  {
    syntax: "x% off y =>",
    description: "Subtract percentage from a value (decrease)",
    output: "numeric result",
    category: "percentages",
    examples: ["20% off $80 =>", "15% off 200 =>"]
  },
  {
    syntax: "x / y as % =>",
    description: "Convert ratio to percentage",
    output: "percentage with % symbol",
    category: "percentages",
    examples: ["20 / 80 as % =>", "3 / 10 as % =>"]
  },
  {
    syntax: "part of base is % =>",
    description: "Calculate percentage from part and base",
    output: "percentage with % symbol",
    category: "percentages",
    examples: ["20 of 80 is % =>", "15 of 60 is % =>"]
  },
  {
    syntax: "base + x% =>",
    description: "Add percentage to base value",
    output: "numeric result",
    category: "percentages",
    examples: ["80 + 20% =>", "100 + 15% =>"]
  },
  {
    syntax: "base - x% =>",
    description: "Subtract percentage from base value",
    output: "numeric result",
    category: "percentages",
    examples: ["500 - 10% =>", "200 - 25% =>"]
  },
  {
    syntax: "x% of y% of z =>",
    description: "Chained percentage calculations",
    output: "numeric result",
    category: "percentages",
    examples: ["20% of 50% of 1000 =>"]
  },

  // ===== VARIABLES =====
  {
    syntax: "name = value",
    description: "Simple variable assignment",
    output: "variable stored",
    category: "variables",
    examples: ["price = 10.5", "discount = 20%", "tax_rate = 0.15"]
  },
  {
    syntax: "name = expression =>",
    description: "Variable assignment with evaluation",
    output: "variable stored + result displayed",
    category: "variables",
    examples: ["total = price * 1.08 =>", "area = length * width =>"]
  },
  {
    syntax: "phrase name = value",
    description: "Variable with spaces in name",
    output: "variable stored",
    category: "variables",
    examples: ["my password = 2929", "tax rate = 0.08"]
  },

  // ===== EXPRESSIONS =====
  {
    syntax: "expression =>",
    description: "Evaluate expression and show result",
    output: "result displayed",
    category: "expressions",
    examples: ["2 + 3 =>", "sqrt(16) + 2 =>", "price * 1.08 =>"]
  },

  // ===== UNITS =====
  {
    syntax: "value unit",
    description: "Value with units",
    output: "value with units",
    category: "units",
    examples: ["100 m", "25 kg", "98.6 °F"]
  },
  {
    syntax: "value unit =>",
    description: "Unit conversion with result",
    output: "converted value with units",
    category: "units",
    examples: ["100 m =>", "25 kg =>", "98.6 °F =>"]
  },
  {
    syntax: "name = value unit",
    description: "Variable assignment with units",
    output: "variable stored with units",
    category: "units",
    examples: ["height = 180 cm", "weight = 70 kg", "temp = 37 °C"]
  },
  {
    syntax: "quantity to unit =>",
    description: "Convert quantity to different unit",
    output: "converted value in target unit",
    category: "units",
    examples: ["100 m to km =>", "25 kg to lb =>", "98.6 °F to C =>"]
  },

  // ===== CURRENCY =====
  {
    syntax: "$value",
    description: "US Dollar amount",
    output: "currency with $ symbol",
    category: "currency",
    examples: ["$100", "$25.50", "$1,000"]
  },
  {
    syntax: "€value",
    description: "Euro amount",
    output: "currency with € symbol",
    category: "currency",
    examples: ["€100", "€25.50", "€1,000"]
  },
  {
    syntax: "£value",
    description: "British Pound amount",
    output: "currency with £ symbol",
    category: "currency",
    examples: ["£100", "£25.50", "£1,000"]
  }
];

// ===== SUPPORTED UNITS REFERENCE =====
export const SUPPORTED_UNITS = {
  length: {
    name: "Length",
    units: [
      { symbol: "m", name: "meter", aliases: ["meter", "meters"] },
      { symbol: "mm", name: "millimeter", aliases: ["millimeter", "millimeters"] },
      { symbol: "cm", name: "centimeter", aliases: ["centimeter", "centimeters"] },
      { symbol: "km", name: "kilometer", aliases: ["kilometer", "kilometers"] },
      { symbol: "in", name: "inch", aliases: ["inch", "inches"] },
      { symbol: "ft", name: "foot", aliases: ["foot", "feet"] },
      { symbol: "mi", name: "mile", aliases: ["mile", "miles"] }
    ]
  },
  mass: {
    name: "Mass",
    units: [
      { symbol: "kg", name: "kilogram", aliases: ["kilogram", "kilograms"] },
      { symbol: "g", name: "gram", aliases: ["gram", "grams"] },
      { symbol: "lb", name: "pound", aliases: ["pound", "pounds", "lbs"] }
    ]
  },
  time: {
    name: "Time",
    units: [
      { symbol: "s", name: "second", aliases: ["second", "seconds"] },
      { symbol: "min", name: "minute", aliases: ["minute", "minutes"] },
      { symbol: "h", name: "hour", aliases: ["hour", "hours"] }
    ]
  },
  temperature: {
    name: "Temperature",
    units: [
      { symbol: "K", name: "kelvin", aliases: ["kelvin", "kelvins"] },
      { symbol: "C", name: "celsius", aliases: ["celsius", "°C"] },
      { symbol: "F", name: "fahrenheit", aliases: ["fahrenheit", "°F"] }
    ]
  },
  area: {
    name: "Area",
    units: [
      { symbol: "m^2", name: "square meter", aliases: ["sqm", "square meter", "square meters"] },
      { symbol: "ft^2", name: "square foot", aliases: ["sqft", "square foot", "square feet"] }
    ]
  },
  volume: {
    name: "Volume",
    units: [
      { symbol: "m^3", name: "cubic meter", aliases: ["cubic meter", "cubic meters"] },
      { symbol: "ft^3", name: "cubic foot", aliases: ["cubic foot", "cubic feet"] }
    ]
  },
  speed: {
    name: "Speed",
    units: [
      { symbol: "m/s", name: "meters per second", aliases: ["meters per second"] },
      { symbol: "km/h", name: "kilometers per hour", aliases: ["kph", "kilometers per hour"] },
      { symbol: "mph", name: "miles per hour", aliases: ["miles per hour"] }
    ]
  },
  acceleration: {
    name: "Acceleration",
    units: [
      { symbol: "m/s^2", name: "meters per second squared", aliases: [] }
    ]
  },
  force: {
    name: "Force",
    units: [
      { symbol: "N", name: "newton", aliases: ["newton", "newtons"] },
      { symbol: "lbf", name: "pound force", aliases: ["pound force", "pounds force"] }
    ]
  },
  pressure: {
    name: "Pressure",
    units: [
      { symbol: "Pa", name: "pascal", aliases: ["pascal", "pascals"] },
      { symbol: "kPa", name: "kilopascal", aliases: ["kilopascal", "kilopascals"] },
      { symbol: "bar", name: "bar", aliases: ["bar"] },
      { symbol: "psi", name: "pounds per square inch", aliases: ["pounds per square inch"] }
    ]
  },
  energy: {
    name: "Energy",
    units: [
      { symbol: "J", name: "joule", aliases: ["joule", "joules"] },
      { symbol: "cal", name: "calorie", aliases: ["calorie", "calories"] },
      { symbol: "kWh", name: "kilowatt hour", aliases: ["kilowatt hour", "kilowatt hours"] }
    ]
  },
  power: {
    name: "Power",
    units: [
      { symbol: "W", name: "watt", aliases: ["watt", "watts"] },
      { symbol: "kW", name: "kilowatt", aliases: ["kilowatt", "kilowatts"] }
    ]
  },
  electric: {
    name: "Electric",
    units: [
      { symbol: "A", name: "ampere", aliases: ["ampere", "amperes"] },
      { symbol: "V", name: "volt", aliases: ["volt", "volts"] },
      { symbol: "Ω", name: "ohm", aliases: ["ohm", "ohms"] }
    ]
  },
  computer: {
    name: "Computer",
    units: [
      { symbol: "bit", name: "bit", aliases: ["bits"] },
      { symbol: "B", name: "byte", aliases: ["byte", "bytes"] },
      { symbol: "KB", name: "kilobyte", aliases: ["kB", "kilobyte", "kilobytes"] },
      { symbol: "MB", name: "megabyte", aliases: ["megabyte", "megabytes"] },
      { symbol: "GB", name: "gigabyte", aliases: ["gigabyte", "gigabytes"] },
      { symbol: "TB", name: "terabyte", aliases: ["terabyte", "terabytes"] },
      { symbol: "KiB", name: "kibibyte", aliases: ["kibibyte", "kibibytes"] },
      { symbol: "MiB", name: "mebibyte", aliases: ["mebibyte", "mebibytes"] },
      { symbol: "GiB", name: "gibibyte", aliases: ["gibibyte", "gibibytes"] },
      { symbol: "TiB", name: "tebibyte", aliases: ["tebibyte", "tebibytes"] }
    ]
  },
  informationRate: {
    name: "Information Rate",
    units: [
      { symbol: "bit/s", name: "bits per second", aliases: ["bps"] },
      { symbol: "kbit/s", name: "kilobits per second", aliases: ["kbps", "Kb/s"] },
      { symbol: "Mbit/s", name: "megabits per second", aliases: ["Mbps", "Mb/s"] },
      { symbol: "Gbit/s", name: "gigabits per second", aliases: ["Gbps", "Gb/s"] },
      { symbol: "Tbit/s", name: "terabits per second", aliases: ["Tbps", "Tb/s"] },
      { symbol: "B/s", name: "bytes per second", aliases: ["Bps"] },
      { symbol: "KB/s", name: "kilobytes per second", aliases: ["KBps"] },
      { symbol: "MB/s", name: "megabytes per second", aliases: ["MBps"] },
      { symbol: "GB/s", name: "gigabytes per second", aliases: ["GBps"] },
      { symbol: "TB/s", name: "terabytes per second", aliases: ["TBps"] }
    ]
  }
};

/**
 * Get all syntax patterns for a specific category
 */
export function getSyntaxByCategory(category: string): SyntaxPattern[] {
  return SYNTAX_REGISTRY.filter(pattern => pattern.category === category);
}

/**
 * Get all available categories
 */
export function getCategories(): string[] {
  return [...new Set(SYNTAX_REGISTRY.map(pattern => pattern.category))];
}

/**
 * Search syntax patterns by keyword
 */
export function searchSyntax(keyword: string): SyntaxPattern[] {
  const lowerKeyword = keyword.toLowerCase();
  return SYNTAX_REGISTRY.filter(pattern => 
    pattern.syntax.toLowerCase().includes(lowerKeyword) ||
    pattern.description.toLowerCase().includes(lowerKeyword) ||
    pattern.category.toLowerCase().includes(lowerKeyword)
  );
}

/**
 * Get syntax patterns that match a specific pattern
 */
export function getSyntaxByPattern(pattern: string): SyntaxPattern[] {
  return SYNTAX_REGISTRY.filter(syntax => 
    syntax.syntax.includes(pattern) ||
    syntax.examples?.some(example => example.includes(pattern))
  );
}

/**
 * Get all units in a specific category
 */
export function getUnitsByCategory(category: string): any[] {
  const unitCategory = (SUPPORTED_UNITS as any)[category];
  return unitCategory ? unitCategory.units : [];
}

/**
 * Get all unit categories
 */
export function getUnitCategories(): string[] {
  return Object.keys(SUPPORTED_UNITS);
}

/**
 * Search units by symbol, name, or alias
 */
export function searchUnits(query: string): any[] {
  const results: any[] = [];
  const lowerQuery = query.toLowerCase();
  
  Object.values(SUPPORTED_UNITS).forEach((category: any) => {
    category.units.forEach((unit: any) => {
      if (
        unit.symbol.toLowerCase().includes(lowerQuery) ||
        unit.name.toLowerCase().includes(lowerQuery) ||
        unit.aliases.some((alias: string) => alias.toLowerCase().includes(lowerQuery))
      ) {
        results.push({ ...unit, category: category.name });
      }
    });
  });
  
  return results;
}

/**
 * Get total count of supported units
 */
export function getTotalUnitCount(): number {
  let count = 0;
  Object.values(SUPPORTED_UNITS).forEach((category: any) => {
    count += category.units.length;
  });
  return count;
}
