# SmartPad Syntax Reference System

This directory contains the syntax reference system for SmartPad - a comprehensive way to document, test, and explore all supported syntax patterns.

## 🎯 What This Solves

- **Forgetting syntax**: All supported patterns are documented in one place
- **Documentation drift**: Tests serve as living documentation that's always up-to-date
- **Syntax discovery**: Easy to find what operations are available
- **Development reference**: Quick lookup during development

## 📁 Files

- `registry.ts` - Central syntax registry with all patterns
- `SyntaxExplorer.tsx` - Interactive React component for exploring syntax
- `README.md` - This file

## 🚀 Quick Start

### 1. View All Syntax

```bash
# Generate documentation
npm run generate-syntax-docs

# View generated docs
open docs/SYNTAX_REFERENCE.md
open docs/SYNTAX_CHEATSHEET.md
```

### 2. Run Syntax Tests

```bash
# Test all syntax patterns
npm test -- tests/syntax-reference/

# Test specific category
npm test -- tests/syntax-reference/percentages.spec.ts

# Test with pattern matching
npm test -- --testNamePattern="x% of y"
```

### 3. Use Interactive Explorer

Add the `SyntaxExplorer` component to your app:

```tsx
import { SyntaxExplorer } from './components/SyntaxExplorer';

// In your app
<SyntaxExplorer />
```

## 📝 Adding New Syntax

### 1. Update the Registry

Add your pattern to `registry.ts`:

```typescript
{
  syntax: "new pattern =>",
  description: "What this pattern does",
  output: "Expected output format",
  category: "category_name",
  examples: ["example1 =>", "example2 =>"]
}
```

### 2. Add Tests

Create or update tests in `tests/syntax-reference/`:

```typescript
test("new pattern - description", () => {
  const node = parseLine("example =>", 1);
  const result = defaultRegistry.evaluate(node, context);
  
  expect(result?.type).toBe("mathResult");
  expect(result.displayText).toMatch(/expected result/);
});
```

### 3. Regenerate Documentation

```bash
npm run generate-syntax-docs
```

## 🔍 Finding Syntax

### By Category

```typescript
import { getSyntaxByCategory } from './syntax/registry';

const percentagePatterns = getSyntaxByCategory("percentages");
```

### By Search

```typescript
import { searchSyntax } from './syntax/registry';

const matchingPatterns = searchSyntax("percentage");
```

### By Pattern

```typescript
import { getSyntaxByPattern } from './syntax/registry';

const relatedPatterns = getSyntaxByPattern("x% of y");
```

## 🧪 Testing Philosophy

- **Tests are documentation**: Every test demonstrates working syntax
- **Living examples**: Tests automatically verify syntax works
- **Coverage tracking**: Tests ensure documented syntax is implemented
- **Regression prevention**: Tests catch when syntax breaks

## 📊 Current Categories

- **percentages**: 8 patterns (x% of y, x% on y, x% off y, etc.)
- **variables**: 3 patterns (name = value, name = expression =>, etc.)
- **expressions**: 1 pattern (expression =>)
- **units**: 3 patterns (value unit, value unit =>, etc.)
- **currency**: 3 patterns ($value, €value, £value)

## 🎨 Customization

### Adding New Categories

1. Add patterns to `registry.ts` with your new category
2. Update `SyntaxExplorer.tsx` to handle the new category
3. Add corresponding test files in `tests/syntax-reference/`

### Styling the Explorer

Modify `SyntaxExplorer.tsx` to match your app's design system.

## 🔗 Integration

### With Existing Tests

Your existing tests can now reference the registry:

```typescript
import { getSyntaxByCategory } from './syntax/registry';

describe("Percentage Operations", () => {
  const patterns = getSyntaxByCategory("percentages");
  
  patterns.forEach(pattern => {
    test(`${pattern.syntax} - ${pattern.description}`, () => {
      // Test the pattern
    });
  });
});
```

### With Documentation

The registry can be used to generate:
- API documentation
- User guides
- Help tooltips
- Command palettes

## 🚨 Troubleshooting

### Tests Failing

1. Check if syntax is properly documented in registry
2. Verify the syntax actually works in the app
3. Update tests to match actual behavior

### Documentation Out of Sync

1. Run `npm run generate-syntax-docs`
2. Check if all patterns have tests
3. Ensure registry matches implementation

### Component Not Rendering

1. Check import paths
2. Verify registry is properly exported
3. Check browser console for errors

## 📈 Future Enhancements

- **Syntax validation**: Ensure documented syntax actually works
- **Usage analytics**: Track which syntax patterns are used most
- **Auto-completion**: Use registry for intelligent suggestions
- **Error messages**: Reference registry for helpful error hints
- **Tutorial generation**: Create interactive tutorials from patterns

---

**Remember**: This system only works if you keep it updated! Every time you add new syntax, update the registry and add tests.
