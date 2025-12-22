#!/usr/bin/env tsx

/**
 * Generate Syntax Documentation Script
 * 
 * This script automatically generates markdown documentation from the syntax registry.
 * Run with: npm run generate-syntax-docs
 */

import { SYNTAX_REGISTRY, getCategories, getSyntaxByCategory, SUPPORTED_UNITS, getUnitCategories, getTotalUnitCount } from "../src/syntax/registry";
import * as fs from "fs";
import * as path from "path";

function generateMarkdown(): string {
  let markdown = `# SmartPad Syntax Reference

This document is automatically generated from the syntax registry. 
It serves as a comprehensive reference for all supported syntax patterns in SmartPad.

## Table of Contents

`;

  // Generate table of contents
  const categories = getCategories();
  categories.forEach(category => {
    const categoryPatterns = getSyntaxByCategory(category);
    markdown += `- [${category.charAt(0).toUpperCase() + category.slice(1)}](#${category}) (${categoryPatterns.length} patterns)\n`;
  });

  markdown += `\n---\n\n`;

  // Generate content for each category
  categories.forEach(category => {
    const categoryPatterns = getSyntaxByCategory(category);
    
    markdown += `## ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
    markdown += `${categoryPatterns.length} syntax pattern${categoryPatterns.length !== 1 ? 's' : ''} available.\n\n`;

    categoryPatterns.forEach((pattern, index) => {
      markdown += `### ${index + 1}. \`${pattern.syntax}\`\n\n`;
      markdown += `**Description:** ${pattern.description}\n\n`;
      markdown += `**Output:** ${pattern.output}\n\n`;
      
      if (pattern.examples && pattern.examples.length > 0) {
        markdown += `**Examples:**\n\n`;
        pattern.examples.forEach(example => {
          markdown += `\`\`\`\n${example}\n\`\`\`\n\n`;
        });
      }
      
      markdown += `---\n\n`;
    });
  });

  // Add usage section
  markdown += `## Usage Examples

### Basic Percentage Calculations
\`\`\`
30% of 500 =>     # Calculate 30% of 500
20% on 80 =>      # Add 20% to 80
20% off $80 =>    # Subtract 20% from $80
\`\`\`

### Variable Assignments
\`\`\`
price = 10.5                    # Simple assignment
discount = 20%                  # Percentage assignment
total = price * 1.08 =>         # Assignment with evaluation
my password = 2929              # Phrase-based variable name
\`\`\`

### Unit Operations
\`\`\`
100 m =>                        # Unit conversion
height = 180 cm                 # Variable with units
weight = 70 kg                  # Variable with units
\`\`\`

### Currency Operations
\`\`\`
$100 + 20% =>                   # Currency with percentage
€200 - 15% =>                   # Euro with percentage
£50 * 1.1 =>                    # Pound calculations
\`\`\`

## Development Notes

- This documentation is automatically generated from the syntax registry
- All syntax patterns are tested to ensure they work correctly
- To add new syntax, update the registry and add corresponding tests
- Run tests to verify syntax patterns: \`npm test -- tests/syntax-reference/\`

## Testing

To test all syntax patterns:

\`\`\`bash
# Test all syntax reference tests
npm test -- tests/syntax-reference/

# Test specific category
npm test -- tests/syntax-reference/percentages.spec.ts

# Test with pattern matching
npm test -- --testNamePattern="x% of y"
\`\`\`

---

*Last generated: ${new Date().toISOString()}*
`;

  return markdown;
}

function generateJson(): string {
  return JSON.stringify(SYNTAX_REGISTRY, null, 2);
}

function generateUnitsReference(): string {
  let markdown = `# SmartPad Units Reference

Complete reference of all supported units in SmartPad.

## Summary

Total supported units: **${getTotalUnitCount()}**
Categories: **${getUnitCategories().length}**

`;

  // Generate content for each unit category
  getUnitCategories().forEach(category => {
    const units = (SUPPORTED_UNITS as any)[category].units;
    const categoryName = (SUPPORTED_UNITS as any)[category].name;
    
    markdown += `## ${categoryName}\n\n`;
    markdown += `${units.length} unit${units.length !== 1 ? 's' : ''} available.\n\n`;
    
    markdown += `| Symbol | Name | Aliases |\n`;
    markdown += `|--------|------|--------|\n`;
    
    units.forEach((unit: any) => {
      const aliases = unit.aliases.join(", ");
      markdown += `| \`${unit.symbol}\` | ${unit.name} | ${aliases} |\n`;
    });
    
    markdown += `\n`;
  });

  // Add usage examples
  markdown += `## Usage Examples

### Basic Unit Operations
\`\`\`
100 m =>                    # Display with units
25 kg =>                    # Display with units
98.6 °F =>                  # Temperature with units
\`\`\`

### Unit Conversions
\`\`\`
100 m to km =>              # Convert meters to kilometers
25 kg to lb =>              # Convert kilograms to pounds
98.6 °F to C =>             # Convert Fahrenheit to Celsius
\`\`\`

### Variable Assignment with Units
\`\`\`
height = 180 cm             # Store height with units
weight = 70 kg              # Store weight with units
temp = 37 °C                # Store temperature with units
\`\`\`

### Mathematical Operations
\`\`\`
10 m + 50 cm =>             # Add compatible units
100 m / 10 s =>             # Divide to get speed
2 kg * 9.8 m/s^2 =>         # Calculate force
\`\`\`

## Unit Compatibility Rules

- **Addition/Subtraction**: Units must have identical dimensions
- **Multiplication/Division**: Dimensions combine (e.g., Length/Time = Speed)
- **Powers**: Raise both value and dimension
- **Functions**: Only meaningful operations (e.g., sqrt(m^2) = m)

## Temperature Handling

- **Temperature + Difference**: Results in temperature
- **Temperature - Temperature**: Results in temperature difference
- **Conversions**: Use \`to\` for explicit conversions

Examples:
\`\`\`
100 C + 50 K =>             # 150 C (temperature + difference)
100 C - 50 C =>             # 50 K (difference)
25 C to K =>                # 298.15 K (conversion)
\`\`\`

---

*Last generated: ${new Date().toISOString()}*
`;

  return markdown;
}

function generateCheatSheet(): string {
  let markdown = `# SmartPad Syntax Cheat Sheet

Quick reference for common operations.

## Percentages

| Operation | Syntax | Example | Result |
|-----------|--------|---------|---------|
`;

  const percentagePatterns = getSyntaxByCategory("percentages");
  percentagePatterns.forEach(pattern => {
    if (pattern.examples && pattern.examples[0]) {
      const example = pattern.examples[0];
      markdown += `| ${pattern.description} | \`${pattern.syntax}\` | \`${example}\` | ${pattern.output} |\n`;
    }
  });

  markdown += `\n## Variables\n\n`;
  markdown += `| Operation | Syntax | Example |\n`;
  markdown += `|-----------|--------|---------|\n`;

  const variablePatterns = getSyntaxByCategory("variables");
  variablePatterns.forEach(pattern => {
    if (pattern.examples && pattern.examples[0]) {
      const example = pattern.examples[0];
      markdown += `| ${pattern.description} | \`${pattern.syntax}\` | \`${example}\` |\n`;
    }
  });

  markdown += `\n## Units\n\n`;
  markdown += `| Operation | Syntax | Example |\n`;
  markdown += `|-----------|--------|---------|\n`;

  const unitPatterns = getSyntaxByCategory("units");
  unitPatterns.forEach(pattern => {
    if (pattern.examples && pattern.examples[0]) {
      const example = pattern.examples[0];
      markdown += `| ${pattern.description} | \`${pattern.syntax}\` | \`${example}\` |\n`;
    }
  });

  // Add units summary
  markdown += `\n### Quick Units Reference\n\n`;
  markdown += `**Length**: m, mm, cm, km, in, ft, mi\n`;
  markdown += `**Mass**: kg, g, lb\n`;
  markdown += `**Time**: s, min, h\n`;
  markdown += `**Temperature**: K, C, F\n`;
  markdown += `**Area**: m^2, ft^2\n`;
  markdown += `**Volume**: m^3, ft^3\n`;
  markdown += `**Speed**: m/s, km/h, mph\n`;
  markdown += `**Acceleration**: m/s^2\n`;
  markdown += `**Force**: N, lbf\n`;
  markdown += `**Pressure**: Pa, kPa, bar, psi\n`;
  markdown += `**Energy**: J, cal, kWh\n`;
  markdown += `**Power**: W, kW\n`;
  markdown += `**Electric**: A, V, Ω\n`;
  markdown += `\n*See UNITS_REFERENCE.md for complete list*\n`;

  return markdown;
}

// Main execution
function main() {
  const docsDir = path.join(__dirname, "../docs");
  
  // Ensure docs directory exists
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  // Generate full documentation
  const fullDocs = generateMarkdown();
  fs.writeFileSync(path.join(docsDir, "SYNTAX_REFERENCE.md"), fullDocs);
  console.log("✅ Generated full syntax reference: docs/SYNTAX_REFERENCE.md");

  // Generate cheat sheet
  const cheatSheet = generateCheatSheet();
  fs.writeFileSync(path.join(docsDir, "SYNTAX_CHEATSHEET.md"), cheatSheet);
  console.log("✅ Generated syntax cheat sheet: docs/SYNTAX_CHEATSHEET.md");

  // Generate units reference
  const unitsReference = generateUnitsReference();
  fs.writeFileSync(path.join(docsDir, "UNITS_REFERENCE.md"), unitsReference);
  console.log("✅ Generated units reference: docs/UNITS_REFERENCE.md");

  // Generate JSON for programmatic use
  const jsonDocs = generateJson();
  fs.writeFileSync(path.join(docsDir, "syntax-registry.json"), jsonDocs);
  console.log("✅ Generated JSON registry: docs/syntax-registry.json");

  // Generate summary
  const categories = getCategories();
  const totalPatterns = SYNTAX_REGISTRY.length;
  
  console.log(`\n📊 Summary:`);
  console.log(`Total syntax patterns: ${totalPatterns}`);
  console.log(`Categories: ${categories.join(", ")}`);
  
  categories.forEach(category => {
    const patterns = getSyntaxByCategory(category);
    console.log(`  ${category}: ${patterns.length} patterns`);
  });

  console.log(`\n🎯 Next steps:`);
  console.log(`1. Review generated docs in docs/ directory`);
  console.log(`2. Add the SyntaxExplorer component to your app for interactive reference`);
  console.log(`3. Run tests to verify all syntax works: npm test -- tests/syntax-reference/`);
}

if (require.main === module) {
  main();
}
