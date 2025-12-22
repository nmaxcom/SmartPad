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
      // Handle parenthesized expressions
      result = result.replace(
        /(\d+(?:\.\d+)?)%\s*of\s+(\([^)]+\))/g,
        '(($1/100) * $2)'
      );

      // Handle simple "X% of Y" (rightmost first for chaining)
      const matches = [...result.matchAll(/(\d+(?:\.\d+)?)%\s*of\s+(\S+)/g)];
      if (matches.length > 0) {
        const lastMatch = matches[matches.length - 1];
        const replacement = `((${lastMatch[1]}/100) * ${lastMatch[2]})`;
        const beforeMatch = result.substring(0, lastMatch.index!);
        const afterMatch = result.substring(lastMatch.index! + lastMatch[0].length);
        result = beforeMatch + replacement + afterMatch;
      }
    }

    return result;
  }
}
