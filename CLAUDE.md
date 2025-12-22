# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Development Server
```bash
npm run dev
```
Starts the Vite development server on port 3000. The server checks if port is available first via `scripts/npm_run_dev_server_check.js`.

### Testing Commands
```bash
# Run all unit tests (Jest)
npm run test:unit

# Run BDD tests (Cucumber)
npm run test:bdd

# Run full E2E tests (Playwright)
npm run test:e2e

# Run visual regression tests
npm run test:visual

# Update visual test snapshots
npm run test:visual:update

# Run complete test suite
npm run test:full
```

### Build Commands
```bash
# Production build
npm run build

# Preview production build
npm run preview
```

### Documentation
```bash
# Generate syntax documentation
npm run generate-syntax-docs
```

## Architecture Overview

SmartPad is a React-based mathematical text editor that combines plain text editing with real-time calculation and evaluation. The architecture follows a reactive, extensible design with clear separation of concerns.

### Core Architecture Principles
- **Living Document**: User text is immutable; all results are rendered as decorations
- **Reactive System**: Variables and expressions update automatically via dependency graph
- **Extensible Evaluation**: Plugin-based evaluator system for different expression types

### Key Directories Structure

**`src/components/`** - React components and UI logic
- `Editor.tsx` - Main TipTap-based editor component
- `Layout/` - App container and header components
- `VariablePanel/` - Variable display and save/load functionality
- Extension files (`*Extension.ts`) - TipTap editor extensions

**`src/eval/`** - Expression evaluation system
- `registry.ts` - Central evaluator registry with priority system
- Individual evaluators: `variableEvaluator.ts`, `expressionEvaluator.ts`, `percentageEvaluator.ts`, etc.
- `renderNodes.ts` - Data structures for UI rendering

**`src/parsing/`** - Text parsing and AST generation
- `astParser.ts` - Converts text lines to Abstract Syntax Tree nodes
- `ast.ts` - AST node type definitions
- Various specialized parsers for expressions, variables, etc.

**`src/state/`** - State management
- `variableStore.ts` - Reactive variable storage
- `dependencyGraph.ts` - Tracks variable dependencies for reactive updates
- React Context providers for app-wide state

**`src/units/`** - Units and dimensional analysis system
- `unitsnetAdapter.ts` - Integration with unitsnet-js library
- `quantity.ts` - Quantity type definitions
- Various evaluators for unit-aware calculations

### Evaluation Priority System
The evaluator registry processes expressions in this order:
1. `PercentageExpressionEvaluator` - Percentage calculations (e.g., "50% of 100")
2. `UnitsNetExpressionEvaluator` - Unit-aware expressions (primary units system)
3. `VariableEvaluator` - Variable assignments without units
4. `ExpressionEvaluator` - Standard mathematical expressions
5. `ErrorEvaluator` - Error handling
6. `PlainTextEvaluator` - Fallback for plain text

### Key Technologies
- **Frontend**: React 18 + TypeScript
- **Editor**: TipTap (ProseMirror-based) with custom extensions
- **Units**: unitsnet-js for dimensional analysis
- **Testing**: Jest (unit), Playwright (E2E), Cucumber (BDD)
- **Build**: Vite

## Testing Approach

### Unit Tests (`tests/unit/`)
- Jest with jsdom environment
- Focus on core logic: parsing, evaluation, state management
- Run with `npm run test:unit`

### E2E Tests (`tests/e2e/`)
- Playwright with Chromium
- Tests user workflows and UI interactions
- Visual regression testing for UI consistency
- Run with `npm run test:e2e`

### BDD Tests (`tests/features/`)
- Cucumber for behavior-driven development
- Human-readable feature specifications
- Run with `npm run test:bdd`

## Working with the Codebase

### Adding New Evaluators
1. Create evaluator in `src/eval/` implementing `NodeEvaluator` interface
2. Register in `src/eval/index.ts` at appropriate priority level
3. Add corresponding AST node types if needed in `src/parsing/ast.ts`

### Syntax Extensions
- Syntax definitions live in `src/syntax/registry.ts`
- Generate documentation with `npm run generate-syntax-docs`
- Update `docs/syntax-registry.json` when adding new syntax

### State Management
- Variables use reactive store pattern in `src/state/variableStore.ts`
- Dependency tracking handles automatic recalculation
- Use provided React contexts for component access

### Editor Extensions
- TipTap extensions in `src/components/*Extension.ts`
- Follow existing patterns for semantic highlighting, result decoration, etc.
- Extensions handle UI concerns; evaluation logic stays in `src/eval/`

## Important Files for Understanding
- `src/App.tsx` - Main application structure and provider hierarchy
- `src/eval/index.ts` - Evaluation system setup and priorities
- `src/parsing/astParser.ts` - How text becomes structured data
- `docs/ARCHITECTURE.md` - Detailed technical architecture
- `docs/Spec.md` - Complete product specification

## Development Notes
- Port 3000 is required for development (configured in both Vite and Playwright)
- Visual tests may need headed mode for accurate screenshots (see `playwright.config.ts`)
- The system emits `evaluationDone` and `uiRenderComplete` events for test synchronization
- Use `data-result` attributes on result widgets for test automation