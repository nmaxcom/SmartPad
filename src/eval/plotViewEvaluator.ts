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
import { computePlotData, parsePlotRange } from "../plotting/plottingUtils";
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
    if (component.type === "variable" || component.type === "resultReference") {
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

const resolveNearestExpressionNode = (
  astNodes: ASTNode[] | undefined,
  line: number
): ExpressionNode | null => {
  if (!astNodes || line <= 1) {
    return null;
  }

  for (let index = line - 2; index >= 0; index -= 1) {
    const candidate = astNodes[index];
    if (!candidate) continue;
    if (isExpressionNode(candidate)) {
      return candidate;
    }
    if (isCombinedAssignmentNode(candidate)) {
      return buildExpressionNode(candidate);
    }
    if (isVariableAssignmentNode(candidate)) {
      const rawExpression = candidate.rawValue?.trim();
      if (!rawExpression) {
        continue;
      }
      const parsed = buildExpressionNodeFromText(rawExpression, candidate.line);
      if (parsed) {
        return parsed;
      }
    }
  }

  return null;
};

export class PlotViewEvaluator implements NodeEvaluator {
  canHandle(node: ASTNode): boolean {
    return isViewDirectiveNode(node);
  }

  evaluate(node: ASTNode, context: EvaluationContext): PlotViewRenderNode | null {
    if (!isViewDirectiveNode(node)) return null;

    const kind = normalizeKind(node.kind);
    const size = normalizeSize(node.params.size);
    const xParam = node.params.x;
    const yDomainRaw =
      node.params.yDomain || node.params.ydomain || node.params.y_domain;
    const yViewRaw = node.params.yView || node.params.yview || node.params.y_view;
    const yDomain = yDomainRaw ? parsePlotRange(yDomainRaw) || undefined : undefined;
    const yView = yViewRaw ? parsePlotRange(yViewRaw) || undefined : undefined;
    const seriesParam = parseSeriesList(node.params.y);
    const expressionNode = seriesParam.length
      ? null
      : resolveNearestExpressionNode(context.astNodes, node.line);
    if (!expressionNode && seriesParam.length === 0) {
      return {
        type: "plotView",
        line: node.line,
        originalRaw: node.raw,
        kind,
        size,
        status: "disconnected",
        message: "Expression unavailable. Add y=... or define an expression above.",
        yDomain,
        yView,
      };
    }
    const resolvedExpressionNode = expressionNode;

    const seriesDefinitions = seriesParam.length
      ? seriesParam.map((entry) => resolveSeriesExpression(entry, context))
      : [
          {
            label: resolvedExpressionNode!.expression,
            expression: resolvedExpressionNode!.expression,
          },
        ];
    const seriesNodes = seriesDefinitions.map((entry) =>
      buildExpressionNodeFromText(entry.expression, expressionNode?.line || node.line)
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
        yDomain,
        yView,
      };
    }
    const safeSeriesNodes = seriesNodes as ExpressionNode[];

    const x =
      xParam ||
      findFirstVariable(safeSeriesNodes[0].components) ||
      (resolvedExpressionNode
        ? findFirstVariable(resolvedExpressionNode.components)
        : null) ||
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
    const baseSampleCount =
      typeof context.plotSampleCount === "number" ? Math.round(context.plotSampleCount) : 150;
    const scrubSampleCount =
      typeof context.plotScrubSampleCount === "number"
        ? Math.round(context.plotScrubSampleCount)
        : 40;
    const sampleCount = isScrubbing ? scrubSampleCount : baseSampleCount;
    const minSamples =
      typeof context.plotMinSamples === "number" ? Math.round(context.plotMinSamples) : undefined;
    const maxSamples =
      typeof context.plotMaxSamples === "number" ? Math.round(context.plotMaxSamples) : undefined;
    const domainExpansionFactor =
      typeof context.plotDomainExpansion === "number" ? context.plotDomainExpansion : undefined;

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
        minSamples,
        maxSamples,
        domainExpansionFactor,
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
        expression: safeSeriesNodes[0]?.expression || resolvedExpressionNode?.expression,
        targetLine: resolvedExpressionNode?.line,
        status: "disconnected",
        message: failedResult?.message || firstResult?.message || "Expression unavailable",
        yDomain,
        yView,
      };
    }

    return {
      type: "plotView",
      line: node.line,
      originalRaw: node.raw,
      kind,
      x,
      size,
      expression: safeSeriesNodes[0]?.expression || resolvedExpressionNode?.expression,
      series: seriesDefinitions.map((entry, index) => ({
        label: entry.label,
        expression: safeSeriesNodes[index]?.expression || entry.expression,
        data: plotResults[index]?.data,
        currentY: plotResults[index]?.currentY,
      })),
      targetLine: resolvedExpressionNode?.line,
      status: firstResult.status,
      message: firstResult.message,
      domain: firstResult.domain,
      view: firstResult.view,
      yDomain,
      yView,
      data: firstResult.data,
      currentX: firstResult.currentX,
      currentY: firstResult.currentY,
    };
  }
}
