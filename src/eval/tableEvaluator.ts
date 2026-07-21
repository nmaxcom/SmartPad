import {
  ASTNode,
  ExpressionNode,
  isExpressionNode,
  isTableColumnAssignmentNode,
  isTableDeclarationNode,
  isTableRowNode,
} from "../parsing/ast";
import { parseLine } from "../parsing/astParser";
import { ReactiveVariableStore } from "../state/variableStore";
import { Variable } from "../state/types";
import {
  ErrorValue,
  ListValue,
  NumberValue,
  SemanticParsers,
  SemanticValue,
  SemanticValueTypes,
  TableColumn,
  TableValue,
  TextValue,
  createListResult,
} from "../types";
import { defaultRegistry } from "./registry";
import { EvaluationContext, NodeEvaluator } from "./registry";
import { ErrorRenderNode, MathResultRenderNode, RenderNode } from "./renderNodes";

interface ColumnReference {
  token: string;
  table: TableValue;
  column: string;
  values: SemanticValue[];
}

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const displayOptions = (context: EvaluationContext) => ({
  precision: context.decimalPlaces,
  scientificUpperThreshold: context.scientificUpperThreshold,
  scientificLowerThreshold: context.scientificLowerThreshold,
  scientificTrimTrailingZeros: context.scientificTrimTrailingZeros,
  dateFormat: context.dateDisplayFormat,
  dateLocale: context.dateLocale,
  groupThousands: context.groupThousands,
});

const createError = (node: ASTNode, message: string): ErrorRenderNode => ({
  type: "error",
  line: node.line,
  originalRaw: node.raw,
  error: message,
  errorType: "semantic",
  displayText: `⚠️ ${message}`,
  livePreview: !node.raw.includes("=>"),
});

const cloneVariableStore = (context: EvaluationContext): ReactiveVariableStore => {
  const store = new ReactiveVariableStore();
  context.variableContext.forEach((variable) => store.setVariableWithMetadata(variable));
  return store;
};

const parseRenderedValue = (renderNode: RenderNode | null): SemanticValue | ErrorValue => {
  if (!renderNode) return ErrorValue.semanticError("Table expression produced no result");
  if (renderNode.type === "error") return ErrorValue.semanticError(renderNode.error);
  const raw = (renderNode as any).result;
  const parsed = SemanticParsers.parse(String(raw ?? "").trim());
  return parsed || ErrorValue.semanticError(`Cannot use "${String(raw ?? "")}" as a table value`);
};

const tableValuesInContext = (context: EvaluationContext): TableValue[] => {
  const tables: TableValue[] = [];
  context.variableContext.forEach((variable) => {
    if (variable.value instanceof TableValue) tables.push(variable.value);
  });
  return tables;
};

const collectColumnReferences = (
  expression: string,
  context: EvaluationContext
): ColumnReference[] => {
  const references: ColumnReference[] = [];
  for (const table of tableValuesInContext(context)) {
    for (const column of table.getColumns()) {
      const token = `${table.getName()}.${column.name}`;
      const pattern = new RegExp(`(^|[^A-Za-z0-9_.])${escapeRegExp(token)}(?=$|[^A-Za-z0-9_.])`);
      if (!pattern.test(expression)) continue;
      references.push({ token, table, column: column.name, values: column.values });
    }
  }
  return references.sort((left, right) => right.token.length - left.token.length);
};

const replaceColumnTokens = (
  expression: string,
  replacements: Map<string, string>
): string => {
  let output = expression;
  Array.from(replacements.entries())
    .sort(([left], [right]) => right.length - left.length)
    .forEach(([token, replacement]) => {
      output = output.replace(new RegExp(escapeRegExp(token), "g"), replacement);
    });
  return output;
};

const evaluateScalar = (
  expression: string,
  context: EvaluationContext,
  variables: Map<string, SemanticValue>
): SemanticValue | ErrorValue => {
  const variableContext = new Map<string, Variable>(context.variableContext);
  const variableStore = cloneVariableStore(context);
  const now = new Date();
  variables.forEach((value, name) => {
    const variable: Variable = {
      name,
      value,
      rawValue: value.toString(displayOptions(context)),
      createdAt: now,
      updatedAt: now,
    };
    variableContext.set(name, variable);
    variableStore.setVariableWithMetadata(variable);
  });
  const node = parseLine(`${expression} =>`, context.lineNumber);
  const renderNode = defaultRegistry.evaluate(node, {
    ...context,
    variableContext,
    variableStore,
  });
  return parseRenderedValue(renderNode);
};

const evaluateColumnExpression = (
  expression: string,
  context: EvaluationContext
): SemanticValue | ErrorValue => {
  const refs = collectColumnReferences(expression, context);
  if (refs.length === 0) {
    return ErrorValue.semanticError("Derived table columns must reference at least one table column");
  }
  const lengths = new Set(refs.map((reference) => reference.values.length));
  if (lengths.size !== 1) {
    return ErrorValue.semanticError("Table columns in one expression must have the same number of rows");
  }

  const directReference = refs.find((reference) => expression.trim() === reference.token);
  if (directReference) {
    return ListValue.fromItems(directReference.values.map((value) => value.clone()));
  }

  const directCount = expression.trim().match(/^count\s*\(\s*(.+?)\s*\)$/i);
  if (directCount) {
    const countedColumn = refs.find((reference) => directCount[1] === reference.token);
    if (countedColumn) {
      return NumberValue.from(countedColumn.values.length);
    }
  }

  const aggregateExpression = /\b(sum|total|mean|avg|median|count|stddev|min|max|range)\s*\(/i.test(expression);
  if (aggregateExpression) {
    const replacements = new Map<string, string>();
    refs.forEach((reference) => {
      replacements.set(
        reference.token,
        reference.values.map((value) => value.toString(displayOptions(context))).join(", ")
      );
    });
    return evaluateScalar(replaceColumnTokens(expression, replacements), context, new Map());
  }

  const rowCount = refs[0].values.length;
  const items: SemanticValue[] = [];
  for (let row = 0; row < rowCount; row += 1) {
    const replacements = new Map<string, string>();
    const rowVariables = new Map<string, SemanticValue>();
    refs.forEach((reference, index) => {
      const placeholder = `__sp_column_${index}`;
      replacements.set(reference.token, placeholder);
      rowVariables.set(placeholder, reference.values[row]);
    });
    const value = evaluateScalar(replaceColumnTokens(expression, replacements), context, rowVariables);
    if (SemanticValueTypes.isError(value)) {
      return ErrorValue.semanticError(`Row ${row + 1}: ${value.toString()}`);
    }
    items.push(value);
  }
  return createListResult(items);
};

const parseTable = (
  node: Extract<ASTNode, { type: "tableDeclaration" }>
): TableValue | ErrorValue => {
  if (node.rows.some((row) => row.length !== node.columns.length)) {
    const invalidIndex = node.rows.findIndex((row) => row.length !== node.columns.length);
    const line = node.rowLines[invalidIndex] || node.line;
    return ErrorValue.semanticError(
      `Table "${node.tableName}" row on line ${line} has ${node.rows[invalidIndex].length} cells; expected ${node.columns.length}`
    );
  }

  const columns: TableColumn[] = node.columns.map((name, columnIndex) => {
    const values = node.rows.map((row) => {
      const raw = row[columnIndex]?.trim() || "";
      const parsed = SemanticParsers.parse(raw);
      return parsed && !SemanticValueTypes.isSymbolic(parsed) ? parsed : TextValue.from(raw);
    });
    return { name, values };
  });

  for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
    const column = columns[columnIndex];
    const textCount = column.values.filter((value) => value instanceof TextValue).length;
    if (textCount > 0 && textCount !== column.values.length) {
      return ErrorValue.semanticError(
        `Column "${column.name}" mixes text with calculated values; make the column consistently typed`
      );
    }
    if (textCount === 0 && column.values.length > 0) {
      const list = createListResult(column.values);
      if (SemanticValueTypes.isError(list)) {
        return ErrorValue.semanticError(`Column "${column.name}": ${list.toString()}`);
      }
      columns[columnIndex] = {
        ...column,
        values: (list as ListValue).getItems(),
      };
    }
  }

  try {
    return new TableValue(node.tableName, columns);
  } catch (error) {
    return ErrorValue.semanticError(error instanceof Error ? error.message : String(error));
  }
};

const storeTable = (table: TableValue, context: EvaluationContext, rawValue: string): void => {
  context.variableStore.setVariableWithSemanticValue(table.getName(), table, rawValue);
  table.getColumns().forEach((column) => {
    context.variableStore.setVariableWithSemanticValue(
      `${table.getName()}.${column.name}`,
      ListValue.fromItems(column.values),
      column.values.map((value) => value.toString(displayOptions(context))).join(", ")
    );
  });
};

export class TableEvaluator implements NodeEvaluator {
  canHandle(node: ASTNode): boolean {
    return (
      isTableDeclarationNode(node) ||
      isTableRowNode(node) ||
      isTableColumnAssignmentNode(node) ||
      (isExpressionNode(node) && /[A-Za-z][A-Za-z0-9 _-]*\.[A-Za-z][A-Za-z0-9 _-]*/.test(node.expression))
    );
  }

  evaluate(node: ASTNode, context: EvaluationContext): RenderNode | null {
    if (isTableRowNode(node)) return null;

    if (isTableDeclarationNode(node)) {
      const table = parseTable(node);
      if (SemanticValueTypes.isError(table)) return createError(node, table.toString());
      storeTable(table as TableValue, context, node.raw);
      const result = table.toString(displayOptions(context));
      return {
        type: "mathResult",
        line: node.line,
        originalRaw: node.raw,
        expression: node.tableName,
        result,
        displayText: `${node.tableName} => ${result}`,
        livePreview: true,
      } as MathResultRenderNode;
    }

    if (isTableColumnAssignmentNode(node)) {
      const tableVariable = context.variableContext.get(node.tableName);
      if (!(tableVariable?.value instanceof TableValue)) {
        return createError(node, `Unknown table "${node.tableName}"`);
      }
      const value = evaluateColumnExpression(node.expression, context);
      if (SemanticValueTypes.isError(value)) return createError(node, value.toString());
      const items = value instanceof ListValue ? value.getItems() : [value];
      let table: TableValue;
      try {
        table = tableVariable.value.withColumn(node.columnName, items, true);
      } catch (error) {
        return createError(node, error instanceof Error ? error.message : String(error));
      }
      storeTable(table, context, tableVariable.rawValue);
      const list = table.getColumn(node.columnName) as ListValue;
      const result = list.toString(displayOptions(context));
      return {
        type: "mathResult",
        line: node.line,
        originalRaw: node.raw,
        expression: `${node.tableName}.${node.columnName}`,
        result,
        displayText: `${node.raw.replace(/\s*=>\s*$/, "")} => ${result}`,
        livePreview: !node.showResult,
      } as MathResultRenderNode;
    }

    if (isExpressionNode(node)) {
      const value = evaluateColumnExpression(node.expression, context);
      if (SemanticValueTypes.isError(value)) {
        if (/must reference at least one table column/.test(value.toString())) return null;
        return createError(node, value.toString());
      }
      const result = value.toString(displayOptions(context));
      return {
        type: "mathResult",
        line: node.line,
        originalRaw: node.raw,
        expression: node.expression,
        result,
        displayText: `${node.expression} => ${result}`,
      } as MathResultRenderNode;
    }

    return null;
  }
}

export const defaultTableEvaluator = new TableEvaluator();
