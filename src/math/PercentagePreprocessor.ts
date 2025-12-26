/**
 * SmartPad Percentage Syntax Preprocessor
 * 
 * @deprecated This regex-based preprocessor is deprecated in favor of the AST-based
 * semantic lowering approach. Use src/lowering/percentageLowerer.ts instead, which
 * operates on typed AST nodes rather than raw strings. This file will be removed
 * after the lowerer is fully implemented.
 * 
 * See MATHJS_INTEGRATION_PLAN.md for details on the AST-first, semantic lowering strategy.
 */
/** @deprecated Use percentageLowerer instead */
export class PercentagePreprocessor {
  /**
   * Process an expression, converting percentage patterns to Math.js syntax
   * @deprecated Use percentageLowerer.lower() instead
   */
  static process(expression: string): string {
    let result = expression;

    // Keep processing until no more changes occur
    let lastResult = '';
    while (result !== lastResult) {
      lastResult = result;

      // Process "X% off Y" first -> Y - ((X/100) * Y)
      // Special-case chained "X% on Y% off Z" to preserve expected nesting
      result = result.replace(
        /(\d+(?:\.\d+)?)%\s*on\s+(\d+(?:\.\d+)?)%\s*off\s+(\S+)/g,
        '(($3) - (($2/100) * ($3))) + (($1/100) * (($3) - (($2/100) * ($3))))'
      );

      // Process "X% off Y" -> Y - ((X/100) * Y)
      result = result.replace(
        /(\d+(?:\.\d+)?)%\s*off\s+(\([^)]+\)|\S+)/g,
        '$2 - (($1/100) * $2)'
      );

      // Process "X% on Y" -> Y + ((X/100) * Y) 
      result = result.replace(
        /(\d+(?:\.\d+)?)%\s*on\s+(\([^)]+\)|\S+)/g,
        '$2 + (($1/100) * $2)'
      );

      // Process "X% of Y" -> ((X/100) * Y)
      // Replace the rightmost percent-of occurrence to support chaining.
      const percentOfMatches = [...result.matchAll(/(\d+(?:\.\d+)?)%\s*of\s+/g)];
      if (percentOfMatches.length > 0) {
        const lastMatch = percentOfMatches[percentOfMatches.length - 1];
        const beforeMatch = result.substring(0, lastMatch.index!);
        const rightExpr = result.substring(lastMatch.index! + lastMatch[0].length).trim();
        const replacement = `((${lastMatch[1]}/100) * ${rightExpr})`;
        result = beforeMatch + replacement;
      }
    }

    return result;
  }
}
