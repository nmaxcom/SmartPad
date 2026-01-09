const AGGREGATOR_REGEX = /\b(sum|total|avg|mean|median|count|stddev|min|max|range)\s*\(/i;
export const isAggregatorExpression = (expression: string): boolean => AGGREGATOR_REGEX.test(expression);
