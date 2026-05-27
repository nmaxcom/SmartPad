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
import { PlotKind, PlotRange, PlotSize, PlotViewRenderNode } from "./renderNodes";
import { computePlotData, getPlotNumericValue, parsePlotRange } from "../plotting/plottingUtils";
import { defaultRegistry } from "./registry";
import { ListValue, SemanticParsers, SemanticValue } from "../types";
import { ReactiveVariableStore } from "../state/variableStore";

const SUPPORTED_KINDS: PlotKind[] = ["plot", "scatter", "hist", "box", "auto"];
const SUPPORTED_SIZES: PlotSize[] = ["sm", "md", "lg", "xl"];

const normalizeKind = (kind?: string): PlotKind => {
  const normalized = kind?.trim().toLowerCase();
  if (normalized && SUPPORTED_KINDS.includes(normalized as PlotKind)) {
    return normalized as PlotKind;
  }
  return "plot";
};

const normalizeSize = (size?: string): PlotSize | undefined => {
  const normalized = size
    ?.trim()
    .toLowerCase()
    .replace(/[;,]+$/, "");
  if (normalized && SUPPORTED_SIZES.includes(normalized as PlotSize)) {
    return normalized as PlotSize;
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

const resolveSeriesTargetExpressionNode = (
  raw: string | undefined,
  context: EvaluationContext,
  line: number
): ExpressionNode | null => {
  const label = raw?.trim();
  if (!label || !context.astNodes || line <= 1) return null;

  for (let index = line - 2; index >= 0; index -= 1) {
    const candidate = context.astNodes[index];
    if (!candidate) continue;
    if (isCombinedAssignmentNode(candidate) && candidate.variableName === label) {
      return buildExpressionNode(candidate);
    }
    if (isVariableAssignmentNode(candidate) && candidate.variableName === label) {
      const parsed = buildExpressionNodeFromText(candidate.rawValue?.trim() || "", candidate.line);
      if (parsed) return parsed;
    }
  }

  return null;
};

const cloneVariableStore = (context: EvaluationContext) => {
  const store = new ReactiveVariableStore();
  context.variableContext.forEach((variable) => {
    store.setVariableWithMetadata(variable);
  });
  return store;
};

const evaluateSemanticExpression = (
  expressionNode: ExpressionNode,
  context: EvaluationContext
): SemanticValue | null => {
  const evaluationContext: EvaluationContext = {
    ...context,
    variableStore: cloneVariableStore(context),
    lineNumber: expressionNode.line,
  };
  const renderNode = defaultRegistry.evaluate(expressionNode, evaluationContext);
  if (!renderNode || renderNode.type === "error") return null;
  const rawResult = (renderNode as any).result ?? "";
  return SemanticParsers.parse(String(rawResult));
};

const resolveSeriesSemanticValue = (
  definition: { label: string; expression: string },
  context: EvaluationContext,
  line: number
): SemanticValue | null => {
  const directVariable = context.variableContext.get(definition.label);
  if (directVariable?.value) {
    return directVariable.value;
  }
  const expressionNode = buildExpressionNodeFromText(definition.expression, line);
  if (!expressionNode) return null;
  return evaluateSemanticExpression(expressionNode, context);
};

const getNumericList = (value: SemanticValue | null): number[] | null => {
  if (!(value instanceof ListValue)) {
    return null;
  }
  const values: number[] = [];
  for (const item of value.getItems()) {
    const numeric = getPlotNumericValue(item);
    if (numeric === null || !Number.isFinite(numeric)) {
      return null;
    }
    values.push(numeric);
  }
  return values.length > 0 ? values : null;
};

const normalizePlotRange = (min: number, max: number): { min: number; max: number } => {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 1 };
  }
  if (min === max) {
    const delta = min === 0 ? 1 : Math.abs(min) * 0.1;
    return { min: min - delta, max: max + delta };
  }
  return min < max ? { min, max } : { min: max, max: min };
};

const padRange = (min: number, max: number, factor = 0.08): { min: number; max: number } => {
  const normalized = normalizePlotRange(min, max);
  const span = normalized.max - normalized.min;
  const padding = span * factor;
  return { min: normalized.min - padding, max: normalized.max + padding };
};

const buildHistogramData = (values: number[]) => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    return {
      data: [{ x: min, y: values.length }],
      domain: padRange(min, max || min + 1, 0.5),
      yRange: { min: 0, max: Math.max(1, values.length) },
    };
  }
  const binCount = Math.max(4, Math.min(12, Math.ceil(Math.sqrt(values.length))));
  const width = (max - min) / binCount;
  const counts = Array.from({ length: binCount }, () => 0);
  values.forEach((value) => {
    const index = Math.min(binCount - 1, Math.max(0, Math.floor((value - min) / width)));
    counts[index] += 1;
  });
  const data = counts.map((count, index) => ({
    x: min + width * (index + 0.5),
    y: count,
  }));
  return {
    data,
    domain: { min, max },
    yRange: { min: 0, max: Math.max(1, ...counts) },
  };
};

const buildListPlotNode = (
  node: Extract<ASTNode, { type: "viewDirective" }>,
  context: EvaluationContext,
  kind: PlotKind,
  size: PlotSize | undefined,
  xParam: string | undefined,
  seriesParam: string[],
  expressionNode: ExpressionNode | null,
  yDomain: PlotRange | undefined,
  yView: PlotRange | undefined
): PlotViewRenderNode | null => {
  if (kind === "hist") {
    const definition = seriesParam[0]
      ? resolveSeriesExpression(seriesParam[0], context)
      : expressionNode
        ? { label: expressionNode.expression, expression: expressionNode.expression }
        : null;
    if (!definition) {
      return {
        type: "plotView",
        line: node.line,
        originalRaw: node.raw,
        kind,
        size,
        status: "disconnected",
        message: "Histogram needs a list source. Add y=... or place it under a list result.",
        yDomain,
        yView,
      };
    }
    const values = getNumericList(resolveSeriesSemanticValue(definition, context, node.line));
    if (!values) {
      return {
        type: "plotView",
        line: node.line,
        originalRaw: node.raw,
        kind,
        size,
        x: definition.label,
        expression: definition.expression,
        status: "disconnected",
        message: "Histogram needs a numeric list",
        yDomain,
        yView,
      };
    }
    const histogram = buildHistogramData(values);
    return {
      type: "plotView",
      line: node.line,
      originalRaw: node.raw,
      kind,
      x: definition.label || "value",
      size,
      expression: definition.expression,
      series: [
        {
          label: "count",
          expression: definition.label || definition.expression,
          data: histogram.data,
        },
      ],
      targetLine: expressionNode?.line,
      status: "connected",
      domain: histogram.domain,
      view: histogram.domain,
      yDomain: yDomain || histogram.yRange,
      yView: yView || histogram.yRange,
      data: histogram.data,
    };
  }

  if (kind === "scatter") {
    if (!xParam) {
      return {
        type: "plotView",
        line: node.line,
        originalRaw: node.raw,
        kind,
        size,
        status: "disconnected",
        message: "Scatter needs x=<list variable>",
        yDomain,
        yView,
      };
    }
    const definition = seriesParam[0]
      ? resolveSeriesExpression(seriesParam[0], context)
      : expressionNode
        ? { label: expressionNode.expression, expression: expressionNode.expression }
        : null;
    if (!definition) {
      return {
        type: "plotView",
        line: node.line,
        originalRaw: node.raw,
        kind,
        x: xParam,
        size,
        status: "disconnected",
        message: "Scatter needs y=<list variable>",
        yDomain,
        yView,
      };
    }
    const xValues = getNumericList(context.variableContext.get(xParam)?.value || null);
    const yValues = getNumericList(resolveSeriesSemanticValue(definition, context, node.line));
    if (!xValues || !yValues) {
      return {
        type: "plotView",
        line: node.line,
        originalRaw: node.raw,
        kind,
        x: xParam,
        size,
        expression: definition.expression,
        status: "disconnected",
        message: "Scatter needs numeric x and y lists",
        yDomain,
        yView,
      };
    }
    if (xValues.length !== yValues.length) {
      return {
        type: "plotView",
        line: node.line,
        originalRaw: node.raw,
        kind,
        x: xParam,
        size,
        expression: definition.expression,
        status: "disconnected",
        message: `Scatter lists must have the same length (${xValues.length} vs ${yValues.length})`,
        yDomain,
        yView,
      };
    }
    const data = xValues.map((x, index) => ({ x, y: yValues[index] }));
    const xRange = padRange(Math.min(...xValues), Math.max(...xValues));
    const computedYRange = padRange(Math.min(...yValues), Math.max(...yValues));
    return {
      type: "plotView",
      line: node.line,
      originalRaw: node.raw,
      kind,
      x: xParam,
      size,
      expression: definition.expression,
      series: [
        {
          label: definition.label,
          expression: definition.expression,
          data,
        },
      ],
      targetLine: expressionNode?.line,
      status: "connected",
      domain: xRange,
      view: xRange,
      yDomain: yDomain || computedYRange,
      yView: yView || computedYRange,
      data,
    };
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
      ? resolveSeriesTargetExpressionNode(seriesParam[0], context, node.line)
      : resolveNearestExpressionNode(context.astNodes, node.line);

    const listPlotNode = buildListPlotNode(
      node,
      context,
      kind,
      size,
      xParam,
      seriesParam,
      expressionNode,
      yDomain || undefined,
      yView || undefined
    );
    if (listPlotNode) {
      return listPlotNode;
    }

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
        functionStore: context.functionStore,
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
