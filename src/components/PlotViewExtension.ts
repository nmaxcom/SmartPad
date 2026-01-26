import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import { Node as ProseMirrorNode } from "prosemirror-model";
import { parseLine } from "../parsing/astParser";
import {
  isExpressionNode,
  isCombinedAssignmentNode,
  ExpressionNode,
  CombinedAssignmentNode,
  isVariableAssignmentNode,
} from "../parsing/ast";
import { parseExpressionComponents } from "../parsing/expressionComponents";
import { Variable } from "../state/types";
import {
  PlotViewRenderNode,
  PlotKind,
  PlotSize,
  PlotPoint,
  PlotRange,
  isPlotViewRenderNode,
} from "../eval/renderNodes";
import { computePlotData } from "../plotting/plottingUtils";
import { defaultRegistry } from "../eval/registry";
import { ReactiveVariableStore } from "../state/variableStore";
import {
  SemanticParsers,
  SemanticValueTypes,
  CurrencyValue,
  CurrencyUnitValue,
  UnitValue,
  PercentageValue,
} from "../types";
import { getDateLocaleEffective } from "../types/DateValue";

const plotViewPluginKey = new PluginKey("plotView");

type PlotSource = "persistent" | "transient";

const isPlotDebugEnabled = (): boolean =>
  typeof window !== "undefined" && Boolean((window as any).__SP_PLOT_DEBUG);

const logPlotDebug = (...args: any[]) => {
  if (!isPlotDebugEnabled()) return;
  if (typeof window !== "undefined") {
    const store = (window as any).__SP_PLOT_DEBUG_LOGS;
    const logs = Array.isArray(store) ? store : [];
    logs.push({ ts: Date.now(), args });
    (window as any).__SP_PLOT_DEBUG_LOGS = logs;
  }
  // Use log to avoid debug-level filtering.
  console.log(...args);
};

const PLOT_SERIES_COLORS = [
  "var(--plot-series-1)",
  "var(--plot-series-2)",
  "var(--plot-series-3)",
  "var(--plot-series-4)",
  "var(--plot-series-5)",
];

interface PlotSeriesModel {
  label?: string;
  expression: string;
  data?: PlotPoint[];
  currentY?: number | null;
  color?: string;
  unit?: PlotUnitFormat | null;
}

interface PlotUnitFormat {
  prefix?: string;
  suffix?: string;
  scale?: number;
}

interface PlotViewModel {
  source: PlotSource;
  kind: PlotKind;
  size: PlotSize;
  x?: string;
  expression?: string;
  series: PlotSeriesModel[];
  xUnit?: PlotUnitFormat | null;
  status: "connected" | "disconnected";
  message?: string;
  domain?: PlotRange;
  view?: PlotRange;
  yDomain?: PlotRange;
  yView?: PlotRange;
  yViewAuto?: boolean;
  yDomainAuto?: boolean;
  data?: PlotPoint[];
  currentX?: number;
  currentY?: number | null;
  targetLine?: number;
}

interface PlotSeriesLayout {
  index: number;
  label?: string;
  expression: string;
  color: string;
  points: Array<{ x: number; y: number }>;
}

interface PlotSvgLayout {
  width: number;
  height: number;
  padding: { left: number; right: number; top: number; bottom: number };
  viewRange: PlotRange;
  yMin: number;
  yMax: number;
  xScale: (value: number) => number;
  yScale: (value: number) => number;
  series: PlotSeriesLayout[];
}

interface PlotSvgResult {
  svg: SVGSVGElement;
  layout: PlotSvgLayout;
  lineElements: Map<number, SVGPathElement>;
}

interface PlotViewState {
  selecting: boolean;
  selectionLine?: number;
  transient?: {
    targetLine: number;
    xVariable: string;
    domain?: PlotRange;
  };
  viewNodes: PlotViewRenderNode[];
  overrides: Record<
    string,
    { domain?: PlotRange; view?: PlotRange; yDomain?: PlotRange; yView?: PlotRange }
  >;
}

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

const buildEvaluationContext = (
  expressionNode: ExpressionNode,
  variableContext: Map<string, Variable>,
  variableStore: ReactiveVariableStore,
  settings: any
) => ({
  variableStore,
  variableContext,
  functionStore: undefined,
  equationStore: undefined,
  lineNumber: expressionNode.line,
  decimalPlaces: settings.decimalPlaces,
  scientificUpperThreshold: settings.scientificUpperThreshold,
  scientificLowerThreshold: settings.scientificLowerThreshold,
  scientificTrimTrailingZeros: settings.scientificTrimTrailingZeros,
  groupThousands: settings.groupThousands,
  dateDisplayFormat: settings.dateDisplayFormat,
  dateLocale: settings.dateLocale,
  functionCallDepth: 0,
});

const evaluateExpressionSemantic = (
  expressionNode: ExpressionNode,
  variableContext: Map<string, Variable>,
  settings: any
) => {
  const store = new ReactiveVariableStore();
  variableContext.forEach((variable) => store.setVariableWithMetadata(variable));
  const context = buildEvaluationContext(expressionNode, variableContext, store, settings);
  const renderNode = defaultRegistry.evaluate(expressionNode, context as any);
  if (!renderNode || renderNode.type === "error") return null;
  const rawResult = (renderNode as any).result ?? "";
  return SemanticParsers.parse(String(rawResult));
};

const resolveExpressionNode = (node: ProseMirrorNode, lineNumber: number): ExpressionNode | null => {
  const astNode = parseLine(node.textContent, lineNumber);
  if (isExpressionNode(astNode)) return astNode;
  if (isCombinedAssignmentNode(astNode)) return buildExpressionNode(astNode);
  return null;
};

const buildLineIndex = (doc: ProseMirrorNode) => {
  const lines: Array<{
    start: number;
    end: number;
    insertPos: number;
    node: ProseMirrorNode;
    text: string;
  }> = [/* 1-based */];
  let line = 0;
  doc.forEach((node: ProseMirrorNode, offset: number) => {
    if (!node.isTextblock) return;
    line += 1;
    const start = offset + 1;
    const end = start + node.content.size;
    const insertPos = offset + node.nodeSize;
    lines[line] = { start, end, insertPos, node, text: node.textContent };
  });
  return lines;
};

const buildPlotModel = (
  plotNode: PlotViewRenderNode,
  source: PlotSource
): PlotViewModel => {
  const series: PlotSeriesModel[] =
    plotNode.series && plotNode.series.length
      ? plotNode.series.map((entry, index) => ({
          label: entry.label,
          expression: entry.expression,
          data: entry.data,
          currentY: entry.currentY,
          color: PLOT_SERIES_COLORS[index % PLOT_SERIES_COLORS.length],
        }))
      : plotNode.data
        ? [
            {
              label: plotNode.expression,
              expression: plotNode.expression || "y",
              data: plotNode.data,
              currentY: plotNode.currentY,
              color: PLOT_SERIES_COLORS[0],
            },
          ]
        : [];
  const derivedY = deriveYDomainFromSeries(series);
  return {
    source,
    kind: plotNode.kind,
    size: plotNode.size || "md",
    x: plotNode.x,
    expression: plotNode.expression,
    series,
    status: plotNode.status,
    message: plotNode.message,
    domain: plotNode.domain,
    view: plotNode.view,
    yDomain: derivedY,
    yView: derivedY,
    yViewAuto: true,
    yDomainAuto: true,
    data: series[0]?.data,
    currentX: plotNode.currentX,
    currentY: series[0]?.currentY ?? plotNode.currentY,
    targetLine: plotNode.targetLine,
  };
};

const buildPlotKey = (model: PlotViewModel, fallbackLine?: number): string => {
  const line = model.targetLine ?? fallbackLine ?? 0;
  const xKey = model.currentX !== undefined ? Math.round(model.currentX * 1000) : "na";
  const yKey =
    model.currentY !== undefined && model.currentY !== null
      ? Math.round(model.currentY * 1000)
      : "na";
  const seriesKey = model.series
    .map((series) => series.expression || "")
    .join("|");
  const domainKey = model.domain ? `${model.domain.min}:${model.domain.max}` : "auto";
  const viewKey = model.view ? `${model.view.min}:${model.view.max}` : "auto";
  const yDomainKey = model.yDomain ? `${model.yDomain.min}:${model.yDomain.max}` : "auto";
  const yViewKey = model.yView ? `${model.yView.min}:${model.yView.max}` : "auto";
  return `plot-${model.source}-${line}-${xKey}-${yKey}-${seriesKey}-${domainKey}-${viewKey}-${yDomainKey}-${yViewKey}`;
};

const deriveYDomain = (data?: PlotPoint[]): PlotRange | undefined => {
  if (!data) return undefined;
  const points = data.filter((point) => point.y !== null) as Array<{ x: number; y: number }>;
  if (points.length === 0) return undefined;
  let min = points[0].y;
  let max = points[0].y;
  points.forEach((point) => {
    min = Math.min(min, point.y);
    max = Math.max(max, point.y);
  });
  if (min === max) {
    const delta = min === 0 ? 1 : Math.abs(min) * 0.1;
    min -= delta;
    max += delta;
  }
  return { min, max };
};

const deriveYDomainFromSeries = (
  series: PlotSeriesModel[],
  range?: PlotRange
): PlotRange | undefined => {
  const points = series.flatMap((entry) =>
    (entry.data || []).filter((point) => {
      if (point.y === null) return false;
      if (!range) return true;
      return point.x >= range.min && point.x <= range.max;
    })
  ) as Array<{ x: number; y: number }>;
  if (points.length === 0) return undefined;
  let min = points[0].y;
  let max = points[0].y;
  points.forEach((point) => {
    min = Math.min(min, point.y);
    max = Math.max(max, point.y);
  });
  if (min === max) {
    const delta = min === 0 ? 1 : Math.abs(min) * 0.1;
    min -= delta;
    max += delta;
  }
  return { min, max };
};

const expandPlotRange = (range: PlotRange | undefined, factor: number): PlotRange | undefined => {
  if (!range || !Number.isFinite(range.min) || !Number.isFinite(range.max)) return range;
  const span = range.max - range.min;
  if (span <= 0) return range;
  const center = range.min + span / 2;
  const nextSpan = span * factor;
  return { min: center - nextSpan / 2, max: center + nextSpan / 2 };
};

const formatPlotValue = (value: number) => {
  if (!Number.isFinite(value)) return "";
  const abs = Math.abs(value);
  if (abs > 0 && (abs >= 1e6 || abs < 1e-3)) {
    return value.toExponential(2);
  }
  const fixed = abs >= 100 ? value.toFixed(0) : value.toFixed(2);
  return fixed.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
};

const formatPlotValueWithUnit = (value: number, unit?: PlotUnitFormat | null) => {
  if (!Number.isFinite(value)) return "";
  const scaled = value * (unit?.scale ?? 1);
  const formatted = formatPlotValue(scaled);
  const prefix = unit?.prefix ?? "";
  const suffix = unit?.suffix ?? "";
  return `${prefix}${formatted}${suffix}`;
};

const getPlotUnitFormat = (value: any): PlotUnitFormat | null => {
  if (!value || typeof value.getType !== "function") return null;
  if (SemanticValueTypes.isPercentage(value as PercentageValue)) {
    return { suffix: "%", scale: 100 };
  }
  if (SemanticValueTypes.isCurrency(value as CurrencyValue)) {
    const info = (value as CurrencyValue).getCurrencyInfo();
    if (info.symbolPosition === "before") {
      return { prefix: info.symbol };
    }
    return { suffix: ` ${info.symbol}` };
  }
  if (SemanticValueTypes.isCurrencyUnit(value as CurrencyUnitValue)) {
    const unitValue = value as CurrencyUnitValue;
    const info = new CurrencyValue(unitValue.getSymbol() as any, 0).getCurrencyInfo();
    const unitSuffix = unitValue.isPerUnit() ? `/${unitValue.getUnit()}` : `*${unitValue.getUnit()}`;
    if (info.symbolPosition === "before") {
      return { prefix: info.symbol, suffix: unitSuffix };
    }
    return { suffix: ` ${info.symbol}${unitSuffix}` };
  }
  if (SemanticValueTypes.isUnit(value as UnitValue)) {
    return { suffix: ` ${(value as UnitValue).getUnit()}` };
  }
  return null;
};

const computeModelFromExpression = (
  targetLine: number,
  xVariable: string,
  domainOverride: PlotRange | undefined,
  viewOverride: PlotRange | undefined,
  yDomainOverride: PlotRange | undefined,
  yViewOverride: PlotRange | undefined,
  source: PlotSource,
  size: PlotSize,
  seriesDefinitions: Array<{ label?: string; expression: string }> | undefined,
  lineIndex: ReturnType<typeof buildLineIndex>,
  variableContext: Map<string, Variable>,
  settings: any
): PlotViewModel | null => {
  const info = lineIndex[targetLine];
  if (!info) return null;
  const expressionNode = resolveExpressionNode(info.node, targetLine);
  if (!expressionNode) return null;

  const seriesSpecs =
    seriesDefinitions && seriesDefinitions.length
      ? seriesDefinitions
      : [{ label: expressionNode.expression, expression: expressionNode.expression }];
  const seriesNodes = seriesSpecs.map((spec) => {
    if (spec.expression === expressionNode.expression) return expressionNode;
    return buildExpressionNodeFromText(spec.expression, targetLine);
  });
  if (seriesNodes.some((node) => !node)) return null;

  const isScrubbing =
    typeof document !== "undefined" && document.body?.classList.contains("number-scrubbing");
  const sampleCount = isScrubbing ? 40 : 60;

  const seriesResults = (seriesNodes as ExpressionNode[]).map((node) =>
    computePlotData({
      expressionNode: node,
      xVariable,
      variableContext,
      variableStore: (() => {
        const store = new ReactiveVariableStore();
        variableContext.forEach((variable) => store.setVariableWithMetadata(variable));
        return store;
      })(),
      registry: defaultRegistry,
      settings,
      domainSpec: domainOverride ? `${domainOverride.min}..${domainOverride.max}` : undefined,
      sampleCount,
    })
  );
  const firstResult = seriesResults[0];
  if (!firstResult) return null;
  const failedResult = seriesResults.find((result) => result.status === "disconnected");

  const viewOverrideSafe = viewOverride ? { ...viewOverride } : undefined;
  const viewCandidate = viewOverrideSafe || firstResult.view || firstResult.domain;
  const seriesData = seriesSpecs.map((spec, index) => ({
    label: spec.label,
    expression: spec.expression,
    data: seriesResults[index]?.data,
    currentY: seriesResults[index]?.currentY,
  }));
  const baseYDomain =
    deriveYDomainFromSeries(seriesData, viewCandidate) || deriveYDomainFromSeries(seriesData);
  const baseYView = expandPlotRange(baseYDomain, 1.15) || baseYDomain;
  let computedYDomain = yDomainOverride || expandPlotRange(baseYView, 8) || baseYView;
  if (yViewOverride) {
    if (computedYDomain) {
      computedYDomain = {
        min: Math.min(computedYDomain.min, yViewOverride.min),
        max: Math.max(computedYDomain.max, yViewOverride.max),
      };
    } else {
      computedYDomain = yViewOverride;
    }
  }
  const computedYView = yViewOverride || baseYView || computedYDomain;
  const yViewAuto = !yViewOverride && !yDomainOverride;
  const yDomainAuto = !yDomainOverride;
  if (isPlotDebugEnabled()) {
    logPlotDebug("[plot] computeModel", {
      line: targetLine,
      xVariable,
      yViewOverride,
      yDomainOverride,
      computedYView,
      computedYDomain,
      yViewAuto,
      yDomainAuto,
    });
  }
  const xUnit = getPlotUnitFormat(variableContext.get(xVariable)?.value);
  const seriesUnits = (seriesNodes as ExpressionNode[]).map((node, index) => {
    const seriesLabel = seriesSpecs[index]?.label;
    const directValue = seriesLabel ? variableContext.get(seriesLabel)?.value : undefined;
    if (directValue) {
      return getPlotUnitFormat(directValue);
    }
    return getPlotUnitFormat(evaluateExpressionSemantic(node, variableContext, settings));
  });
  const series: PlotSeriesModel[] = seriesSpecs.map((spec, index) => ({
    label: spec.label,
    expression: spec.expression,
    data: seriesResults[index]?.data,
    currentY: seriesResults[index]?.currentY,
    color: PLOT_SERIES_COLORS[index % PLOT_SERIES_COLORS.length],
    unit: seriesUnits[index],
  }));

  return {
    source,
    kind: "plot",
    size,
    x: xVariable,
    expression: series[0]?.expression || expressionNode.expression,
    series,
    xUnit,
    status: failedResult ? "disconnected" : firstResult.status,
    message: failedResult?.message || firstResult.message,
    domain: firstResult.domain,
    view: viewOverrideSafe || firstResult.view,
    yDomain: computedYDomain,
    yView: computedYView,
    yViewAuto,
    yDomainAuto,
    data: series[0]?.data,
    currentX: firstResult.currentX,
    currentY: series[0]?.currentY ?? firstResult.currentY,
    targetLine,
  };
};

const createPlotSvg = (
  model: PlotViewModel,
  width: number,
  height: number,
  viewOverride?: PlotRange,
  yViewOverride?: PlotRange,
  yViewAuto?: boolean
): PlotSvgResult | null => {
  if (!model.series.length) return null;

  const padding = { left: 64, right: 20, top: 22, bottom: 44 };
  const viewRange = viewOverride || model.view || model.domain;
  if (!viewRange) return null;

  const domainMin = model.domain?.min ?? viewRange.min;
  const domainMax = model.domain?.max ?? viewRange.max;
  const renderRange = {
    min: domainMin,
    max: domainMax,
  };

  const seriesLayouts: PlotSeriesLayout[] = model.series.map((series, index) => {
    const points = (series.data || []).filter(
      (point) =>
        point.y !== null && point.x >= renderRange.min && point.x <= renderRange.max
    ) as Array<{ x: number; y: number }>;
    return {
      index,
      label: series.label,
      expression: series.expression,
      color: series.color || PLOT_SERIES_COLORS[index % PLOT_SERIES_COLORS.length],
      points,
    };
  });

  const visiblePoints = seriesLayouts.flatMap((series) => series.points);
  if (visiblePoints.length === 0) return null;

  const derivedRange = deriveYDomain(visiblePoints);
  const yRangeBase = yViewOverride || model.yView || model.yDomain || derivedRange;
  if (!yRangeBase) return null;
  let yMin = yRangeBase.min;
  let yMax = yRangeBase.max;
  if (yViewAuto && derivedRange) {
    yMin = Math.min(yMin, derivedRange.min);
    yMax = Math.max(yMax, derivedRange.max);
  }

  const plotWidth = Math.max(1, width - padding.left - padding.right);
  const plotHeight = Math.max(1, height - padding.top - padding.bottom);
  const xScale = (value: number) =>
    padding.left +
    ((value - viewRange.min) / (viewRange.max - viewRange.min)) * plotWidth;
  const yScale = (value: number) =>
    height -
    padding.bottom -
    ((value - yMin) / (yMax - yMin)) * plotHeight;

  const buildTicks = (min: number, max: number, count: number) => {
    if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
    if (min === max) return [min];
    const safeCount = Math.max(2, count);
    const step = (max - min) / (safeCount - 1);
    return Array.from({ length: safeCount }, (_, index) => min + step * index);
  };

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  svg.appendChild(defs);

  const axisX = document.createElementNS("http://www.w3.org/2000/svg", "line");
  axisX.setAttribute("x1", `${padding.left}`);
  axisX.setAttribute("x2", `${width - padding.right}`);
  axisX.setAttribute("y1", `${height - padding.bottom}`);
  axisX.setAttribute("y2", `${height - padding.bottom}`);
  axisX.setAttribute("class", "plot-view-axis");
  axisX.setAttribute("data-axis", "x");
  axisX.setAttribute("pointer-events", "stroke");
  svg.appendChild(axisX);

  const axisY = document.createElementNS("http://www.w3.org/2000/svg", "line");
  axisY.setAttribute("x1", `${padding.left}`);
  axisY.setAttribute("x2", `${padding.left}`);
  axisY.setAttribute("y1", `${padding.top}`);
  axisY.setAttribute("y2", `${height - padding.bottom}`);
  axisY.setAttribute("class", "plot-view-axis");
  axisY.setAttribute("data-axis", "y");
  axisY.setAttribute("pointer-events", "stroke");
  svg.appendChild(axisY);

  if (viewRange.min <= 0 && viewRange.max >= 0) {
    const zeroLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    const xZero = xScale(0);
    zeroLine.setAttribute("x1", `${xZero}`);
    zeroLine.setAttribute("x2", `${xZero}`);
    zeroLine.setAttribute("y1", `${padding.top}`);
    zeroLine.setAttribute("y2", `${height - padding.bottom}`);
    zeroLine.setAttribute("class", "plot-view-axis-zero");
    svg.appendChild(zeroLine);
  }
  if (yMin <= 0 && yMax >= 0) {
    const zeroLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    const yZero = yScale(0);
    zeroLine.setAttribute("x1", `${padding.left}`);
    zeroLine.setAttribute("x2", `${width - padding.right}`);
    zeroLine.setAttribute("y1", `${yZero}`);
    zeroLine.setAttribute("y2", `${yZero}`);
    zeroLine.setAttribute("class", "plot-view-axis-zero");
    svg.appendChild(zeroLine);
  }

  const xTickCount = Math.min(7, Math.max(5, Math.round(plotWidth / 160) + 1));
  const xTicks = buildTicks(viewRange.min, viewRange.max, xTickCount);
  xTicks.forEach((tick) => {
    const x = xScale(tick);
    const tickLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    tickLine.setAttribute("x1", `${x}`);
    tickLine.setAttribute("x2", `${x}`);
    tickLine.setAttribute("y1", `${height - padding.bottom}`);
    tickLine.setAttribute("y2", `${height - padding.bottom + 6}`);
    tickLine.setAttribute("class", "plot-view-axis-tick");
    svg.appendChild(tickLine);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", `${x}`);
    label.setAttribute("y", `${height - padding.bottom + 18}`);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("class", "plot-view-axis-text");
    label.textContent = formatPlotValue(tick);
    svg.appendChild(label);
  });

  const yTickCount = Math.min(7, Math.max(5, Math.round(plotHeight / 140) + 1));
  const yTicks = buildTicks(yMin, yMax, yTickCount);
  yTicks.forEach((tick) => {
    const y = yScale(tick);
    const tickLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    tickLine.setAttribute("x1", `${padding.left - 6}`);
    tickLine.setAttribute("x2", `${padding.left}`);
    tickLine.setAttribute("y1", `${y}`);
    tickLine.setAttribute("y2", `${y}`);
    tickLine.setAttribute("class", "plot-view-axis-tick");
    svg.appendChild(tickLine);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", `${padding.left - 8}`);
    label.setAttribute("y", `${y + 4}`);
    label.setAttribute("text-anchor", "end");
    label.setAttribute("class", "plot-view-axis-text");
    label.textContent = formatPlotValue(tick);
    svg.appendChild(label);
  });

  const xLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
  xLabel.setAttribute("x", `${padding.left + plotWidth / 2}`);
  xLabel.setAttribute("y", `${height - 10}`);
  xLabel.setAttribute("text-anchor", "middle");
  xLabel.setAttribute("class", "plot-view-axis-label");
  xLabel.textContent = model.x ? model.x : "x";
  svg.appendChild(xLabel);

  const yLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
  yLabel.setAttribute("x", "12");
  yLabel.setAttribute("y", `${padding.top + plotHeight / 2}`);
  yLabel.setAttribute("text-anchor", "middle");
  yLabel.setAttribute("class", "plot-view-axis-label");
  yLabel.setAttribute("transform", `rotate(-90 12 ${padding.top + plotHeight / 2})`);
  if (model.series.length > 1) {
    yLabel.textContent = "y";
  } else {
    const label = model.series[0]?.label || model.series[0]?.expression || model.expression;
    yLabel.textContent = label || "y";
  }
  svg.appendChild(yLabel);

  const lineElements = new Map<number, SVGPathElement>();
  const epsilon = 1e-9;

  model.series.forEach((series, index) => {
    const seriesLayout = seriesLayouts[index];
    if (!seriesLayout || seriesLayout.points.length === 0) return;
    const currentPoint =
      model.currentX !== undefined &&
      series.currentY !== undefined &&
      series.currentY !== null &&
      model.currentX >= viewRange.min &&
      model.currentX <= viewRange.max
        ? { x: model.currentX, y: series.currentY }
        : null;

    let pathData = "";
    const pathPoints: Array<{ x: number; y: number }> = [];
    let hasStarted = false;
    let insertedCurrent = false;
    for (const point of seriesLayout.points) {
      if (currentPoint && !insertedCurrent && currentPoint.x < point.x - epsilon) {
        const x = xScale(currentPoint.x);
        const y = yScale(currentPoint.y);
        if (!hasStarted) {
          pathData += `M ${x} ${y}`;
          hasStarted = true;
        } else {
          pathData += ` L ${x} ${y}`;
        }
        pathPoints.push({ x, y });
        insertedCurrent = true;
      }
      let yValue = point.y;
      if (currentPoint && !insertedCurrent && Math.abs(point.x - currentPoint.x) <= epsilon) {
        yValue = currentPoint.y;
        insertedCurrent = true;
      }
      const x = xScale(point.x);
      const y = yScale(yValue);
      if (!hasStarted) {
        pathData += `M ${x} ${y}`;
        hasStarted = true;
      } else {
        pathData += ` L ${x} ${y}`;
      }
      pathPoints.push({ x, y });
    }
    if (currentPoint && !insertedCurrent) {
      const x = xScale(currentPoint.x);
      const y = yScale(currentPoint.y);
      if (!hasStarted) {
        pathData += `M ${x} ${y}`;
      } else {
        pathData += ` L ${x} ${y}`;
      }
      pathPoints.push({ x, y });
    }

    if (pathData) {
      if (pathPoints.length > 1) {
        const gradientId = `plot-series-fill-${index}`;
        const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
        gradient.setAttribute("id", gradientId);
        gradient.setAttribute("x1", "0");
        gradient.setAttribute("y1", "0");
        gradient.setAttribute("x2", "0");
        gradient.setAttribute("y2", "1");
        const stopTop = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        stopTop.setAttribute("offset", "0%");
        stopTop.setAttribute("stop-color", seriesLayout.color);
        stopTop.setAttribute("stop-opacity", "0.35");
        const stopBottom = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        stopBottom.setAttribute("offset", "100%");
        stopBottom.setAttribute("stop-color", seriesLayout.color);
        stopBottom.setAttribute("stop-opacity", "0");
        gradient.appendChild(stopTop);
        gradient.appendChild(stopBottom);
        defs.appendChild(gradient);

        const baseline = yScale(yMin);
        let areaData = `M ${pathPoints[0].x} ${baseline}`;
        areaData += ` L ${pathPoints[0].x} ${pathPoints[0].y}`;
        for (let i = 1; i < pathPoints.length; i++) {
          areaData += ` L ${pathPoints[i].x} ${pathPoints[i].y}`;
        }
        areaData += ` L ${pathPoints[pathPoints.length - 1].x} ${baseline} Z`;
        const area = document.createElementNS("http://www.w3.org/2000/svg", "path");
        area.setAttribute("d", areaData);
        area.setAttribute("class", "plot-view-area");
        area.setAttribute("fill", `url(#${gradientId})`);
        svg.appendChild(area);
      }
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathData);
      path.setAttribute("class", "plot-view-line");
      path.setAttribute("data-series-index", String(index));
      path.style.stroke = seriesLayout.color;
      svg.appendChild(path);
      lineElements.set(index, path);
    }

    if (currentPoint) {
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", `${xScale(currentPoint.x)}`);
      dot.setAttribute("cy", `${yScale(currentPoint.y)}`);
      dot.setAttribute("r", "3.5");
      dot.setAttribute("class", "plot-view-dot");
      dot.setAttribute("data-series-index", String(index));
      dot.style.fill = seriesLayout.color;
      svg.appendChild(dot);
    }
  });

  if (seriesLayouts.length > 1) {
    const intersections: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < seriesLayouts.length; i++) {
      for (let j = i + 1; j < seriesLayouts.length; j++) {
        const pointsA = seriesLayouts[i].points;
        const pointsB = seriesLayouts[j].points;
        const length = Math.min(pointsA.length, pointsB.length);
        for (let k = 0; k < length - 1; k++) {
          const a0 = pointsA[k];
          const a1 = pointsA[k + 1];
          const b0 = pointsB[k];
          const b1 = pointsB[k + 1];
          const d0 = a0.y - b0.y;
          const d1 = a1.y - b1.y;
          if (!Number.isFinite(d0) || !Number.isFinite(d1)) continue;
          if (d0 === 0) {
            intersections.push({ x: a0.x, y: a0.y });
            continue;
          }
          if (d0 * d1 < 0) {
            const t = d0 / (d0 - d1);
            const x = a0.x + t * (a1.x - a0.x);
            const y = a0.y + t * (a1.y - a0.y);
            intersections.push({ x, y });
          }
        }
      }
    }
    intersections.forEach((point) => {
      if (point.x < viewRange.min || point.x > viewRange.max) return;
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", `${xScale(point.x)}`);
      dot.setAttribute("cy", `${yScale(point.y)}`);
      dot.setAttribute("r", "4");
      dot.setAttribute("class", "plot-view-intersection-dot");
      svg.appendChild(dot);
    });
  }

  return {
    svg,
    layout: {
      width,
      height,
      padding,
      viewRange,
      yMin,
      yMax,
      xScale,
      yScale,
      series: seriesLayouts,
    },
    lineElements,
  };
};

const createPlotWidget = (
  model: PlotViewModel,
  onDetach?: (model: PlotViewModel) => void,
  onUpdate?: (patch: {
    domain?: PlotRange | null;
    view?: PlotRange | null;
    yDomain?: PlotRange | null;
    yView?: PlotRange | null;
  }) => void,
  onClose?: () => void,
  editorView?: EditorView | null
): HTMLElement => {
  let currentXView: PlotRange | undefined = model.view || model.domain;
  let currentYView: PlotRange | undefined = model.yView || model.yDomain;
  let yViewAuto = model.yViewAuto ?? true;
  let yDomainAuto = model.yDomainAuto ?? true;
  let drawWithView: ((nextX: PlotRange | undefined, nextY: PlotRange | undefined) => void) | null =
    null;
  const container = document.createElement("div");
  container.className = `plot-view plot-view-size-${model.size}`;
  container.setAttribute("data-plot-source", model.source);
  if (model.x) container.setAttribute("data-plot-x", model.x);
  if (model.targetLine) {
    container.setAttribute("data-plot-line", String(model.targetLine));
  }

  const header = document.createElement("div");
  header.className = "plot-view-header";

  const title = document.createElement("div");
  title.className = "plot-view-title";
  const xLabel = model.x ? ` x=${model.x}` : "";
  const seriesLabels = model.series
    .map((series) => series.label || series.expression)
    .filter(Boolean);
  let titleText = "Plot";
  if (seriesLabels.length === 1) {
    titleText = seriesLabels[0] as string;
  } else if (seriesLabels.length > 1) {
    titleText = `Plot (${seriesLabels.join(", ")})`;
  }
  title.textContent = `${titleText}${xLabel}`;

  const actions = document.createElement("div");
  actions.className = "plot-view-actions";

  if (model.source === "transient") {
    const detach = document.createElement("button");
    detach.type = "button";
    detach.className = "plot-view-action plot-view-detach";
    detach.textContent = "Detach view";
    if (onDetach) {
      const handleDetach = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        onDetach(model);
      };
      detach.addEventListener("mousedown", handleDetach);
      detach.addEventListener("click", handleDetach);
    }
    actions.appendChild(detach);
  }
  if (onClose) {
    const close = document.createElement("button");
    close.type = "button";
    close.className = "plot-view-action plot-view-close";
    close.textContent = "x";
    close.setAttribute("aria-label", "Close plot");
    close.title = "Close plot";
    const handleClose = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    close.addEventListener("mousedown", handleClose);
    close.addEventListener("click", handleClose);
    actions.appendChild(close);
  }

  header.appendChild(title);
  header.appendChild(actions);
  container.appendChild(header);

  if (model.status === "connected" && model.domain && onUpdate) {
    const controls = document.createElement("div");
    controls.className = "plot-view-controls";

    const formatValue = (value: number) => {
      if (!Number.isFinite(value)) return "";
      const rounded = Math.abs(value) >= 100 ? value.toFixed(2) : value.toFixed(4);
      return rounded.replace(/\.?0+$/, "");
    };

    const createNumberInput = (value: number, onCommit: (next: number) => void) => {
      const input = document.createElement("input");
      input.type = "number";
      input.step = "any";
      input.value = formatValue(value);
      input.addEventListener("change", () => {
        const parsed = Number(input.value);
        if (!Number.isFinite(parsed)) return;
        onCommit(parsed);
      });
      return input;
    };

    const buildViewRow = (
      label: string,
      domain: PlotRange,
      currentView: PlotRange | undefined,
      updateView: (next: PlotRange) => void,
      onCommit: (next: PlotRange) => void
    ) => {
      const row = document.createElement("div");
      row.className = "plot-view-control";
      const rowLabel = document.createElement("span");
      rowLabel.textContent = label;
      row.appendChild(rowLabel);

      const domainSpan = domain.max - domain.min;
      const activeView = currentView || domain;
      const viewSpan = activeView.max - activeView.min;
      const viewCenter = activeView.min + viewSpan / 2;
      const zoomValue = Math.max(0.1, Math.min(1, viewSpan / domainSpan));

      const zoomInput = document.createElement("input");
      zoomInput.type = "range";
      zoomInput.min = "0.1";
      zoomInput.max = "1";
      zoomInput.step = "0.01";
      zoomInput.value = zoomValue.toString();

      const panInput = document.createElement("input");
      panInput.type = "range";
      panInput.min = "0";
      panInput.max = "1";
      panInput.step = "0.01";
      const panRange = Math.max(0, domainSpan - viewSpan);
      const panValue =
        panRange === 0 ? 0.5 : (viewCenter - domain.min - viewSpan / 2) / panRange;
      panInput.value = Math.max(0, Math.min(1, panValue)).toString();

      const syncSliders = (nextView: PlotRange) => {
        const nextSpan = nextView.max - nextView.min;
        const nextZoom = Math.max(0.1, Math.min(1, nextSpan / domainSpan));
        zoomInput.value = nextZoom.toString();
        const nextPanRange = Math.max(0, domainSpan - nextSpan);
        const nextPanValue =
          nextPanRange === 0 ? 0.5 : (nextView.min - domain.min) / nextPanRange;
        panInput.value = Math.max(0, Math.min(1, nextPanValue)).toString();
      };

      const computeZoomView = () => {
        const zoom = Number(zoomInput.value);
        if (!Number.isFinite(zoom)) return null;
        const nextSpan = domainSpan * zoom;
        const center =
          currentView
            ? currentView.min + (currentView.max - currentView.min) / 2
            : viewCenter;
        return { min: center - nextSpan / 2, max: center + nextSpan / 2 };
      };

      zoomInput.addEventListener("input", () => {
        const nextView = computeZoomView();
        if (!nextView) return;
        currentView = nextView;
        updateView(nextView);
        syncSliders(nextView);
      });
      zoomInput.addEventListener("change", () => {
        const nextView = computeZoomView();
        if (!nextView) return;
        onCommit(nextView);
      });

      const computePanView = () => {
        const pan = Number(panInput.value);
        if (!Number.isFinite(pan)) return null;
        const span = currentView ? currentView.max - currentView.min : viewSpan;
        const nextMin = domain.min + (domainSpan - span) * pan;
        return { min: nextMin, max: nextMin + span };
      };

      panInput.addEventListener("input", () => {
        const nextView = computePanView();
        if (!nextView) return;
        currentView = nextView;
        updateView(nextView);
        syncSliders(nextView);
      });
      panInput.addEventListener("change", () => {
        const nextView = computePanView();
        if (!nextView) return;
        onCommit(nextView);
      });

      const zoomLabel = document.createElement("span");
      zoomLabel.textContent = "Zoom";
      const panLabel = document.createElement("span");
      panLabel.textContent = "Pan";
      row.appendChild(zoomLabel);
      row.appendChild(zoomInput);
      row.appendChild(panLabel);
      row.appendChild(panInput);

      return row;
    };

    const buildDomainRow = (
      label: string,
      domain: PlotRange,
      sliderClass: string,
      resetLabel: string,
      onPreview: (next: PlotRange) => void,
      onCommit: (next: PlotRange) => void,
      onReset: () => void
    ) => {
      const row = document.createElement("div");
      row.className = "plot-view-control plot-view-domain-control";
      const rowLabel = document.createElement("span");
      rowLabel.textContent = label;
      row.appendChild(rowLabel);

      let currentDomain = { ...domain };
      let minInput: HTMLInputElement;
      let maxInput: HTMLInputElement;
      let minSlider: HTMLInputElement;
      let maxSlider: HTMLInputElement;
      let fill: HTMLDivElement;
      let dragHandle: HTMLDivElement;
      const updateRange = (nextDomain: PlotRange) => {
        const span = Math.max(1e-9, nextDomain.max - nextDomain.min);
        const rangeMin = nextDomain.min - span;
        const rangeMax = nextDomain.max + span;
        const step = Math.max(span / 200, 1e-6);
        minSlider.min = rangeMin.toString();
        minSlider.max = rangeMax.toString();
        maxSlider.min = rangeMin.toString();
        maxSlider.max = rangeMax.toString();
        minSlider.step = step.toString();
        maxSlider.step = step.toString();
      };

      const syncInputs = (nextDomain: PlotRange) => {
        minInput.value = formatValue(nextDomain.min);
        maxInput.value = formatValue(nextDomain.max);
        minSlider.value = String(nextDomain.min);
        maxSlider.value = String(nextDomain.max);
        const rangeMin = Number(minSlider.min);
        const rangeMax = Number(minSlider.max);
        const rangeSpan = Math.max(1e-9, rangeMax - rangeMin);
        const start = ((nextDomain.min - rangeMin) / rangeSpan) * 100;
        const end = ((nextDomain.max - rangeMin) / rangeSpan) * 100;
        fill.style.left = `${Math.max(0, Math.min(100, start))}%`;
        fill.style.width = `${Math.max(0, Math.min(100, end - start))}%`;
        dragHandle.style.left = fill.style.left;
        dragHandle.style.width = fill.style.width;
      };

      const applyDomain = (nextDomain: PlotRange, commit: boolean, adjustRange: boolean) => {
        currentDomain = nextDomain;
        if (adjustRange) updateRange(nextDomain);
        syncInputs(nextDomain);
        onPreview(nextDomain);
        if (commit) onCommit(nextDomain);
      };

      minInput = createNumberInput(domain.min, (nextMin) => {
        const max = currentDomain.max;
        if (nextMin >= max) return;
        applyDomain({ min: nextMin, max }, true, true);
      });
      maxInput = createNumberInput(domain.max, (nextMax) => {
        const min = currentDomain.min;
        if (nextMax <= min) return;
        applyDomain({ min, max: nextMax }, true, true);
      });
      row.appendChild(minInput);
      const domainSep = document.createElement("span");
      domainSep.textContent = "to";
      row.appendChild(domainSep);
      row.appendChild(maxInput);

      const resetButton = document.createElement("button");
      resetButton.type = "button";
      resetButton.className = "plot-view-action plot-view-reset";
      resetButton.textContent = resetLabel;
      resetButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        onReset();
      });
      row.appendChild(resetButton);

      const sliderWrap = document.createElement("div");
      sliderWrap.className = "plot-view-domain-slider-stack";
      const track = document.createElement("div");
      track.className = "plot-view-domain-track";
      fill = document.createElement("div");
      fill.className = `plot-view-domain-track-fill ${sliderClass}`;
      track.appendChild(fill);
      sliderWrap.appendChild(track);
      dragHandle = document.createElement("div");
      dragHandle.className = `plot-view-domain-handle ${sliderClass}`;
      dragHandle.setAttribute("aria-label", `${label} range`);
      sliderWrap.appendChild(dragHandle);

      minSlider = document.createElement("input");
      minSlider.type = "range";
      minSlider.className = `plot-view-domain-slider plot-view-domain-slider-min ${sliderClass}`;
      minSlider.setAttribute("aria-label", `${label} min`);

      maxSlider = document.createElement("input");
      maxSlider.type = "range";
      maxSlider.className = `plot-view-domain-slider plot-view-domain-slider-max ${sliderClass}`;
      maxSlider.setAttribute("aria-label", `${label} max`);

      const span = Math.max(1e-9, domain.max - domain.min);
      const rangeMin = domain.min - span;
      const rangeMax = domain.max + span;
      const step = Math.max(span / 200, 1e-6);
      minSlider.min = rangeMin.toString();
      minSlider.max = rangeMax.toString();
      maxSlider.min = rangeMin.toString();
      maxSlider.max = rangeMax.toString();
      minSlider.step = step.toString();
      maxSlider.step = step.toString();
      minSlider.value = String(domain.min);
      maxSlider.value = String(domain.max);

      const minGap = step;

      minSlider.addEventListener("input", () => {
        const nextMin = Number(minSlider.value);
        if (!Number.isFinite(nextMin)) return;
        let nextMax = currentDomain.max;
        let adjustedMin = nextMin;
        if (adjustedMin >= nextMax - minGap) {
          adjustedMin = nextMax - minGap;
          minSlider.value = adjustedMin.toString();
        }
        applyDomain({ min: adjustedMin, max: nextMax }, false, false);
      });
      minSlider.addEventListener("change", () => {
        const nextMin = Number(minSlider.value);
        if (!Number.isFinite(nextMin)) return;
        const nextDomain = { min: nextMin, max: currentDomain.max };
        onCommit(nextDomain);
      });

      maxSlider.addEventListener("input", () => {
        const nextMax = Number(maxSlider.value);
        if (!Number.isFinite(nextMax)) return;
        let nextMin = currentDomain.min;
        let adjustedMax = nextMax;
        if (adjustedMax <= nextMin + minGap) {
          adjustedMax = nextMin + minGap;
          maxSlider.value = adjustedMax.toString();
        }
        applyDomain({ min: nextMin, max: adjustedMax }, false, false);
      });
      maxSlider.addEventListener("change", () => {
        const nextMax = Number(maxSlider.value);
        if (!Number.isFinite(nextMax)) return;
        const nextDomain = { min: currentDomain.min, max: nextMax };
        onCommit(nextDomain);
      });

      dragHandle.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        const rangeMin = Number(minSlider.min);
        const rangeMax = Number(minSlider.max);
        const span = currentDomain.max - currentDomain.min;
        const startDomain = { ...currentDomain };
        const startX = event.clientX;
        const rect = sliderWrap.getBoundingClientRect();
        const onMove = (moveEvent: PointerEvent) => {
          const deltaPx = moveEvent.clientX - startX;
          const ratio = rect.width ? deltaPx / rect.width : 0;
          const delta = ratio * (rangeMax - rangeMin);
          let nextMin = startDomain.min + delta;
          let nextMax = startDomain.max + delta;
          if (nextMin < rangeMin) {
            nextMin = rangeMin;
            nextMax = rangeMin + span;
          }
          if (nextMax > rangeMax) {
            nextMax = rangeMax;
            nextMin = rangeMax - span;
          }
          applyDomain({ min: nextMin, max: nextMax }, false, false);
        };
        const onUp = () => {
          document.removeEventListener("pointermove", onMove);
          document.removeEventListener("pointerup", onUp);
          document.removeEventListener("pointercancel", onUp);
          onCommit(currentDomain);
        };
        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onUp);
        document.addEventListener("pointercancel", onUp);
      });

      sliderWrap.appendChild(minSlider);
      sliderWrap.appendChild(maxSlider);
      syncInputs(currentDomain);
      row.appendChild(sliderWrap);

      return row;
    };

    const domainRow = buildDomainRow(
      "X Domain",
      model.domain,
      "plot-view-domain-slider-x",
      "Reset X",
      (next) => {
        currentXView = next;
        if (drawWithView) drawWithView(currentXView, currentYView);
      },
      (next) => onUpdate({ domain: next, view: next }),
      () => onUpdate({ domain: null, view: null })
    );

    const viewRow = buildViewRow(
      "X View",
      model.domain,
      currentXView,
      (next) => {
        currentXView = next;
        if (drawWithView) drawWithView(currentXView, currentYView);
      },
      (next) => onUpdate({ view: next })
    );

    let yDomainRow: HTMLElement | null = null;
    if (model.yDomain) {
      yDomainRow = buildDomainRow(
        "Y Domain",
        model.yDomain,
        "plot-view-domain-slider-y",
        "Reset Y",
        (next) => {
        currentYView = next;
        yViewAuto = false;
        yDomainAuto = false;
        if (drawWithView) drawWithView(currentXView, currentYView);
      },
      (next) => onUpdate({ yDomain: next, yView: next }),
      () => {
        yViewAuto = true;
        yDomainAuto = true;
        onUpdate({ yDomain: null, yView: null });
      }
    );
  }

    controls.appendChild(domainRow);
    controls.appendChild(viewRow);
    if (yDomainRow) {
      controls.appendChild(yDomainRow);
    }
    if (model.yDomain) {
      const yViewRow = buildViewRow(
        "Y View",
        model.yDomain,
        currentYView,
        (next) => {
          currentYView = next;
          yViewAuto = false;
          if (drawWithView) drawWithView(currentXView, currentYView);
        },
        (next) => onUpdate({ yView: next })
      );
      controls.appendChild(yViewRow);
    }
    container.appendChild(controls);
  }

  const body = document.createElement("div");
  body.className = "plot-view-body";

  if (model.status === "disconnected") {
    container.classList.add("plot-view-disconnected");
    const message = document.createElement("div");
    message.className = "plot-view-message";
    message.textContent = model.message || "Disconnected";
    body.appendChild(message);
  } else {
    const chart = document.createElement("div");
    chart.className = "plot-view-chart";
    chart.style.touchAction = "none";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    chart.appendChild(svg);
    const tooltip = document.createElement("div");
    tooltip.className = "plot-view-tooltip";
    tooltip.style.opacity = "0";
    chart.appendChild(tooltip);
    const legend = document.createElement("div");
    legend.className = "plot-view-legend";
    legend.style.opacity = "0";
    chart.appendChild(legend);

    let plotLayout: PlotSvgLayout | null = null;
    let hoverDot: SVGCircleElement | null = null;
    let lineElements = new Map<number, SVGPathElement>();
    let activeSeriesIndex: number | null = null;
    let draggingSeriesIndex: number | null = null;
    let dragMode: "line" | "pan" | "zoom-x" | "zoom-y" | null = null;
    let dragStartPos: { x: number; y: number } | null = null;
    let dragStartXView: PlotRange | null = null;
    let dragStartYView: PlotRange | null = null;

    const updateLineHighlight = (index: number | null) => {
      lineElements.forEach((line, seriesIndex) => {
        line.classList.toggle("is-hover", index === seriesIndex);
      });
    };

    const hideHover = () => {
      if (hoverDot) hoverDot.style.opacity = "0";
      tooltip.style.opacity = "0";
      legend.style.opacity = "0";
      activeSeriesIndex = null;
      updateLineHighlight(null);
    };

    const showHover = (
      seriesIndex: number,
      screenX: number,
      screenY: number,
      dataX: number,
      dataY: number
    ) => {
      activeSeriesIndex = seriesIndex;
      updateLineHighlight(seriesIndex);
      if (hoverDot) {
        hoverDot.setAttribute("cx", `${screenX}`);
        hoverDot.setAttribute("cy", `${screenY}`);
        const seriesColor = model.series[seriesIndex]?.color;
        if (seriesColor) hoverDot.style.fill = seriesColor;
        hoverDot.style.opacity = "1";
      }

      const series = model.series[seriesIndex];
      const label = series?.label || series?.expression;
      const lines = [];
      if (label && model.series.length > 1) {
        lines.push(label);
      }
      lines.push(`${model.x || "x"} = ${formatPlotValueWithUnit(dataX, model.xUnit)}`);
      lines.push(`y = ${formatPlotValueWithUnit(dataY, series?.unit)}`);
      if (model.series.length > 1 && plotLayout) {
        const compareIndex = seriesIndex === 0 ? 1 : 0;
        const compareValue = getSeriesValueAtX(compareIndex, dataX);
        if (compareValue !== null) {
          const compareSeries = model.series[compareIndex];
          const delta = dataY - compareValue;
          const compareLabel =
            compareSeries?.label || compareSeries?.expression || `Series ${compareIndex + 1}`;
          lines.push(
            `Δ to ${compareLabel} = ${formatPlotValueWithUnit(delta, series?.unit)}`
          );
        }
      }
      tooltip.textContent = lines.join("\n");
      if (series?.color) {
        tooltip.style.borderColor = series.color;
      }
      if (model.series.length > 1) {
        legend.innerHTML = model.series
          .map((entry, index) => {
            const labelText = entry.label || entry.expression || `Series ${index + 1}`;
            const color = entry.color || "var(--color-text-primary)";
            return `<span class="plot-view-legend-item"><span class="plot-view-legend-swatch" style="background:${color}"></span>${labelText}</span>`;
          })
          .join("");
        legend.style.opacity = "1";
      }
      const rect = svg.getBoundingClientRect();
      const pixelX = rect.width ? (screenX / (plotLayout?.width || 1)) * rect.width : 0;
      const pixelY = rect.height ? (screenY / (plotLayout?.height || 1)) * rect.height : 0;
      tooltip.style.left = `${Math.round(pixelX + 12)}px`;
      tooltip.style.top = `${Math.round(pixelY - 24)}px`;
      tooltip.style.opacity = "1";
    };

    const getSeriesValueAtX = (seriesIndex: number, xValue: number) => {
      if (!plotLayout) return null;
      const series = plotLayout.series[seriesIndex];
      if (!series || series.points.length < 2) return null;
      const points = series.points;
      if (xValue <= points[0].x) return points[0].y;
      if (xValue >= points[points.length - 1].x) return points[points.length - 1].y;
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        if (xValue >= p1.x && xValue <= p2.x) {
          const span = p2.x - p1.x;
          const t = span === 0 ? 0 : (xValue - p1.x) / span;
          return p1.y + t * (p2.y - p1.y);
        }
      }
      return null;
    };

    const getPointerPosition = (event: MouseEvent | PointerEvent) => {
      if (!plotLayout) return null;
      const rect = svg.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      const scaleX = plotLayout.width / rect.width;
      const scaleY = plotLayout.height / rect.height;
      return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
      };
    };

    const clampViewToDomain = (view: PlotRange, domain?: PlotRange | null) => {
      if (!domain) return view;
      const span = view.max - view.min;
      if (span <= 0) return view;
      let min = view.min;
      let max = view.max;
      if (min < domain.min) {
        min = domain.min;
        max = min + span;
      }
      if (max > domain.max) {
        max = domain.max;
        min = max - span;
      }
      return { min, max };
    };

    const findNearestPoint = (
      position: { x: number; y: number },
      onlySeries: number | null,
      threshold: number | null
    ) => {
      if (!plotLayout) return null;
      let best: {
        seriesIndex: number;
        screenX: number;
        screenY: number;
        dataX: number;
        dataY: number;
        dist2: number;
      } | null = null;
      const thresholdSq = threshold !== null ? threshold * threshold : null;
      plotLayout.series.forEach((series) => {
        if (onlySeries !== null && series.index !== onlySeries) return;
        const points = series.points;
        if (points.length === 0) return;
        if (points.length === 1) {
          const single = points[0];
          const sx = plotLayout.xScale(single.x);
          const sy = plotLayout.yScale(single.y);
          const dist2 = (position.x - sx) ** 2 + (position.y - sy) ** 2;
          if (!best || dist2 < best.dist2) {
            best = {
              seriesIndex: series.index,
              screenX: sx,
              screenY: sy,
              dataX: single.x,
              dataY: single.y,
              dist2,
            };
          }
          return;
        }
        for (let i = 0; i < points.length - 1; i++) {
          const p1 = points[i];
          const p2 = points[i + 1];
          const x1 = plotLayout.xScale(p1.x);
          const y1 = plotLayout.yScale(p1.y);
          const x2 = plotLayout.xScale(p2.x);
          const y2 = plotLayout.yScale(p2.y);
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len2 = dx * dx + dy * dy;
          let t = len2 > 0 ? ((position.x - x1) * dx + (position.y - y1) * dy) / len2 : 0;
          t = Math.max(0, Math.min(1, t));
          const projX = x1 + t * dx;
          const projY = y1 + t * dy;
          const dist2 = (position.x - projX) ** 2 + (position.y - projY) ** 2;
          if (!best || dist2 < best.dist2) {
            best = {
              seriesIndex: series.index,
              screenX: projX,
              screenY: projY,
              dataX: p1.x + t * (p2.x - p1.x),
              dataY: p1.y + t * (p2.y - p1.y),
              dist2,
            };
          }
        }
      });
      if (!best) return null;
      if (thresholdSq !== null && best.dist2 > thresholdSq) return null;
      return best;
    };

    const updateVariableValue = (nextValue: number) => {
      if (!Number.isFinite(nextValue)) return false;
      if (!editorView || !model.x) return false;
      const lineIndex = buildLineIndex(editorView.state.doc);
      let targetLine: number | null = null;
      for (let i = 1; i < lineIndex.length; i++) {
        const info = lineIndex[i];
        if (!info) continue;
        const parsed = parseLine(info.text, i);
        if (isVariableAssignmentNode(parsed) && parsed.variableName === model.x) {
          targetLine = i;
        }
        if (isCombinedAssignmentNode(parsed) && parsed.variableName === model.x) {
          targetLine = i;
        }
      }
      if (!targetLine) return false;
      const info = lineIndex[targetLine];
      if (!info) return false;
      const lineText = info.text;
      const eqIndex = lineText.indexOf("=");
      if (eqIndex === -1) return false;
      const valueText = lineText.slice(eqIndex + 1);
      const match = valueText.match(/[+-]?\d[\d,]*(?:\.\d+)?(?:[eE][+-]?\d+)?/);
      if (!match || match.index === undefined) return false;
      const numberText = match[0];
      const dotIndex = numberText.indexOf(".");
      const exponentIndex = numberText.search(/[eE]/);
      const decimalPart =
        dotIndex >= 0
          ? numberText.slice(dotIndex + 1, exponentIndex >= 0 ? exponentIndex : undefined)
          : "";
      const decimalPlaces = decimalPart.length;
      const formatted =
        decimalPlaces === 0 ? Math.round(nextValue).toString() : nextValue.toFixed(decimalPlaces);
      const from = info.start + eqIndex + 1 + match.index;
      const to = from + numberText.length;
      const tr = editorView.state.tr.replaceWith(
        from,
        to,
        editorView.state.schema.text(formatted)
      );
      editorView.dispatch(tr);
      return true;
    };

    const handlePointerMove = (event: MouseEvent | PointerEvent) => {
      if (!plotLayout) return;
      const position = getPointerPosition(event);
      if (!position) return;
      if (dragMode === "line" && draggingSeriesIndex !== null) {
        const nearest = findNearestPoint(position, draggingSeriesIndex, null);
        if (nearest) {
          showHover(
            nearest.seriesIndex,
            nearest.screenX,
            nearest.screenY,
            nearest.dataX,
            nearest.dataY
          );
          updateVariableValue(nearest.dataX);
        }
        return;
      }

      if (dragMode === "pan" && dragStartPos && dragStartXView) {
        const plotWidth =
          plotLayout.width - plotLayout.padding.left - plotLayout.padding.right;
        const plotHeight =
          plotLayout.height - plotLayout.padding.top - plotLayout.padding.bottom;
        const spanX = dragStartXView.max - dragStartXView.min;
        const spanY = dragStartYView
          ? dragStartYView.max - dragStartYView.min
          : 0;
        const deltaX = plotWidth ? (position.x - dragStartPos.x) / plotWidth : 0;
        const deltaY = plotHeight ? (position.y - dragStartPos.y) / plotHeight : 0;
        const nextXView = clampViewToDomain(
          {
            min: dragStartXView.min - deltaX * spanX,
            max: dragStartXView.max - deltaX * spanX,
          },
          model.domain
        );
        currentXView = nextXView;
        if (dragStartYView) {
          const nextYView = {
            min: dragStartYView.min + deltaY * spanY,
            max: dragStartYView.max + deltaY * spanY,
          };
          currentYView = yDomainAuto ? nextYView : clampViewToDomain(nextYView, model.yDomain);
          yViewAuto = false;
        }
        if (drawWithView) drawWithView(currentXView, currentYView);
        return;
      }

      if (dragMode === "zoom-x" && dragStartPos && dragStartXView) {
        const delta = position.x - dragStartPos.x;
        const scale = Math.max(0.2, 1 + delta / 200);
        const center = (dragStartXView.min + dragStartXView.max) / 2;
        const span = (dragStartXView.max - dragStartXView.min) * scale;
        const nextXView = clampViewToDomain(
          { min: center - span / 2, max: center + span / 2 },
          model.domain
        );
        currentXView = nextXView;
        if (drawWithView) drawWithView(currentXView, currentYView);
        return;
      }

      if (dragMode === "zoom-y" && dragStartPos && dragStartYView) {
        const delta = position.y - dragStartPos.y;
        const scale = Math.max(0.2, 1 + delta / 200);
        const center = (dragStartYView.min + dragStartYView.max) / 2;
        const span = (dragStartYView.max - dragStartYView.min) * scale;
        const nextYView = { min: center - span / 2, max: center + span / 2 };
        currentYView = yDomainAuto ? nextYView : clampViewToDomain(nextYView, model.yDomain);
        yViewAuto = false;
        if (drawWithView) drawWithView(currentXView, currentYView);
        return;
      }

      const nearest = findNearestPoint(position, null, 10);
      if (!nearest) {
        hideHover();
        return;
      }
      showHover(
        nearest.seriesIndex,
        nearest.screenX,
        nearest.screenY,
        nearest.dataX,
        nearest.dataY
      );
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      if (!plotLayout) return;
      const position = getPointerPosition(event);
      if (!position) return;
      const target = event.target as Element | null;
      if (plotLayout) {
        const withinPlotX =
          position.x >= plotLayout.padding.left &&
          position.x <= plotLayout.width - plotLayout.padding.right;
        const withinPlotY =
          position.y >= plotLayout.padding.top &&
          position.y <= plotLayout.height - plotLayout.padding.bottom;
        const insidePlotArea = withinPlotX && withinPlotY;
        const inXAxisZone = withinPlotX && position.y >= plotLayout.height - plotLayout.padding.bottom;
        const inYAxisZone = withinPlotY && position.x <= plotLayout.padding.left;
        const axisFromTarget = target?.closest?.("[data-axis]")?.getAttribute("data-axis");
        const axis =
          axisFromTarget === "x" || axisFromTarget === "y"
            ? axisFromTarget
            : !insidePlotArea && (inXAxisZone || inYAxisZone)
              ? inXAxisZone
                ? "x"
                : "y"
              : null;

        if (axis) {
          if (axis === "y" && !model.yDomain) return;
          event.preventDefault();
          dragMode = axis === "x" ? "zoom-x" : "zoom-y";
          dragStartPos = position;
          dragStartXView = currentXView || model.domain || null;
          dragStartYView = currentYView || model.yDomain || null;
          if (isPlotDebugEnabled()) {
            logPlotDebug("[plot] drag start", {
              axis,
              dragStartXView,
              dragStartYView,
              yDomain: model.yDomain,
            });
          }
        } else {
          const dragThreshold = 6;
          const nearest = findNearestPoint(position, null, dragThreshold);
          if (nearest) {
            event.preventDefault();
            showHover(
              nearest.seriesIndex,
              nearest.screenX,
              nearest.screenY,
              nearest.dataX,
              nearest.dataY
            );
            const updated = updateVariableValue(nearest.dataX);
            if (updated) {
              draggingSeriesIndex = nearest.seriesIndex;
              dragMode = "line";
            } else {
              dragMode = "pan";
              dragStartPos = position;
              dragStartXView = currentXView || model.domain || null;
              dragStartYView = currentYView || model.yDomain || null;
            }
          } else {
            event.preventDefault();
            dragMode = "pan";
            dragStartPos = position;
            dragStartXView = currentXView || model.domain || null;
            dragStartYView = currentYView || model.yDomain || null;
          }
        }
      }

      const onMove = (moveEvent: PointerEvent) => handlePointerMove(moveEvent);
      const onUp = () => {
        if (isPlotDebugEnabled()) {
          logPlotDebug("[plot] drag end", {
            mode: dragMode,
            currentXView,
            currentYView,
            yDomain: model.yDomain,
          });
        }
        if (dragMode === "pan" || dragMode === "zoom-x") {
          if (onUpdate && currentXView) {
            onUpdate({ view: currentXView });
          }
        }
        if (dragMode === "pan" || dragMode === "zoom-y") {
          if (onUpdate && currentYView) {
            const patch: { yView: PlotRange; yDomain?: PlotRange } = {
              yView: currentYView,
            };
            if (yDomainAuto) {
              const expanded = expandPlotRange(currentYView, 6);
              if (expanded) {
                patch.yDomain = expanded;
              }
              yDomainAuto = false;
            }
            onUpdate(patch);
          }
        }
        dragMode = null;
        draggingSeriesIndex = null;
        dragStartPos = null;
        dragStartXView = null;
        dragStartYView = null;
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("pointercancel", onUp);
      };
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
    };

    chart.addEventListener("mousemove", handlePointerMove);
    chart.addEventListener("mouseleave", () => {
      if (!dragMode) hideHover();
    });
    chart.addEventListener("pointerdown", handlePointerDown);
    chart.addEventListener("dblclick", (event) => {
      event.preventDefault();
      if (model.domain) {
        currentXView = model.domain;
      }
      if (model.yDomain) {
        currentYView = model.yDomain;
      }
      if (drawWithView) drawWithView(currentXView, currentYView);
      if (onUpdate) {
        const patch: { view?: PlotRange | null; yView?: PlotRange | null } = {};
        if (currentXView) patch.view = currentXView;
        if (currentYView) patch.yView = currentYView;
        if (Object.keys(patch).length) {
          onUpdate(patch);
        }
      }
    });
    const draw = (xOverride?: PlotRange, yOverride?: PlotRange) => {
      if (xOverride) currentXView = xOverride;
      if (yOverride) currentYView = yOverride;
      const width = Math.max(1, chart.clientWidth);
      const height = Math.max(1, chart.clientHeight);
      while (svg.firstChild) {
        svg.removeChild(svg.firstChild);
      }
      const rendered = createPlotSvg(
        model,
        width,
        height,
        currentXView,
        currentYView,
        yViewAuto
      );
      if (isPlotDebugEnabled()) {
        logPlotDebug("[plot] draw", {
          line: model.targetLine,
          xView: currentXView,
          yView: currentYView,
          yDomain: model.yDomain,
          yViewAuto,
          yDomainAuto,
          rendered: Boolean(rendered),
        });
      }
      if (rendered) {
        svg.setAttribute("viewBox", rendered.svg.getAttribute("viewBox") || `0 0 ${width} ${height}`);
        Array.from(rendered.svg.childNodes).forEach((node) => svg.appendChild(node));
        plotLayout = rendered.layout;
        lineElements = rendered.lineElements;
        hoverDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        hoverDot.setAttribute("r", "4.5");
        hoverDot.setAttribute("class", "plot-view-hover-dot");
        hoverDot.style.opacity = "0";
        svg.appendChild(hoverDot);
        hideHover();
      } else {
        const message = document.createElementNS("http://www.w3.org/2000/svg", "text");
        message.setAttribute("x", `${width / 2}`);
        message.setAttribute("y", `${height / 2}`);
        message.setAttribute("text-anchor", "middle");
        message.setAttribute("class", "plot-view-axis-text");
        message.textContent = "No plottable data";
        svg.appendChild(message);
        plotLayout = null;
        lineElements = new Map();
        hoverDot = null;
        hideHover();
      }
    };
    drawWithView = (nextX: PlotRange | undefined, nextY: PlotRange | undefined) =>
      draw(nextX, nextY);
    requestAnimationFrame(() => draw(currentXView, currentYView));
    body.appendChild(chart);
  }

  container.appendChild(body);
  return container;
};

const buildSettingsSnapshot = (settings: any) => ({
  decimalPlaces: settings.decimalPlaces,
  scientificUpperThreshold: Math.pow(10, settings.scientificUpperExponent ?? 12),
  scientificLowerThreshold: Math.pow(10, settings.scientificLowerExponent ?? -4),
  scientificTrimTrailingZeros: settings.scientificTrimTrailingZeros,
  groupThousands: settings.groupThousands,
  dateDisplayFormat: settings.dateDisplayFormat,
  dateLocale: getDateLocaleEffective(),
});

export const PlotViewExtension = Extension.create({
  name: "plotView",

  addProseMirrorPlugins() {
    let currentView: EditorView | null = null;
    const getVariableContext =
      this.options.getVariableContext || (() => new Map<string, Variable>());
    const getSettings = this.options.getSettings || (() => ({}));

    return [
      new Plugin({
        key: plotViewPluginKey,

        state: {
          init() {
            return {
              selecting: false,
              selectionLine: undefined,
              transient: undefined,
              viewNodes: [],
              overrides: {},
            } as PlotViewState;
          },
          apply(tr, oldState) {
            const meta = tr.getMeta(plotViewPluginKey);
            if (meta) {
              return meta as PlotViewState;
            }
            if (tr.docChanged && oldState) {
              return {
                ...oldState,
                viewNodes: oldState.viewNodes,
              } as PlotViewState;
            }
            return oldState as PlotViewState;
          },
        },

        props: {
          decorations(state) {
            const pluginState = plotViewPluginKey.getState(state) as PlotViewState;
            if (!pluginState) return DecorationSet.empty;

            const lineIndex = buildLineIndex(state.doc);
            const decorations: Decoration[] = [];
            const handleOverrideUpdate = (
              key: string,
              patch: {
                domain?: PlotRange | null;
                view?: PlotRange | null;
                yDomain?: PlotRange | null;
                yView?: PlotRange | null;
              }
            ) => {
              if (!currentView) return;
              const existingState = plotViewPluginKey.getState(currentView.state) as PlotViewState;
              const overrides = { ...(existingState.overrides || {}) };
              const currentOverride = { ...(overrides[key] || {}) };
              if (isPlotDebugEnabled()) {
                logPlotDebug("[plot] override patch", { key, patch, currentOverride });
              }

              if ("domain" in patch) {
                if (patch.domain) {
                  currentOverride.domain = { ...patch.domain };
                } else {
                  delete currentOverride.domain;
                }
              }
              if ("view" in patch) {
                if (patch.view) {
                  currentOverride.view = { ...patch.view };
                } else {
                  delete currentOverride.view;
                }
              }
              if ("yDomain" in patch) {
                if (patch.yDomain) {
                  currentOverride.yDomain = { ...patch.yDomain };
                } else {
                  delete currentOverride.yDomain;
                }
              }
              if ("yView" in patch) {
                if (patch.yView) {
                  currentOverride.yView = { ...patch.yView };
                } else {
                  delete currentOverride.yView;
                }
              }

              if (Object.keys(currentOverride).length === 0) {
                delete overrides[key];
              } else {
                overrides[key] = currentOverride;
              }

              if (isPlotDebugEnabled()) {
                logPlotDebug("[plot] override result", { key, override: overrides[key] });
              }

              const tr = currentView.state.tr.setMeta(plotViewPluginKey, {
                ...existingState,
                overrides,
              });
              tr.setMeta("addToHistory", false);
              currentView.dispatch(tr);
            };
            const handleDetach = (model: PlotViewModel) => {
              if (!currentView || !model.targetLine || !model.x) return;
              const info = lineIndex[model.targetLine];
              if (!info) return;
              const paragraph = currentView.state.schema.nodes.paragraph.create(
                null,
                currentView.state.schema.text(`@view plot x=${model.x}`)
              );
              const nextState = plotViewPluginKey.getState(currentView.state) as PlotViewState;
              const tr = currentView.state.tr.insert(info.insertPos, paragraph);
              tr.setMeta(plotViewPluginKey, {
                ...nextState,
                selecting: false,
                transient: undefined,
                selectionLine: undefined,
              });
              currentView.dispatch(tr);
            };
            const handleCloseTransient = (overrideKey: string) => {
              if (!currentView) return;
              const existingState = plotViewPluginKey.getState(currentView.state) as PlotViewState;
              const overrides = { ...(existingState.overrides || {}) };
              delete overrides[overrideKey];
              const tr = currentView.state.tr.setMeta(plotViewPluginKey, {
                ...existingState,
                selecting: false,
                selectionLine: undefined,
                transient: undefined,
                overrides,
              });
              tr.setMeta("addToHistory", false);
              currentView.dispatch(tr);
            };

            pluginState.viewNodes.forEach((plotNode) => {
              const info = lineIndex[plotNode.line];
              if (!info) return;
              const overrideKey = `persistent-${plotNode.line}`;
              const override = pluginState.overrides?.[overrideKey];
              let model = buildPlotModel(plotNode, "persistent");
              if (model.targetLine && model.x) {
                const settings = buildSettingsSnapshot(getSettings());
                const seriesDefinitions = plotNode.series?.map((entry) => ({
                  label: entry.label,
                  expression: entry.expression,
                }));
                const recomputed = computeModelFromExpression(
                  model.targetLine,
                  model.x,
                  override?.domain,
                  override?.view,
                  override?.yDomain,
                  override?.yView,
                  "persistent",
                  model.size,
                  seriesDefinitions,
                  lineIndex,
                  getVariableContext(),
                  settings
                );
                if (recomputed) {
                  model = recomputed;
                } else if (override) {
                  if (override.domain) model.domain = override.domain;
                  if (override.view) model.view = override.view;
                  if (override.yDomain) model.yDomain = override.yDomain;
                  if (override.yView) model.yView = override.yView;
                }
                if (override?.yView || override?.yDomain) {
                  model.yViewAuto = false;
                }
                if (override?.yDomain) {
                  model.yDomainAuto = false;
                }
              }
              const widget = Decoration.widget(
                info.insertPos,
                () =>
                  createPlotWidget(
                    model,
                    undefined,
                    (patch) => handleOverrideUpdate(overrideKey, patch),
                    undefined,
                    currentView
                  ),
                {
                  key: buildPlotKey(model, plotNode.line),
                  side: 1,
                  ignoreSelection: true,
                  stopEvent: (event) =>
                    (event.target as HTMLElement | null)?.closest?.(".plot-view") !== null,
                }
              );
              decorations.push(widget);
            });

            if (pluginState.transient) {
              const settings = buildSettingsSnapshot(getSettings());
              const overrideKey = `transient-${pluginState.transient.targetLine}`;
              const override = pluginState.overrides?.[overrideKey];
              const model = computeModelFromExpression(
                pluginState.transient.targetLine,
                pluginState.transient.xVariable,
                override?.domain || pluginState.transient.domain,
                override?.view,
                override?.yDomain,
                override?.yView,
                "transient",
                "md",
                undefined,
                lineIndex,
                getVariableContext(),
                settings
              );
              if (model) {
                const info = lineIndex[pluginState.transient.targetLine];
                if (info) {
                  const widget = Decoration.widget(
                    info.insertPos,
                    () =>
                      createPlotWidget(
                        model,
                        handleDetach,
                        (patch) => handleOverrideUpdate(overrideKey, patch),
                        () => handleCloseTransient(overrideKey),
                        currentView
                      ),
                    {
                      key: buildPlotKey(model, pluginState.transient.targetLine),
                      side: 1,
                      ignoreSelection: true,
                      stopEvent: (event) =>
                        (event.target as HTMLElement | null)?.closest?.(".plot-view") !== null,
                    }
                  );
                  decorations.push(widget);
                }
              }
            }

            return DecorationSet.create(state.doc, decorations);
          },

          handleDOMEvents: {
            click: (view, event) => {
              const target = event.target as HTMLElement;
              const pluginState = plotViewPluginKey.getState(view.state) as PlotViewState;
              if (!pluginState) return false;

              const resultTarget = target.closest(
                ".semantic-result-display, .semantic-error-result"
              ) as HTMLElement | null;
              if (resultTarget) {
                const pos = view.posAtDOM(resultTarget, 0);
                if (pos === null || pos === undefined) return false;

                const lineIndex = buildLineIndex(view.state.doc);
                let lineNumber = 0;
                for (let i = 1; i < lineIndex.length; i++) {
                  const info = lineIndex[i];
                  if (!info) continue;
                  if (pos >= info.start && pos <= info.end) {
                    lineNumber = i;
                    break;
                  }
                }
                if (!lineNumber) return false;

                const info = lineIndex[lineNumber];
                if (!info || !info.text.includes("=>")) return false;

                const expressionNode = resolveExpressionNode(info.node, lineNumber);
                if (!expressionNode) return false;

                const tr = view.state.tr.setMeta(plotViewPluginKey, {
                  ...pluginState,
                  selecting: true,
                  selectionLine: lineNumber,
                  transient: undefined,
                });
                view.dispatch(tr);
                return true;
              }

              if (pluginState.selecting && target.classList.contains("semantic-variable")) {
                const variableName = target.textContent || "";
                if (!variableName) return false;
                if (!pluginState.selectionLine) return false;

                let domain: PlotRange | undefined;
                const lineIndex = buildLineIndex(view.state.doc);
                const info = lineIndex[pluginState.selectionLine];
                if (info) {
                  const expressionNode = resolveExpressionNode(
                    info.node,
                    pluginState.selectionLine
                  );
                  if (expressionNode) {
                    const settings = buildSettingsSnapshot(getSettings());
                    const variableContext = getVariableContext();
                    const store = new ReactiveVariableStore();
                    variableContext.forEach((variable) => store.setVariableWithMetadata(variable));
                    const preview = computePlotData({
                      expressionNode,
                      xVariable: variableName,
                      variableContext,
                      variableStore: store,
                      registry: defaultRegistry,
                      settings,
                      sampleCount: 10,
                    });
                    if (preview.domain) {
                      const span = preview.domain.max - preview.domain.min;
                      const padding = Math.max(0.5, span * 0.2);
                      domain = {
                        min: preview.domain.min - padding,
                        max: preview.domain.max + padding,
                      };
                    }
                  }
                }

                const tr = view.state.tr.setMeta(plotViewPluginKey, {
                  ...pluginState,
                  selecting: false,
                  selectionLine: pluginState.selectionLine,
                  transient: {
                    targetLine: pluginState.selectionLine,
                    xVariable: variableName,
                    domain,
                  },
                });
                view.dispatch(tr);
                return true;
              }

              if (pluginState.selecting) {
                const tr = view.state.tr.setMeta(plotViewPluginKey, {
                  ...pluginState,
                  selecting: false,
                  selectionLine: undefined,
                });
                view.dispatch(tr);
              }

              return false;
            },
          },

          handleKeyDown: (view, event) => {
            if (event.key !== "Escape") return false;
            const pluginState = plotViewPluginKey.getState(view.state) as PlotViewState;
            if (!pluginState) return false;
            if (!pluginState.selecting && !pluginState.transient) return false;

            const tr = view.state.tr.setMeta(plotViewPluginKey, {
              ...pluginState,
              selecting: false,
              selectionLine: undefined,
              transient: undefined,
            });
            view.dispatch(tr);
            return true;
          },
        },

        view(editorView) {
          currentView = editorView;
          const updateSelectingClass = (state: PlotViewState) => {
            editorView.dom.classList.toggle("plotting-selecting", !!state.selecting);
          };

          const listener = (e: Event) => {
            const custom = e as CustomEvent<{ renderNodes: any[] }>;
            const renderNodes = custom.detail?.renderNodes ?? [];
            const viewNodes = renderNodes.filter(isPlotViewRenderNode) as PlotViewRenderNode[];
            const pluginState = plotViewPluginKey.getState(editorView.state) as PlotViewState;

            const tr = editorView.state.tr.setMeta(plotViewPluginKey, {
              ...pluginState,
              viewNodes,
            });
            tr.setMeta("addToHistory", false);
            editorView.dispatch(tr);
          };

          window.addEventListener("evaluationDone", listener);

          updateSelectingClass(plotViewPluginKey.getState(editorView.state) as PlotViewState);

          return {
            update(view) {
              const state = plotViewPluginKey.getState(view.state) as PlotViewState;
              if (state) updateSelectingClass(state);
            },
            destroy() {
              currentView = null;
              window.removeEventListener("evaluationDone", listener);
              editorView.dom.classList.remove("plotting-selecting");
            },
          };
        },
      }),
    ];
  },
});
