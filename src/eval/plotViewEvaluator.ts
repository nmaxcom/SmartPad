import {
  ASTNode,
  ExpressionNode,
  CombinedAssignmentNode,
  isExpressionNode,
  isCombinedAssignmentNode,
  isVariableAssignmentNode,
  isViewDirectiveNode,
} from "../parsing/ast";
import { parseExpressionComponents } from "../parsing/expressionComponents";
import { NodeEvaluator, EvaluationContext } from "./registry";
import { PlotKind, PlotSize, PlotViewRenderNode } from "./renderNodes";
import { computePlotData } from "../plotting/plottingUtils";
import { defaultRegistry } from "./registry";

const SUPPORTED_KINDS: PlotKind[] = ["plot", "scatter", "hist", "box", "auto"];
const SUPPORTED_SIZES: PlotSize[] = ["sm", "md", "lg", "xl"];

const normalizeKind = (kind?: string): PlotKind => {
  if (kind && SUPPORTED_KINDS.includes(kind as PlotKind)) {
    return kind as PlotKind;
  }
  return "plot";
};

const normalizeSize = (size?: string): PlotSize | undefined => {
  if (size && SUPPORTED_SIZES.includes(size as PlotSize)) {
    return size as PlotSize;
  }
  return undefined;
};

const buildExpressionNode = (node: CombinedAssignmentNode): ExpressionNode => ({
  type: "expression",
  line: node.line,
  raw: node.raw,
  expression: node.expression,
  components: node.components,
  expectedType: node.expectedType,
});

const buildExpressionNodeFromText = (expression: string, line: number): ExpressionNode | null => {
  try {
    return {
      type: "expression",
      line,
      raw: expression,
      expression,
      components: parseExpressionComponents(expression),
    };
  } catch (error) {
    return null;
  }
};

const findFirstVariable = (components: ExpressionNode["components"]): string | null => {
  for (const component of components) {
    if (component.type === "variable") {
      return component.value;
    }
    if (component.children) {
      const found = findFirstVariable(component.children as any);
      if (found) return found;
    }
    if (component.args) {
      for (const arg of component.args) {
        const found = findFirstVariable(arg.components as any);
        if (found) return found;
      }
    }
  }
  return null;
};

const parseSeriesList = (raw?: string): string[] => {
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const resolveSeriesExpression = (
  raw: string,
  context: EvaluationContext
): { label: string; expression: string } => {
  const label = raw.trim();
  if (!label) return { label: raw, expression: raw };
  const variable = context.variableContext.get(label);
  if (variable?.rawValue) {
    const candidate = variable.rawValue.trim();
    if (candidate) {
      return { label, expression: candidate };
    }
  }
  return { label, expression: label };
};

export class PlotViewEvaluator implements NodeEvaluator {
  canHandle(node: ASTNode): boolean {
    return isViewDirectiveNode(node);
  }

  evaluate(node: ASTNode, context: EvaluationContext): PlotViewRenderNode | null {
    if (!isViewDirectiveNode(node)) return null;

    const astNodes = context.astNodes;
    if (!astNodes || node.line <= 1) {
      return {
        type: "plotView",
        line: node.line,
        originalRaw: node.raw,
        kind: normalizeKind(node.kind),
        size: normalizeSize(node.params.size),
        status: "disconnected",
        message: "No expression to attach to",
      };
    }

    const targetNode = astNodes[node.line - 2];
    if (!targetNode) {
      return {
        type: "plotView",
        line: node.line,
        originalRaw: node.raw,
        kind: normalizeKind(node.kind),
        size: normalizeSize(node.params.size),
        status: "disconnected",
        message: "Expression missing",
      };
    }

    let expressionNode: ExpressionNode | null = null;
    if (isExpressionNode(targetNode)) {
      expressionNode = targetNode;
    } else if (isCombinedAssignmentNode(targetNode)) {
      expressionNode = buildExpressionNode(targetNode);
    } else if (isVariableAssignmentNode(targetNode)) {
      const rawExpression = targetNode.rawValue?.trim();
      if (rawExpression) {
        expressionNode = buildExpressionNodeFromText(rawExpression, targetNode.line);
      }
    }

    if (!expressionNode) {
      return {
        type: "plotView",
        line: node.line,
        originalRaw: node.raw,
        kind: normalizeKind(node.kind),
        size: normalizeSize(node.params.size),
        status: "disconnected",
        message: "Expression unavailable",
      };
    }

    const kind = normalizeKind(node.kind);
    const size = normalizeSize(node.params.size);
    const xParam = node.params.x;
    const seriesParam = parseSeriesList(node.params.y);
    const seriesDefinitions = seriesParam.length
      ? seriesParam.map((entry) => resolveSeriesExpression(entry, context))
      : [{ label: expressionNode.expression, expression: expressionNode.expression }];
    const seriesNodes = seriesDefinitions.map((entry) =>
      buildExpressionNodeFromText(entry.expression, expressionNode.line)
    );
    const missingSeries = seriesNodes.findIndex((entry) => !entry);
    if (missingSeries !== -1) {
      return {
        type: "plotView",
        line: node.line,
        originalRaw: node.raw,
        kind,
        size,
        status: "disconnected",
        message: "Expression unavailable",
      };
    }
    const safeSeriesNodes = seriesNodes as ExpressionNode[];

    const x =
      xParam ||
      findFirstVariable(safeSeriesNodes[0].components) ||
      findFirstVariable(expressionNode.components) ||
      undefined;
    const plotSettings = {
      decimalPlaces: context.decimalPlaces,
      scientificUpperThreshold: context.scientificUpperThreshold,
      scientificLowerThreshold: context.scientificLowerThreshold,
      scientificTrimTrailingZeros: context.scientificTrimTrailingZeros,
      groupThousands: context.groupThousands,
      dateDisplayFormat: context.dateDisplayFormat,
      dateLocale: context.dateLocale,
    };

    const isScrubbing =
      typeof document !== "undefined" && document.body?.classList.contains("number-scrubbing");
    const sampleCount = isScrubbing ? 24 : 60;

    const plotResults = safeSeriesNodes.map((seriesNode) =>
      computePlotData({
        expressionNode: seriesNode,
        xVariable: x || "",
        variableContext: context.variableContext,
        variableStore: context.variableStore,
        registry: defaultRegistry,
        settings: plotSettings,
        domainSpec: node.params.domain,
        viewSpec: node.params.view,
        sampleCount,
      })
    );

    const firstResult = plotResults[0];
    const failedResult = plotResults.find((result) => result.status === "disconnected");
    if (!firstResult || failedResult) {
      return {
        type: "plotView",
        line: node.line,
        originalRaw: node.raw,
        kind,
        x,
        size,
        expression: safeSeriesNodes[0]?.expression || expressionNode.expression,
        targetLine: expressionNode.line,
        status: "disconnected",
        message: failedResult?.message || firstResult?.message || "Expression unavailable",
      };
    }

    return {
      type: "plotView",
      line: node.line,
      originalRaw: node.raw,
      kind,
      x,
      size,
      expression: safeSeriesNodes[0]?.expression || expressionNode.expression,
      series: seriesDefinitions.map((entry, index) => ({
        label: entry.label,
        expression: safeSeriesNodes[index]?.expression || entry.expression,
        data: plotResults[index]?.data,
        currentY: plotResults[index]?.currentY,
      })),
      targetLine: expressionNode.line,
      status: firstResult.status,
      message: firstResult.message,
      domain: firstResult.domain,
      view: firstResult.view,
      data: firstResult.data,
      currentX: firstResult.currentX,
      currentY: firstResult.currentY,
    };
  }
}
