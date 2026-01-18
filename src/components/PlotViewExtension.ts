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
} from "../parsing/ast";
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
import { getDateLocaleEffective } from "../types/DateValue";

const plotViewPluginKey = new PluginKey("plotView");

type PlotSource = "persistent" | "transient";

interface PlotViewModel {
  source: PlotSource;
  kind: PlotKind;
  size: PlotSize;
  x?: string;
  expression?: string;
  status: "connected" | "disconnected";
  message?: string;
  domain?: PlotRange;
  view?: PlotRange;
  yDomain?: PlotRange;
  yView?: PlotRange;
  data?: PlotPoint[];
  currentX?: number;
  currentY?: number | null;
  targetLine?: number;
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
): PlotViewModel => ({
  source,
  kind: plotNode.kind,
  size: plotNode.size || "md",
  x: plotNode.x,
  expression: plotNode.expression,
  status: plotNode.status,
  message: plotNode.message,
  domain: plotNode.domain,
  view: plotNode.view,
  yDomain: deriveYDomain(plotNode.data),
  yView: deriveYDomain(plotNode.data),
  data: plotNode.data,
  currentX: plotNode.currentX,
  currentY: plotNode.currentY,
  targetLine: plotNode.targetLine,
});

const buildPlotKey = (model: PlotViewModel, fallbackLine?: number): string => {
  const line = model.targetLine ?? fallbackLine ?? 0;
  const xKey = model.currentX !== undefined ? Math.round(model.currentX * 1000) : "na";
  const yKey =
    model.currentY !== undefined && model.currentY !== null
      ? Math.round(model.currentY * 1000)
      : "na";
  const domainKey = model.domain ? `${model.domain.min}:${model.domain.max}` : "auto";
  const viewKey = model.view ? `${model.view.min}:${model.view.max}` : "auto";
  const yDomainKey = model.yDomain ? `${model.yDomain.min}:${model.yDomain.max}` : "auto";
  const yViewKey = model.yView ? `${model.yView.min}:${model.yView.max}` : "auto";
  return `plot-${model.source}-${line}-${xKey}-${yKey}-${domainKey}-${viewKey}-${yDomainKey}-${yViewKey}`;
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

const computeModelFromExpression = (
  targetLine: number,
  xVariable: string,
  domainOverride: PlotRange | undefined,
  viewOverride: PlotRange | undefined,
  yDomainOverride: PlotRange | undefined,
  yViewOverride: PlotRange | undefined,
  source: PlotSource,
  size: PlotSize,
  lineIndex: ReturnType<typeof buildLineIndex>,
  variableContext: Map<string, Variable>,
  settings: any
): PlotViewModel | null => {
  const info = lineIndex[targetLine];
  if (!info) return null;
  const expressionNode = resolveExpressionNode(info.node, targetLine);
  if (!expressionNode) return null;

  const isScrubbing =
    typeof document !== "undefined" && document.body?.classList.contains("number-scrubbing");
  const sampleCount = isScrubbing ? 40 : 60;

  const plotResult = computePlotData({
    expressionNode,
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
  });

  const viewOverrideSafe = viewOverride ? { ...viewOverride } : undefined;
  const computedYDomain = yDomainOverride || deriveYDomain(plotResult.data);
  const computedYView = yViewOverride || computedYDomain;

  return {
    source,
    kind: "plot",
    size,
    x: xVariable,
    expression: expressionNode.expression,
    status: plotResult.status,
    message: plotResult.message,
    domain: plotResult.domain,
    view: viewOverrideSafe || plotResult.view,
    yDomain: computedYDomain,
    yView: computedYView,
    data: plotResult.data,
    currentX: plotResult.currentX,
    currentY: plotResult.currentY,
    targetLine,
  };
};

const createPlotSvg = (
  model: PlotViewModel,
  width: number,
  height: number,
  viewOverride?: PlotRange,
  yViewOverride?: PlotRange
): SVGSVGElement | null => {
  if (!model.data || !model.domain) return null;

  const padding = { left: 64, right: 20, top: 22, bottom: 44 };
  const viewRange = viewOverride || model.view || model.domain;

  const pointsInView = model.data.filter(
    (point) => point.x >= viewRange.min && point.x <= viewRange.max && point.y !== null
  ) as Array<{ x: number; y: number }>;

  if (pointsInView.length === 0) return null;

  const yRangeBase = yViewOverride || model.yView || model.yDomain;
  let yMin: number;
  let yMax: number;
  if (yRangeBase) {
    yMin = yRangeBase.min;
    yMax = yRangeBase.max;
  } else {
    const derived = deriveYDomain(pointsInView);
    if (!derived) return null;
    yMin = derived.min;
    yMax = derived.max;
  }

  const ySpan = Math.max(1e-9, yMax - yMin);
  if (!yRangeBase) {
    const yPadding = Math.max(0.1, ySpan * 0.08);
    yMin -= yPadding;
    yMax += yPadding;
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

  const formatTick = (value: number) => {
    if (!Number.isFinite(value)) return "";
    const abs = Math.abs(value);
    if (abs > 0 && (abs >= 1e6 || abs < 1e-3)) {
      return value.toExponential(2);
    }
    const fixed = abs >= 100 ? value.toFixed(0) : value.toFixed(2);
    return fixed.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
  };

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  const axisX = document.createElementNS("http://www.w3.org/2000/svg", "line");
  axisX.setAttribute("x1", `${padding.left}`);
  axisX.setAttribute("x2", `${width - padding.right}`);
  axisX.setAttribute("y1", `${height - padding.bottom}`);
  axisX.setAttribute("y2", `${height - padding.bottom}`);
  axisX.setAttribute("class", "plot-view-axis");
  svg.appendChild(axisX);

  const axisY = document.createElementNS("http://www.w3.org/2000/svg", "line");
  axisY.setAttribute("x1", `${padding.left}`);
  axisY.setAttribute("x2", `${padding.left}`);
  axisY.setAttribute("y1", `${padding.top}`);
  axisY.setAttribute("y2", `${height - padding.bottom}`);
  axisY.setAttribute("class", "plot-view-axis");
  svg.appendChild(axisY);

  const xTicks = [viewRange.min, (viewRange.min + viewRange.max) / 2, viewRange.max];
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
    label.textContent = formatTick(tick);
    svg.appendChild(label);
  });

  const yTicks = [yMin, (yMin + yMax) / 2, yMax];
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
    label.textContent = formatTick(tick);
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
  yLabel.textContent = model.expression ? model.expression : "y";
  svg.appendChild(yLabel);

  const currentPoint =
    model.currentX !== undefined &&
    model.currentY !== undefined &&
    model.currentY !== null &&
    model.currentX >= viewRange.min &&
    model.currentX <= viewRange.max
      ? { x: model.currentX, y: model.currentY }
      : null;
  const epsilon = 1e-9;
  let pathData = "";
  let hasStarted = false;
  let insertedCurrent = false;
  for (const point of model.data) {
    if (point.y === null) {
      hasStarted = false;
      continue;
    }
    if (point.x < viewRange.min || point.x > viewRange.max) {
      continue;
    }
    if (currentPoint && !insertedCurrent && currentPoint.x < point.x - epsilon) {
      const x = xScale(currentPoint.x);
      const y = yScale(currentPoint.y);
      if (!hasStarted) {
        pathData += `M ${x} ${y}`;
        hasStarted = true;
      } else {
        pathData += ` L ${x} ${y}`;
      }
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
  }
  if (currentPoint && !insertedCurrent) {
    const x = xScale(currentPoint.x);
    const y = yScale(currentPoint.y);
    if (!hasStarted) {
      pathData += `M ${x} ${y}`;
    } else {
      pathData += ` L ${x} ${y}`;
    }
  }

  if (pathData) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    path.setAttribute("class", "plot-view-line");
    svg.appendChild(path);
  }

  if (currentPoint) {
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", `${xScale(currentPoint.x)}`);
    dot.setAttribute("cy", `${yScale(currentPoint.y)}`);
    dot.setAttribute("r", "3.5");
    dot.setAttribute("class", "plot-view-dot");
    svg.appendChild(dot);
  }

  return svg;
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
  onClose?: () => void
): HTMLElement => {
  let currentXView: PlotRange | undefined = model.view || model.domain;
  let currentYView: PlotRange | undefined = model.yView || model.yDomain;
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
  title.textContent = model.expression ? `${model.expression}${xLabel}` : `Plot${xLabel}`;

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
          if (drawWithView) drawWithView(currentXView, currentYView);
        },
        (next) => onUpdate({ yDomain: next, yView: next }),
        () => onUpdate({ yDomain: null, yView: null })
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
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    chart.appendChild(svg);
    const draw = (xOverride?: PlotRange, yOverride?: PlotRange) => {
      if (xOverride) currentXView = xOverride;
      if (yOverride) currentYView = yOverride;
      const width = Math.max(1, chart.clientWidth);
      const height = Math.max(1, chart.clientHeight);
      while (svg.firstChild) {
        svg.removeChild(svg.firstChild);
      }
      const rendered = createPlotSvg(model, width, height, currentXView, currentYView);
      if (rendered) {
        svg.setAttribute("viewBox", rendered.getAttribute("viewBox") || `0 0 ${width} ${height}`);
        Array.from(rendered.childNodes).forEach((node) => svg.appendChild(node));
      } else {
        const message = document.createElementNS("http://www.w3.org/2000/svg", "text");
        message.setAttribute("x", `${width / 2}`);
        message.setAttribute("y", `${height / 2}`);
        message.setAttribute("text-anchor", "middle");
        message.setAttribute("class", "plot-view-axis-text");
        message.textContent = "No plottable data";
        svg.appendChild(message);
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

              if ("domain" in patch) {
                if (patch.domain) {
                  currentOverride.domain = patch.domain;
                } else {
                  delete currentOverride.domain;
                }
              }
              if ("view" in patch) {
                if (patch.view) {
                  currentOverride.view = patch.view;
                } else {
                  delete currentOverride.view;
                }
              }
              if ("yDomain" in patch) {
                if (patch.yDomain) {
                  currentOverride.yDomain = patch.yDomain;
                } else {
                  delete currentOverride.yDomain;
                }
              }
              if ("yView" in patch) {
                if (patch.yView) {
                  currentOverride.yView = patch.yView;
                } else {
                  delete currentOverride.yView;
                }
              }

              if (Object.keys(currentOverride).length === 0) {
                delete overrides[key];
              } else {
                overrides[key] = currentOverride;
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
              if (override && model.targetLine) {
                const targetInfo = lineIndex[model.targetLine];
                const expressionNode = targetInfo
                  ? resolveExpressionNode(targetInfo.node, model.targetLine)
                  : null;
                if (expressionNode && model.x) {
                  const settings = buildSettingsSnapshot(getSettings());
                  model =
                    computeModelFromExpression(
                      model.targetLine,
                      model.x,
                      override.domain,
                      override.view,
                      override.yDomain,
                      override.yView,
                      "persistent",
                      model.size,
                      lineIndex,
                      getVariableContext(),
                      settings
                    ) || model;
                } else {
                  if (override.domain) model.domain = override.domain;
                  if (override.view) model.view = override.view;
                  if (override.yDomain) model.yDomain = override.yDomain;
                  if (override.yView) model.yView = override.yView;
                }
              }
              const widget = Decoration.widget(
                info.insertPos,
                () => createPlotWidget(model, undefined, (patch) =>
                  handleOverrideUpdate(overrideKey, patch)
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
                        () => handleCloseTransient(overrideKey)
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
