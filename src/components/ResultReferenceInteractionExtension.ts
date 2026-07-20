import { Extension } from "@tiptap/core";
import { NodeSelection, Plugin, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import {
  buildSensitivityInsight,
  calculateSensitivity,
  collectLeafSensitivityInputs,
  findSensitivityBreakEven,
  resolveSensitivityBarPercent,
  type SensitivityAnalysis,
  type SensitivityBreakEven,
  type SensitivityCandidate,
  type SensitivityEvaluation,
} from "../analysis/sensitivityAnalysis";
import { defaultRegistry, type EvaluationContext } from "../eval";
import { interpretNaturalIntent } from "../intent/naturalIntent";
import {
  findVariableAssignmentValueRange,
  formatSemanticNumericValue,
  replaceVariableAssignmentValue,
} from "../interaction/authoritativeNumericEditing";
import {
  ExpressionComponent,
  FunctionDefinitionNode,
  isCombinedAssignmentNode,
  isExpressionNode,
  isVariableAssignmentNode,
} from "../parsing/ast";
import { parseLine } from "../parsing/astParser";
import { parseExpressionComponents } from "../parsing/expressionComponents";
import { getPlotNumericValue } from "../plotting/plottingUtils";
import { createReferencePlaceholder } from "../references/referenceIds";
import { recordEquationFromNode } from "../solve/equationStore";
import {
  clearSensitivityAnalysis,
  loadSensitivityAnalysis,
  saveSensitivityAnalysis,
  type PinnedSensitivityAnalysis,
} from "../state/sensitivityAnalysisStore";
import {
  clearVariableBaseline,
  compareVariableWithBaseline,
  createVariableBaselineEntry,
  loadVariableBaseline,
  saveVariableBaseline,
  type VariableBaselineEntry,
  type VariableBaselineSnapshot,
} from "../state/variableBaselineStore";
import {
  MAX_SCENARIOS_PER_SHEET,
  captureScenario,
  clearScenarioComparison,
  compareStoredScenarioEntries,
  loadScenarioComparison,
  pinScenarioVariable,
  removeScenario,
  suggestScenarioName,
  type SavedScenario,
} from "../state/scenarioComparisonStore";
import type { SettingsState, Variable } from "../state/types";
import { ReactiveVariableStore } from "../state/variableStore";
import {
  type DisplayOptions,
  ListValue,
  NumberValue,
  PercentageValue,
  SemanticParsers,
  SemanticValue,
} from "../types";
import {
  formatBaselineDeltaLabel,
  resolveBaselineVariableName,
} from "./resultBaselineInteraction";
import {
  buildBoundedGoalSeekActionLabel,
  buildGoalSeekActionLabel,
  resolveResultMenuFocusIndex,
  type ResultMenuNavigationKey,
} from "./resultActionAccessibility";

const RESULT_SELECTOR =
  ".semantic-result-display, .semantic-live-result-display";
const REFERENCE_SELECTOR = ".semantic-reference-chip";
const SOURCE_LINE_HIGHLIGHT_CLASS = "semantic-source-line-highlight";
const DND_MIME = "application/x-smartpad-result-reference";
const REFERENCE_MOVE_MIME = "application/x-smartpad-reference-move";
const CLIPBOARD_MIME = "application/x-smartpad-reference";
const REF_DEBUG_FLAG = "__SP_REF_DEBUG";
const REF_DEBUG_LOG_STORE = "__SP_REF_DEBUG_LOGS";
const REF_TRACE_FLAG = "__SP_REF_TRACE_ENABLED";
const REF_TRACE_LOG_STORE = "__SP_REF_TRACE_LOGS";
const REF_TRACE_STORAGE_KEY = "smartpad-debug-ref-trace";
const REF_TRACE_API_INSTALLED = "__SP_REF_TRACE_API_INSTALLED";
const REF_TRACE_MAX_ENTRIES = 600;
const RESULT_DRAG_ACTIVE_WINDOW_FLAG = "__SP_RESULT_CHIP_DRAG_ACTIVE";
const DROP_TARGET_AFTER_CLASS = "sp-chip-drop-target-after";
const DROP_INLINE_CARET_CLASS = "sp-chip-drop-inline-caret";
const RESULT_DRAGGING_CLASS = "sp-result-chip-dragging";
const DROP_BOUNDARY_BAND_PX = 28;
const LAST_LINE_DROP_EXTRA_PX = 56;
const COPY_FEEDBACK_MS = 800;
const BASELINE_REFRESH_META = "spBaselineRefresh";
const BASELINE_INPUT_WIDGET_CLASS = "semantic-baseline-input-delta";
const SCENARIO_COMPARISON_WIDGET_CLASS = "semantic-scenario-comparison";
const SENSITIVITY_ANALYSIS_WIDGET_CLASS = "semantic-sensitivity-analysis";

type ResultInteractionSettings = Pick<
  SettingsState,
  | "referenceTextExportMode"
  | "decimalPlaces"
  | "scientificUpperExponent"
  | "scientificLowerExponent"
  | "scientificTrimTrailingZeros"
  | "groupThousands"
>;

interface ReferencePayload {
  sourceLineId: string;
  sourceLine: number;
  sourceLabel: string;
  sourceValue: string;
  placeholderKey?: string;
}

interface ReferenceMovePayload {
  from: number;
  to: number;
  placeholderKey?: string;
}

interface HoveredSourceRef {
  sourceLineId: string;
  sourceLine: number;
}

interface LineBoundaryDropTarget {
  sourceLineId: string;
  sourceLine: number;
  isLastLine: boolean;
  paragraphIndex: number;
}

interface SourceTextblockSnapshot {
  lineId: string;
  lineNumber: number;
  text: string;
}

interface PlotSourcePlan {
  targetName?: string;
  expression: string;
  xVariables: string[];
}

interface PlotMenuAction {
  label: string;
  directive: string;
  title?: string;
  accent?: boolean;
}

interface FunctionPlotActionSource {
  functionName: string;
  parameterName: string;
}

interface GoalSeekMenuAction {
  label: string;
  line: string;
  title?: string;
}

interface SourceResultInfo {
  targetName?: string;
  expression: string;
}

interface NamedNumericListSource {
  name: string;
  length: number;
}

interface SensitivitySourcePlan {
  sourceLineId: string;
  sourceLine: number;
  targetName: string;
  expression: string;
  candidates: SensitivityCandidate[];
  baseline: SensitivityEvaluation;
}

const HIGHLIGHT_REFRESH_META = "spRefHighlightRefresh";

const isRefDebugEnabled = (): boolean =>
  typeof window !== "undefined" && Boolean((window as any)[REF_DEBUG_FLAG]);

const readTraceStoragePreference = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(REF_TRACE_STORAGE_KEY);
    if (!raw) return false;
    return raw === "1" || raw.toLowerCase() === "true";
  } catch {
    return false;
  }
};

const isRefTraceEnabled = (): boolean =>
  typeof window !== "undefined" &&
  (Boolean((window as any)[REF_TRACE_FLAG]) || readTraceStoragePreference());

const appendRefTrace = (event: string, payload?: Record<string, any>) => {
  if (!isRefTraceEnabled() || typeof window === "undefined") return;
  const logs = Array.isArray((window as any)[REF_TRACE_LOG_STORE])
    ? (window as any)[REF_TRACE_LOG_STORE]
    : [];
  logs.push({
    ts: Date.now(),
    event,
    payload: payload || {},
  });
  if (logs.length > REF_TRACE_MAX_ENTRIES) {
    logs.splice(0, logs.length - REF_TRACE_MAX_ENTRIES);
  }
  (window as any)[REF_TRACE_LOG_STORE] = logs;
};

const installRefTraceApi = () => {
  if (typeof window === "undefined") return;
  if ((window as any)[REF_TRACE_API_INSTALLED]) return;
  (window as any)[REF_TRACE_API_INSTALLED] = true;
  (window as any).__SP_REF_TRACE_ENABLE = (enabled: boolean = true) => {
    const next = Boolean(enabled);
    (window as any)[REF_TRACE_FLAG] = next;
    try {
      window.localStorage.setItem(REF_TRACE_STORAGE_KEY, next ? "1" : "0");
    } catch {}
    appendRefTrace("traceToggle", { enabled: next });
    return next;
  };
  (window as any).__SP_REF_TRACE_CLEAR = () => {
    (window as any)[REF_TRACE_LOG_STORE] = [];
    return true;
  };
  (window as any).__SP_REF_TRACE_DUMP = () => {
    const logs = Array.isArray((window as any)[REF_TRACE_LOG_STORE])
      ? (window as any)[REF_TRACE_LOG_STORE]
      : [];
    return logs.slice();
  };
};

const logRefDebug = (...args: any[]) => {
  appendRefTrace("debugLog", { args });
  if (!isRefDebugEnabled()) return;
  if (typeof window !== "undefined") {
    const logs = Array.isArray((window as any)[REF_DEBUG_LOG_STORE])
      ? (window as any)[REF_DEBUG_LOG_STORE]
      : [];
    logs.push({ ts: Date.now(), args });
    (window as any)[REF_DEBUG_LOG_STORE] = logs;
  }
  console.log("[REF]", ...args);
};

const getTextAt = (doc: any, from: number, to: number): string =>
  doc.textBetween(Math.max(0, from), Math.max(0, to), "", "");

const isWordBoundary = (value: string): boolean =>
  !/[a-zA-Z0-9_]/.test(value || "");

const getEventElement = (
  eventTarget: EventTarget | null,
): HTMLElement | null => {
  if (!eventTarget) return null;
  if (eventTarget instanceof HTMLElement) return eventTarget;
  if (eventTarget instanceof Element) return eventTarget as HTMLElement;
  const maybeNode = eventTarget as Node;
  if (maybeNode?.parentElement instanceof HTMLElement) {
    return maybeNode.parentElement;
  }
  return null;
};

const uniqueNonEmptyValues = (
  values: Array<string | null | undefined>,
): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    const normalized = String(value || "").trim();
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    result.push(normalized);
  });
  return result;
};

const isOperatorPrefix = (value: string): boolean =>
  /^[+\-*/^%=<>!]/.test(value);

const stripEchoedReferencePrefix = (
  text: string,
  payload: ReferencePayload | null,
): string => {
  const input = String(text || "");
  if (!payload || !input) {
    return input;
  }
  const candidates = uniqueNonEmptyValues([
    payload.sourceValue,
    payload.sourceLabel,
  ]).sort((a, b) => b.length - a.length);
  for (const candidate of candidates) {
    if (!input.startsWith(candidate)) {
      continue;
    }
    const remainder = input.slice(candidate.length);
    const trimmedRemainder = remainder.replace(/^\s+/, "");
    if (!trimmedRemainder || !isOperatorPrefix(trimmedRemainder)) {
      continue;
    }
    return remainder;
  }
  return input;
};

const snapshotSelectionLine = (view: any): Record<string, any> => {
  try {
    const { state } = view;
    const { $from } = state.selection;
    let textblockDepth = $from.depth;
    while (textblockDepth > 0 && !$from.node(textblockDepth).isTextblock) {
      textblockDepth -= 1;
    }
    if (textblockDepth <= 0 || !$from.node(textblockDepth).isTextblock) {
      return {
        selectionFrom: state.selection.from,
        selectionTo: state.selection.to,
        hasTextblock: false,
      };
    }
    const lineNode = $from.node(textblockDepth);
    const lineId = String((lineNode as any).attrs?.lineId || "");
    const pieces: Array<Record<string, any>> = [];
    let plainText = "";
    lineNode.forEach((child: any) => {
      if (child.type?.name === "referenceToken") {
        pieces.push({
          type: "referenceToken",
          label: String(child.attrs?.label || ""),
          sourceValue: String(child.attrs?.sourceValue || ""),
          sourceLineId: String(child.attrs?.sourceLineId || ""),
        });
      } else if (child.isText) {
        const text = String(child.text || "");
        plainText += text;
        pieces.push({ type: "text", text });
      } else {
        pieces.push({ type: String(child.type?.name || "unknown") });
      }
    });
    return {
      selectionFrom: state.selection.from,
      selectionTo: state.selection.to,
      lineId,
      lineText: plainText,
      normalizedLineText: plainText.replace(/\s+/g, ""),
      pieces,
    };
  } catch {
    return { snapshotError: true };
  }
};

const createReferenceNode = (state: any, payload: ReferencePayload) => {
  const referenceType = state.schema.nodes.referenceToken;
  if (!referenceType) return null;
  const label = payload.sourceValue || payload.sourceLabel || "value";
  return referenceType.create({
    sourceLineId: payload.sourceLineId,
    sourceLine: payload.sourceLine || 0,
    sourceValue: payload.sourceValue || "",
    label,
    placeholderKey: payload.placeholderKey || createReferencePlaceholder(),
  });
};

const resolveLineIdByLineNumber = (doc: any, sourceLine: number): string => {
  if (!Number.isFinite(sourceLine) || sourceLine <= 0) {
    return "";
  }
  let line = 0;
  let matchedLineId = "";
  doc.descendants((node: any) => {
    if (!node?.isTextblock) {
      return true;
    }
    line += 1;
    if (line !== sourceLine) {
      return true;
    }
    matchedLineId = String((node as any).attrs?.lineId || "").trim();
    return false;
  });
  return matchedLineId;
};

const resolvePayloadLineIdentity = (
  state: any,
  payload: ReferencePayload,
): ReferencePayload => {
  if (payload.sourceLineId) {
    return payload;
  }
  const resolvedLineId = resolveLineIdByLineNumber(
    state.doc,
    payload.sourceLine,
  );
  if (!resolvedLineId) {
    return payload;
  }
  return {
    ...payload,
    sourceLineId: resolvedLineId,
  };
};

const insertReferenceAt = (
  view: any,
  payload: ReferencePayload,
  pos: number,
  mode: "reference" | "value" = "reference",
  options?: { moveRange?: ReferenceMovePayload | null },
): number | null => {
  const { state } = view;
  const resolvedPayload = resolvePayloadLineIdentity(state, payload);
  if (!resolvedPayload.sourceLineId) return null;
  const insertTextValue = String(
    payload.sourceValue || payload.sourceLabel || "value",
  );
  const referenceNode =
    mode === "reference" ? createReferenceNode(state, resolvedPayload) : null;
  if (mode === "reference" && !referenceNode) return null;
  try {
    const moveRange =
      mode === "reference" &&
      options?.moveRange &&
      Number.isFinite(options.moveRange.from) &&
      Number.isFinite(options.moveRange.to) &&
      options.moveRange.to > options.moveRange.from
        ? options.moveRange
        : null;
    if (moveRange && pos >= moveRange.from && pos <= moveRange.to) {
      return moveRange.to;
    }

    const tr = state.tr;
    const moveSize = moveRange ? moveRange.to - moveRange.from : 0;
    if (moveRange) {
      tr.delete(moveRange.from, moveRange.to);
    }

    const adjustedPos = moveRange && pos > moveRange.to ? pos - moveSize : pos;
    const insertionPos = Math.max(
      0,
      Math.min(adjustedPos, tr.doc.content.size),
    );
    const before =
      insertionPos > 0 ? getTextAt(tr.doc, insertionPos - 1, insertionPos) : "";
    const after = getTextAt(tr.doc, insertionPos, insertionPos + 1);
    const prefix = before && !isWordBoundary(before) ? " " : "";
    // Keep a trailing text slot after inserted atom references so caret can
    // remain visible and stable when the reference lands at end-of-line.
    const suffix = after ? (!isWordBoundary(after) ? " " : "") : " ";

    let cursor = insertionPos;
    if (prefix) {
      tr.insertText(prefix, cursor, cursor);
      cursor += prefix.length;
    }
    if (mode === "reference" && referenceNode) {
      tr.insert(cursor, referenceNode);
      cursor += referenceNode.nodeSize;
    } else {
      tr.insertText(insertTextValue, cursor, cursor);
      cursor += insertTextValue.length;
    }
    if (suffix) {
      tr.insertText(suffix, cursor, cursor);
      cursor += suffix.length;
    }
    let selectionPos = Math.max(1, Math.min(cursor, tr.doc.content.size));
    while (
      selectionPos > 1 &&
      !tr.doc.resolve(selectionPos).parent.inlineContent
    ) {
      selectionPos -= 1;
    }
    tr.setSelection(TextSelection.create(tr.doc, selectionPos));
    view.dispatch(tr);
    logRefDebug("insertReferenceAt", {
      insertionPos,
      cursor,
      selectionPos,
      beforeSelection: state.selection.from,
      afterSelection: view.state.selection.from,
      sourceLineId: resolvedPayload.sourceLineId,
    });
    appendRefTrace("insertReferenceAt", {
      mode,
      moved: Boolean(moveRange),
      insertionPos,
      cursor,
      selectionPos,
      sourceLineId: resolvedPayload.sourceLineId,
      sourceLine: resolvedPayload.sourceLine,
      sourceValue: resolvedPayload.sourceValue,
    });
    return cursor;
  } catch {
    logRefDebug("insertReferenceAt failed", {
      sourceLineId: resolvedPayload.sourceLineId,
      pos,
    });
    appendRefTrace("insertReferenceAtFailed", {
      mode,
      sourceLineId: resolvedPayload.sourceLineId,
      sourceLine: resolvedPayload.sourceLine,
      pos,
    });
    return null;
  }
};

const getLastTextblockSplitPos = (doc: any): number | null => {
  let lastSplitPos: number | null = null;
  doc.descendants((node: any, pos: number) => {
    if (!node?.isTextblock) {
      return true;
    }
    lastSplitPos = pos + node.nodeSize - 1;
    return true;
  });
  return lastSplitPos;
};

const insertReferenceOnBottomNewLine = (
  view: any,
  payload: ReferencePayload,
  mode: "reference" | "value" = "reference",
): number | null => {
  const { state } = view;
  const splitPos = getLastTextblockSplitPos(state.doc);
  if (typeof splitPos !== "number" || splitPos <= 0) {
    return insertReferenceAt(view, payload, state.doc.content.size, mode);
  }
  try {
    const splitSelectionPos = Math.max(
      1,
      Math.min(splitPos + 1, state.doc.content.size),
    );
    const splitTr = state.tr.split(splitPos);
    splitTr.setSelection(TextSelection.create(splitTr.doc, splitSelectionPos));
    view.dispatch(splitTr);
    return insertReferenceAt(view, payload, view.state.selection.from, mode);
  } catch {
    return insertReferenceAt(view, payload, state.doc.content.size, mode);
  }
};

const getTextblockSplitPosByLineId = (
  doc: any,
  sourceLineId: string,
): number | null => {
  if (!sourceLineId) return null;
  let splitPos: number | null = null;
  doc.descendants((node: any, pos: number) => {
    if (!node?.isTextblock) {
      return true;
    }
    const nodeLineId = String((node as any).attrs?.lineId || "");
    if (nodeLineId !== sourceLineId) {
      return true;
    }
    splitPos = pos + node.nodeSize - 1;
    return false;
  });
  return splitPos;
};

const getTextblockSplitPosByLineNumber = (
  doc: any,
  sourceLine: number,
): number | null => {
  if (!Number.isFinite(sourceLine) || sourceLine <= 0) return null;
  let line = 0;
  let splitPos: number | null = null;
  doc.descendants((node: any, pos: number) => {
    if (!node?.isTextblock) {
      return true;
    }
    line += 1;
    if (line !== sourceLine) {
      return true;
    }
    splitPos = pos + node.nodeSize - 1;
    return false;
  });
  return splitPos;
};

const insertReferenceAfterBoundary = (
  view: any,
  payload: ReferencePayload,
  target: LineBoundaryDropTarget,
  mode: "reference" | "value" = "reference",
): number | null => {
  const { state } = view;
  const splitPosById = target.sourceLineId
    ? getTextblockSplitPosByLineId(state.doc, target.sourceLineId)
    : null;
  const splitPos =
    typeof splitPosById === "number" && splitPosById > 0
      ? splitPosById
      : getTextblockSplitPosByLineNumber(state.doc, target.sourceLine);
  if (typeof splitPos !== "number" || splitPos <= 0) {
    return insertReferenceOnBottomNewLine(view, payload, mode);
  }
  try {
    const splitSelectionPos = Math.max(
      1,
      Math.min(splitPos + 1, state.doc.content.size),
    );
    const splitTr = state.tr.split(splitPos);
    splitTr.setSelection(TextSelection.create(splitTr.doc, splitSelectionPos));
    view.dispatch(splitTr);
    return insertReferenceAt(view, payload, view.state.selection.from, mode);
  } catch {
    return insertReferenceOnBottomNewLine(view, payload, mode);
  }
};

const insertTextAfterSourceLine = (
  view: any,
  payload: ReferencePayload,
  text: string,
): number | null => {
  const resolvedPayload = resolvePayloadLineIdentity(view.state, payload);
  const splitPosById = resolvedPayload.sourceLineId
    ? getTextblockSplitPosByLineId(view.state.doc, resolvedPayload.sourceLineId)
    : null;
  const splitPos =
    typeof splitPosById === "number" && splitPosById > 0
      ? splitPosById
      : getTextblockSplitPosByLineNumber(
          view.state.doc,
          resolvedPayload.sourceLine,
        );
  if (typeof splitPos !== "number" || splitPos <= 0) {
    return null;
  }
  try {
    const splitSelectionPos = Math.max(
      1,
      Math.min(splitPos + 1, view.state.doc.content.size),
    );
    const splitTr = view.state.tr.split(splitPos);
    splitTr.setSelection(TextSelection.create(splitTr.doc, splitSelectionPos));
    view.dispatch(splitTr);
    const insertPos = view.state.selection.from;
    const tr = view.state.tr.insertText(text, insertPos, insertPos);
    const cursor = insertPos + text.length;
    tr.setSelection(TextSelection.create(tr.doc, cursor));
    view.dispatch(tr);
    return cursor;
  } catch {
    return null;
  }
};

const resolveBoundaryDropTarget = (
  view: any,
  event: DragEvent,
): LineBoundaryDropTarget | null => {
  const editorRect = view.dom.getBoundingClientRect();
  const paragraphs = Array.from(
    view.dom.querySelectorAll("p"),
  ) as HTMLElement[];
  if (paragraphs.length === 0) {
    return null;
  }

  const candidates: Array<{
    distance: number;
    target: LineBoundaryDropTarget;
  }> = [];
  for (let idx = 0; idx < paragraphs.length; idx += 1) {
    const paragraph = paragraphs[idx];
    const sourceLineId = String(
      paragraph.getAttribute("data-line-id") || "",
    ).trim();
    const rect = paragraph.getBoundingClientRect();
    const isLastLine = idx === paragraphs.length - 1;
    const nextParagraph = !isLastLine ? paragraphs[idx + 1] : null;
    const nextTop = nextParagraph?.getBoundingClientRect().top;
    const lowerBandLimit =
      typeof nextTop === "number"
        ? nextTop + DROP_BOUNDARY_BAND_PX
        : Math.max(
            rect.bottom + LAST_LINE_DROP_EXTRA_PX,
            editorRect.bottom - 4,
          );
    const inBoundaryBand =
      event.clientY >= rect.bottom - DROP_BOUNDARY_BAND_PX &&
      event.clientY <= lowerBandLimit;
    if (!inBoundaryBand) {
      continue;
    }
    candidates.push({
      distance: Math.abs(event.clientY - rect.bottom),
      target: {
        sourceLineId,
        sourceLine: idx + 1,
        isLastLine,
        paragraphIndex: idx,
      },
    });
  }

  if (candidates.length === 0) {
    return null;
  }
  candidates.sort((a, b) => a.distance - b.distance);
  return candidates[0].target;
};

const resolveInlineDropPos = (view: any, event: DragEvent): number | null => {
  const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
  if (typeof coords?.pos !== "number") {
    return null;
  }
  return Math.max(1, Math.min(coords.pos, view.state.doc.content.size));
};

const shouldPreferInlineDrop = (
  view: any,
  event: DragEvent,
  inlinePos: number | null,
): boolean => {
  if (typeof inlinePos !== "number") {
    return false;
  }
  const target = getEventElement(event.target);
  const paragraph = target?.closest("p") as HTMLElement | null;
  if (!paragraph || !view.dom.contains(paragraph)) {
    return false;
  }
  const rect = paragraph.getBoundingClientRect();
  return event.clientY >= rect.top + 4 && event.clientY <= rect.bottom - 4;
};

const normalizeChipText = (value: string): string =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeGoalSeekTargetValue = (value: string): string =>
  normalizeChipText(value).replace(/(\d),(?=\d{3}(\D|$))/g, "$1");

const getTextblockTextWithoutResultTokens = (node: any): string => {
  let text = "";
  node?.forEach?.((child: any) => {
    const typeName = String(child?.type?.name || "");
    if (typeName === "resultToken") {
      return;
    }
    if (typeName === "referenceToken") {
      text += String(child?.attrs?.label || child?.attrs?.sourceValue || "");
      return;
    }
    if (child?.isText) {
      text += String(child.text || "");
      return;
    }
    text += String(child?.textContent || "");
  });
  return text;
};

const findSourceTextblockSnapshot = (
  view: any,
  payload: ReferencePayload | null,
): SourceTextblockSnapshot | null => {
  if (!payload) return null;
  const resolvedPayload = resolvePayloadLineIdentity(view.state, payload);
  let lineNumber = 0;
  let fallback: SourceTextblockSnapshot | null = null;
  let matchedById: SourceTextblockSnapshot | null = null;

  view.state.doc.descendants((node: any) => {
    if (!node?.isTextblock) {
      return true;
    }
    lineNumber += 1;
    const lineId = String((node as any).attrs?.lineId || "").trim();
    const snapshot = {
      lineId,
      lineNumber,
      text: getTextblockTextWithoutResultTokens(node),
    };
    if (
      !fallback &&
      resolvedPayload.sourceLine > 0 &&
      lineNumber === resolvedPayload.sourceLine
    ) {
      fallback = snapshot;
    }
    if (
      resolvedPayload.sourceLineId &&
      lineId === resolvedPayload.sourceLineId
    ) {
      matchedById = snapshot;
      return false;
    }
    return true;
  });

  return matchedById || fallback;
};

const collectExpressionVariables = (
  components: ExpressionComponent[],
): string[] => {
  const variables: string[] = [];
  const visit = (component: ExpressionComponent | undefined) => {
    if (!component) return;
    if (component.type === "variable") {
      variables.push(component.value);
    }
    component.children?.forEach(visit);
    component.args?.forEach((arg) => arg.components.forEach(visit));
    if (component.access) {
      visit(component.access.base);
      component.access.indexComponents?.forEach(visit);
      component.access.startComponents?.forEach(visit);
      component.access.endComponents?.forEach(visit);
    }
  };
  components.forEach(visit);
  return uniqueNonEmptyValues(variables);
};

const findSingleInputFunctionCall = (
  components: ExpressionComponent[],
  functionStore: Map<string, FunctionDefinitionNode> | undefined,
): FunctionPlotActionSource | null => {
  if (!functionStore || functionStore.size === 0) return null;
  let match: FunctionPlotActionSource | null = null;
  const visit = (component: ExpressionComponent | undefined): boolean => {
    if (!component || match) return Boolean(match);
    if (component.type === "function") {
      const functionName = component.value.replace(/\s+/g, " ").trim();
      const definition = functionStore.get(functionName);
      if (definition && definition.params.length === 1) {
        match = {
          functionName,
          parameterName: definition.params[0].name,
        };
        return true;
      }
    }
    if (component.children?.some((child) => visit(child))) return true;
    if (
      component.args?.some((arg) =>
        arg.components.some((child) => visit(child)),
      )
    )
      return true;
    if (component.access) {
      if (visit(component.access.base)) return true;
      const accessComponents = [
        ...(component.access.indexComponents || []),
        ...(component.access.startComponents || []),
        ...(component.access.endComponents || []),
      ];
      if (accessComponents.some((child) => visit(child))) return true;
    }
    return false;
  };
  components.some((component) => visit(component));
  return match;
};

const buildPlotSourcePlan = (
  view: any,
  payload: ReferencePayload | null,
): PlotSourcePlan | null => {
  const source = findSourceTextblockSnapshot(view, payload);
  if (!source) return null;

  const astNode = parseLine(source.text, source.lineNumber);
  let targetName = "";
  let expression = "";
  let components: ExpressionComponent[] = [];

  if (isCombinedAssignmentNode(astNode)) {
    targetName = astNode.variableName;
    expression = astNode.expression;
    components = astNode.components;
  } else if (isExpressionNode(astNode)) {
    expression = astNode.expression;
    components = astNode.components;
  } else if (isVariableAssignmentNode(astNode)) {
    targetName = astNode.variableName;
    expression = astNode.rawValue;
    try {
      components = parseExpressionComponents(astNode.rawValue);
    } catch {
      components = [];
    }
  }

  expression = expression.trim();
  if (!expression) {
    return null;
  }

  const xVariables = collectExpressionVariables(components).filter(
    (variable) => variable !== targetName,
  );
  if (xVariables.length === 0) {
    return null;
  }

  return {
    targetName: targetName.trim() || undefined,
    expression,
    xVariables,
  };
};

const buildPlotMenuActions = (
  view: any,
  payload: ReferencePayload | null,
  functionStore?: Map<string, FunctionDefinitionNode>,
): PlotMenuAction[] => {
  const plan = buildPlotSourcePlan(view, payload);
  if (!plan) {
    const source = findSourceTextblockSnapshot(view, payload);
    if (!source) return [];
    const astNode = parseLine(source.text, source.lineNumber);
    const components = isCombinedAssignmentNode(astNode)
      ? astNode.components
      : isExpressionNode(astNode)
        ? astNode.components
        : isVariableAssignmentNode(astNode)
          ? (() => {
              try {
                return parseExpressionComponents(astNode.rawValue);
              } catch {
                return [];
              }
            })()
          : [];
    const functionSource = findSingleInputFunctionCall(
      components,
      functionStore,
    );
    if (!functionSource) return [];
    const { functionName, parameterName } = functionSource;
    return [
      {
        label: `Plot function ${functionName}(${parameterName})`,
        directive: `@view plot y=${functionName} size=md`,
        title: `Create a live plot of ${functionName} against ${parameterName}`,
      },
    ];
  }
  const yParam = plan.targetName ? ` y=${plan.targetName}` : "";
  return plan.xVariables.map((xVariable) => ({
    label:
      plan.xVariables.length > 1 ? `Plot vs ${xVariable}` : "Plot from result",
    directive: `@view plot x=${xVariable}${yParam} size=md`,
    title: plan.targetName
      ? `Create a live plot of ${plan.targetName} against ${xVariable}`
      : `Create a live plot of the source expression against ${xVariable}`,
  }));
};

const buildSourceResultInfo = (
  view: any,
  payload: ReferencePayload | null,
): SourceResultInfo | null => {
  const source = findSourceTextblockSnapshot(view, payload);
  if (!source) return null;
  const astNode = parseLine(source.text, source.lineNumber);
  if (isCombinedAssignmentNode(astNode)) {
    return {
      targetName: astNode.variableName,
      expression: astNode.expression,
    };
  }
  if (isVariableAssignmentNode(astNode)) {
    return {
      targetName: astNode.variableName,
      expression: astNode.rawValue,
    };
  }
  if (isExpressionNode(astNode)) {
    return {
      expression: astNode.expression,
    };
  }
  return null;
};

const getNumericListLength = (value: SemanticValue | null): number | null => {
  if (!(value instanceof ListValue)) return null;
  const items = value.getItems();
  if (items.length === 0) return null;
  for (const item of items) {
    const numeric = getPlotNumericValue(item);
    if (numeric === null || !Number.isFinite(numeric)) {
      return null;
    }
  }
  return items.length;
};

const parseNumericListLength = (raw: string): number | null => {
  const parsed = SemanticParsers.parse(String(raw || "").trim());
  return parsed ? getNumericListLength(parsed) : null;
};

const collectNamedNumericListSources = (
  view: any,
  excludeName?: string,
): NamedNumericListSource[] => {
  const sources: NamedNumericListSource[] = [];
  let lineNumber = 0;
  view.state.doc.descendants((node: any) => {
    if (!node?.isTextblock) {
      return true;
    }
    lineNumber += 1;
    const astNode = parseLine(
      getTextblockTextWithoutResultTokens(node),
      lineNumber,
    );
    const name = isCombinedAssignmentNode(astNode)
      ? astNode.variableName
      : isVariableAssignmentNode(astNode)
        ? astNode.variableName
        : "";
    const expression = isCombinedAssignmentNode(astNode)
      ? astNode.expression
      : isVariableAssignmentNode(astNode)
        ? astNode.rawValue
        : "";
    if (!name || name === excludeName || !expression) {
      return true;
    }
    const length = parseNumericListLength(expression);
    if (length !== null) {
      sources.push({ name, length });
    }
    return true;
  });
  return sources;
};

const buildVisualPlotMenuActions = (
  view: any,
  payload: ReferencePayload | null,
): PlotMenuAction[] => {
  if (!payload) return [];
  const sourceInfo = buildSourceResultInfo(view, payload);
  const selectedLength = parseNumericListLength(payload.sourceValue);
  if (!sourceInfo || selectedLength === null) {
    return [];
  }

  const yParam = sourceInfo.targetName ? ` y=${sourceInfo.targetName}` : "";
  const actions: PlotMenuAction[] = [
    {
      label: "Plot as histogram",
      directive: `@view hist${yParam} size=md`,
      title: "Create a histogram from this numeric list",
      accent: true,
    },
  ];

  collectNamedNumericListSources(view, sourceInfo.targetName)
    .filter((candidate) => candidate.length === selectedLength)
    .forEach((candidate) => {
      actions.push({
        label: `Plot as scatter vs ${candidate.name}`,
        directive: `@view scatter x=${candidate.name}${yParam} size=md`,
        title: `Create a scatter plot using ${candidate.name} as x`,
        accent: true,
      });
    });

  return actions;
};

const buildGoalSeekMenuActions = (
  view: any,
  payload: ReferencePayload | null,
  variableContext: Map<string, Variable>,
  displayOptions: DisplayOptions,
): GoalSeekMenuAction[] => {
  if (!payload) return [];
  const sourceInfo = buildSourceResultInfo(view, payload);
  const plan = buildPlotSourcePlan(view, payload);
  if (!sourceInfo || !plan || plan.xVariables.length === 0) {
    return [];
  }
  const target = (sourceInfo.targetName || sourceInfo.expression).trim();
  const currentValue = normalizeGoalSeekTargetValue(
    payload.sourceValue || payload.sourceLabel || "",
  );
  if (!target || !currentValue) {
    return [];
  }
  return plan.xVariables.flatMap((variable, variableIndex) => {
    const actions: GoalSeekMenuAction[] = [
      {
        label: buildGoalSeekActionLabel(variable),
        line: `make ${target} = ${currentValue} by ${variable} =>`,
        title: `Insert an editable target line and calculate the ${variable} needed`,
      },
    ];
    const variableValue = variableContext.get(variable)?.value;
    const boundedValues = buildSuggestedGoalSeekBounds(variableValue, displayOptions);
    if (variableIndex === 0 && boundedValues) {
      actions.push({
        label: buildBoundedGoalSeekActionLabel(variable),
        line: `make ${target} = ${currentValue} by ${variable} with ${boundedValues.minimum} <= ${variable} <= ${boundedValues.maximum} =>`,
        title: `Insert an editable target line with starting limits around the current ${variable}`,
      });
    }
    return actions;
  });
};

const buildSuggestedGoalSeekBounds = (
  value: SemanticValue | null | undefined,
  displayOptions: DisplayOptions,
): { minimum: string; maximum: string } | null => {
  if (!value?.isNumeric() || !Number.isFinite(value.getNumericValue())) {
    return null;
  }
  const numericValue = value.getNumericValue();
  if (numericValue === 0) return null;
  const minimumFactor = numericValue > 0 ? 0.5 : 1.5;
  const maximumFactor = numericValue > 0 ? 1.5 : 0.5;
  const scale = (factor: number): SemanticValue => {
    if (value.getType() === "percentage") {
      return new PercentageValue(numericValue * factor * 100);
    }
    return value.multiply(NumberValue.from(factor));
  };
  try {
    const safeDisplayOptions = { ...displayOptions, groupThousands: false };
    return {
      minimum: scale(minimumFactor).toString(safeDisplayOptions),
      maximum: scale(maximumFactor).toString(safeDisplayOptions),
    };
  } catch (_error) {
    return null;
  }
};

const SENSITIVITY_NUMERIC_TYPES = new Set([
  "number",
  "percentage",
  "currency",
  "unit",
  "currencyUnit",
  "duration",
]);

const isSensitivityNumericValue = (
  value: SemanticValue | null | undefined,
): value is SemanticValue =>
  Boolean(
    value &&
      value.isNumeric() &&
      SENSITIVITY_NUMERIC_TYPES.has(value.getType()) &&
      Number.isFinite(value.getNumericValue()),
  );

const collectSensitivityDependencyMap = (
  view: any,
): Map<string, string[]> => {
  const dependencyMap = new Map<string, string[]>();
  let lineNumber = 0;
  view.state.doc.descendants((node: any) => {
    if (!node?.isTextblock) return true;
    lineNumber += 1;
    const astNode = parseLine(
      getTextblockTextWithoutResultTokens(node),
      lineNumber,
    );
    const variableName = isCombinedAssignmentNode(astNode)
      ? astNode.variableName
      : isVariableAssignmentNode(astNode)
        ? astNode.variableName
        : "";
    if (!variableName) return true;
    let components: ExpressionComponent[] = [];
    if (isCombinedAssignmentNode(astNode)) {
      components = astNode.components;
    } else if (isVariableAssignmentNode(astNode)) {
      try {
        components = parseExpressionComponents(astNode.rawValue);
      } catch {
        components = [];
      }
    }
    dependencyMap.set(
      variableName,
      collectExpressionVariables(components).filter(
        (dependency) => dependency !== variableName,
      ),
    );
    return true;
  });
  return dependencyMap;
};

const buildSensitivitySourcePlan = (
  view: any,
  payload: ReferencePayload | null,
  variables: Map<string, Variable>,
  displayOptions: Parameters<SemanticValue["toString"]>[0],
): SensitivitySourcePlan | null => {
  const source = findSourceTextblockSnapshot(view, payload);
  if (!source || !payload) return null;
  const astNode = parseLine(source.text, source.lineNumber);
  const targetName = isCombinedAssignmentNode(astNode)
    ? astNode.variableName
    : isVariableAssignmentNode(astNode)
      ? astNode.variableName
      : "";
  if (!targetName) return null;

  let components: ExpressionComponent[] = [];
  if (isCombinedAssignmentNode(astNode)) {
    components = astNode.components;
  } else if (isVariableAssignmentNode(astNode)) {
    try {
      components = parseExpressionComponents(astNode.rawValue);
    } catch {
      components = [];
    }
  }
  const targetDependencies = collectExpressionVariables(components).filter(
    (dependency) => dependency !== targetName,
  );
  if (targetDependencies.length === 0) return null;

  const targetValue = variables.get(targetName)?.value;
  if (!isSensitivityNumericValue(targetValue)) return null;
  const numericVariables = new Set(
    Array.from(variables.entries()).flatMap(([name, variable]) =>
      isSensitivityNumericValue(variable.value) ? [name] : [],
    ),
  );
  const inputNames = collectLeafSensitivityInputs({
    targetDependencies,
    dependencyMap: collectSensitivityDependencyMap(view),
    numericVariables,
    excludedVariables: new Set([targetName]),
  });
  const candidates = inputNames.flatMap((name) => {
    const input = variables.get(name)?.value;
    if (!isSensitivityNumericValue(input)) return [];
    const baseInput = input.getNumericValue();
    if (Math.abs(baseInput) <= Number.EPSILON) return [];
    return [{ name, baseInput }];
  });
  if (candidates.length === 0) return null;

  return {
    sourceLineId: source.lineId || payload.sourceLineId,
    sourceLine: source.lineNumber,
    targetName,
    expression: isCombinedAssignmentNode(astNode)
      ? astNode.expression
      : isVariableAssignmentNode(astNode)
        ? astNode.rawValue
        : "",
    candidates,
    baseline: {
      numericValue: targetValue.getNumericValue(),
      displayValue: targetValue.toString(displayOptions),
    },
  };
};

const scaleSensitivityInputValue = (
  value: SemanticValue,
  factor: number,
): SemanticValue | null => {
  try {
    if (value instanceof PercentageValue) {
      return new PercentageValue(value.getDisplayPercentage() * factor);
    }
    return value.multiply(NumberValue.from(factor));
  } catch {
    return null;
  }
};

const parseSensitivityRenderValue = (renderNode: any): SemanticValue | null => {
  const rawResult = renderNode?.result;
  if (typeof rawResult === "number") return NumberValue.from(rawResult);
  if (typeof rawResult !== "string") return null;
  return SemanticParsers.parse(rawResult.trim());
};

const resolveDisplayedResultValue = (target: HTMLElement): string => {
  const explicitResultValue = normalizeChipText(
    String(target.getAttribute("data-result-value") || ""),
  );
  if (explicitResultValue) return explicitResultValue;
  const attributeResult = normalizeChipText(
    String(target.getAttribute("data-result") || ""),
  );
  if (
    attributeResult &&
    target.classList.contains("semantic-live-result-display")
  ) {
    return attributeResult;
  }
  // Prefer the literal rendered chip text so inserted references match exactly
  // what the user sees, even if attributes are stale.
  const visibleText = normalizeChipText(
    target.innerText || target.textContent || "",
  );
  if (visibleText) return visibleText;
  const ariaValue = normalizeChipText(
    String(target.getAttribute("aria-label") || ""),
  );
  if (ariaValue) return ariaValue;
  const titleValue = normalizeChipText(
    String(target.getAttribute("title") || ""),
  );
  if (titleValue) return titleValue;
  return normalizeChipText(String(target.getAttribute("data-result") || ""));
};

const writeTextToClipboard = async (value: string): Promise<boolean> => {
  const text = String(value || "");
  if (!text) return false;
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {}
  }
  if (typeof document === "undefined") return false;
  try {
    const fallback = document.createElement("textarea");
    fallback.value = text;
    fallback.setAttribute("readonly", "true");
    fallback.style.position = "fixed";
    fallback.style.opacity = "0";
    fallback.style.pointerEvents = "none";
    document.body.appendChild(fallback);
    fallback.focus();
    fallback.select();
    const copied = document.execCommand("copy");
    fallback.remove();
    return copied;
  } catch {
    return false;
  }
};

const copyFeedbackTimers = new WeakMap<HTMLElement, number>();
const showCopyFeedback = (resultEl: HTMLElement) => {
  if (typeof window === "undefined") return;
  const existing = copyFeedbackTimers.get(resultEl);
  if (typeof existing === "number") {
    window.clearTimeout(existing);
  }
  resultEl.setAttribute("data-copy-state", "copied");
  const timer = window.setTimeout(() => {
    resultEl.removeAttribute("data-copy-state");
    copyFeedbackTimers.delete(resultEl);
  }, COPY_FEEDBACK_MS);
  copyFeedbackTimers.set(resultEl, timer);
};

const resolveResultElementFromTarget = (
  target: HTMLElement | null,
): HTMLElement | null => {
  if (!target) return null;
  const direct = target.closest(RESULT_SELECTOR) as HTMLElement | null;
  if (direct) return direct;
  const wrapper = target.closest(
    ".semantic-wrapper, .semantic-result-container",
  ) as HTMLElement | null;
  if (!wrapper) return null;
  return wrapper.querySelector(RESULT_SELECTOR) as HTMLElement | null;
};

const payloadFromElement = (target: HTMLElement): ReferencePayload | null => {
  if (
    !target.matches(".semantic-result-display") &&
    !target.matches(".semantic-live-result-display")
  ) {
    return null;
  }
  const fallbackParagraph = target.closest("p") as HTMLElement | null;
  const fallbackLineId = String(
    fallbackParagraph?.getAttribute("data-line-id") || "",
  ).trim();
  const fallbackSourceLine =
    fallbackParagraph && fallbackParagraph.parentElement
      ? Math.max(
          0,
          Array.from(
            fallbackParagraph.parentElement.querySelectorAll("p"),
          ).indexOf(fallbackParagraph) + 1,
        )
      : 0;
  const lineId = String(
    target.getAttribute("data-source-line-id") || fallbackLineId,
  ).trim();
  const sourceLine =
    Number(target.getAttribute("data-source-line") || 0) || fallbackSourceLine;
  if (!lineId && sourceLine <= 0) return null;
  const label =
    String(target.getAttribute("data-source-label") || "").trim() ||
    String(target.getAttribute("aria-label") || "").trim();
  const renderedText = normalizeChipText(target.textContent || "");
  const value = resolveDisplayedResultValue(target);
  const sourceValue = value || renderedText;
  const placeholderKey = String(
    target.getAttribute("data-placeholder-key") || "",
  ).trim();
  return {
    sourceLineId: lineId,
    sourceLine,
    sourceLabel: label || sourceValue || "value",
    sourceValue,
    placeholderKey,
  };
};

const installResultDragImage = (event: DragEvent, resultEl: HTMLElement) => {
  const dataTransfer = event.dataTransfer;
  if (!dataTransfer || typeof dataTransfer.setDragImage !== "function") return;
  try {
    const clone = resultEl.cloneNode(true) as HTMLElement;
    clone.classList.add("semantic-result-drag-image");
    clone
      .querySelectorAll(
        ".semantic-result-actions, .semantic-live-result-actions",
      )
      .forEach((element) => element.parentElement?.removeChild(element));
    document.body.appendChild(clone);
    const rect = resultEl.getBoundingClientRect();
    dataTransfer.setDragImage(
      clone,
      Math.max(0, rect.width / 2),
      Math.max(0, rect.height / 2),
    );
    window.setTimeout(() => {
      if (clone.parentElement) {
        clone.parentElement.removeChild(clone);
      }
    }, 0);
  } catch {}
};

const payloadFromReferenceElement = (
  target: HTMLElement,
): ReferencePayload | null => {
  if (!target.matches(REFERENCE_SELECTOR)) {
    return null;
  }
  const sourceLineId = String(
    target.getAttribute("data-source-line-id") || "",
  ).trim();
  const sourceLine = Number(target.getAttribute("data-source-line") || 0);
  if (!sourceLineId && sourceLine <= 0) return null;
  const sourceValue = normalizeChipText(
    String(
      target.getAttribute("data-source-value") ||
        target.getAttribute("data-result") ||
        "",
    ),
  );
  const label =
    normalizeChipText(String(target.getAttribute("data-source-label") || "")) ||
    normalizeChipText(target.textContent || "") ||
    sourceValue ||
    "value";
  const placeholderKey = String(
    target.getAttribute("data-placeholder-key") || "",
  ).trim();
  return {
    sourceLineId,
    sourceLine,
    sourceLabel: label,
    sourceValue,
    placeholderKey,
  };
};

const getReferenceRangeFromElement = (
  view: any,
  referenceEl: HTMLElement,
): ReferenceMovePayload | null => {
  const referenceType = view.state.schema.nodes.referenceToken;
  if (!referenceType) return null;
  try {
    const pos = view.posAtDOM(referenceEl, 0);
    if (typeof pos !== "number") return null;
    const node = view.state.doc.nodeAt(pos);
    if (node?.type === referenceType) {
      return {
        from: pos,
        to: pos + node.nodeSize,
        placeholderKey: String(node.attrs?.placeholderKey || ""),
      };
    }
  } catch {}
  return null;
};

const findSelectedReferencePayload = (state: any): ReferencePayload | null => {
  const referenceType = state.schema.nodes.referenceToken;
  if (!referenceType) return null;
  if (
    state.selection instanceof NodeSelection &&
    state.selection.node?.type === referenceType
  ) {
    const node = state.selection.node;
    return {
      sourceLineId: String(node.attrs.sourceLineId || ""),
      sourceLine: Number(node.attrs.sourceLine || 0),
      sourceLabel: String(node.attrs.label || "value"),
      sourceValue: String(node.attrs.sourceValue || ""),
      placeholderKey: String(node.attrs.placeholderKey || ""),
    };
  }
  const { from, to } = state.selection;
  let found: ReferencePayload | null = null;
  state.doc.nodesBetween(from, to, (node: any) => {
    if (node.type === referenceType) {
      found = {
        sourceLineId: String(node.attrs.sourceLineId || ""),
        sourceLine: Number(node.attrs.sourceLine || 0),
        sourceLabel: String(node.attrs.label || "value"),
        sourceValue: String(node.attrs.sourceValue || ""),
        placeholderKey: String(node.attrs.placeholderKey || ""),
      };
      return false;
    }
    return undefined;
  });
  return found;
};

const findDirectlySelectedReferencePayload = (
  state: any,
): ReferencePayload | null => {
  const referenceType = state.schema.nodes.referenceToken;
  if (!referenceType) return null;
  if (!(state.selection instanceof NodeSelection)) return null;
  const node = state.selection.node;
  if (!node || node.type !== referenceType) return null;
  return {
    sourceLineId: String(node.attrs.sourceLineId || ""),
    sourceLine: Number(node.attrs.sourceLine || 0),
    sourceLabel: String(node.attrs.label || "value"),
    sourceValue: String(node.attrs.sourceValue || ""),
    placeholderKey: String(node.attrs.placeholderKey || ""),
  };
};

const getReferenceRangeInSelection = (
  state: any,
): { from: number; to: number } | null => {
  const referenceType = state.schema.nodes.referenceToken;
  if (!referenceType) return null;
  const { selection } = state;

  if (
    selection instanceof NodeSelection &&
    selection.node?.type === referenceType
  ) {
    return { from: selection.from, to: selection.to };
  }

  if (selection.empty) {
    const $from = selection.$from;
    if ($from.nodeAfter?.type === referenceType) {
      return { from: $from.pos, to: $from.pos + $from.nodeAfter.nodeSize };
    }
    if ($from.nodeBefore?.type === referenceType) {
      return { from: $from.pos - $from.nodeBefore.nodeSize, to: $from.pos };
    }
    return null;
  }

  let found: { from: number; to: number } | null = null;
  state.doc.nodesBetween(
    selection.from,
    selection.to,
    (node: any, pos: number) => {
      if (node.type === referenceType) {
        found = { from: pos, to: pos + node.nodeSize };
        return false;
      }
      return undefined;
    },
  );
  return found;
};

const getReferenceTextInsertionPos = (
  state: any,
  range: { from: number; to: number },
): number => {
  const referenceType = state.schema.nodes.referenceToken;
  const { selection } = state;
  if (selection.empty && referenceType) {
    const $from = selection.$from;
    if ($from.nodeAfter?.type === referenceType) {
      return range.from;
    }
    if ($from.nodeBefore?.type === referenceType) {
      return range.to;
    }
  }
  return range.to;
};

const selectReferenceNode = (view: any, referenceEl: HTMLElement): boolean => {
  try {
    const pos = view.posAtDOM(referenceEl, 0);
    if (typeof pos !== "number") return false;
    const selection = NodeSelection.create(view.state.doc, pos);
    view.dispatch(view.state.tr.setSelection(selection));
    return true;
  } catch {
    return false;
  }
};

const jumpToSourceLine = (
  view: any,
  sourceLineId: string,
  sourceLine: number = 0,
): boolean => {
  const paragraphById = sourceLineId
    ? view.dom.querySelector(`p[data-line-id="${sourceLineId}"]`)
    : null;
  const paragraphByNumber =
    !paragraphById && sourceLine > 0
      ? view.dom.querySelectorAll("p")[sourceLine - 1] || null
      : null;
  const paragraph = paragraphById || paragraphByNumber;
  if (!paragraph) return false;
  const pos = view.posAtDOM(paragraph, 0);
  const target = Math.max(1, Math.min(pos + 1, view.state.doc.content.size));
  const tr = view.state.tr.setSelection(
    TextSelection.create(view.state.doc, target),
  );
  view.dispatch(tr);
  view.focus();
  return true;
};

const getSourceHighlightRange = (
  doc: any,
  sourceLineId: string | null,
  sourceLine: number = 0,
): { from: number; to: number } | null => {
  let line = 0;
  let fallback: { from: number; to: number } | null = null;
  let matchedById: { from: number; to: number } | null = null;
  doc.forEach((node: any, offset: number) => {
    if (!node?.isTextblock) return;
    line += 1;
    const from = offset;
    const to = offset + node.nodeSize;
    if (!fallback && sourceLine > 0 && line === sourceLine) {
      fallback = { from, to };
    }
    const nodeLineId = String((node as any).attrs?.lineId || "");
    if (sourceLineId && nodeLineId === sourceLineId) {
      matchedById = { from, to };
    }
  });
  return matchedById || fallback;
};

export const ResultReferenceInteractionExtension = Extension.create({
  name: "resultReferenceInteractionExtension",

  addOptions() {
    return {
      getSettings: (): ResultInteractionSettings => ({
        referenceTextExportMode: "preserve",
        decimalPlaces: 6,
        scientificUpperExponent: 12,
        scientificLowerExponent: -4,
        scientificTrimTrailingZeros: true,
        groupThousands: true,
      }),
      getFunctionStore: (): Map<string, FunctionDefinitionNode> | undefined =>
        undefined,
      getVariableContext: (): Map<string, Variable> => new Map(),
      getActiveSheetId: (): string => "",
    };
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { state, view } = this.editor;
        const referenceType = state.schema.nodes.referenceToken;
        if (!referenceType) {
          return false;
        }
        if (!(state.selection instanceof NodeSelection)) {
          return false;
        }
        if (state.selection.node?.type !== referenceType) {
          return false;
        }
        const tr = state.tr.setSelection(
          TextSelection.create(state.doc, state.selection.to),
        );
        view.dispatch(tr);
        return false;
      },
    };
  },

  addProseMirrorPlugins() {
    const getSettings = this.options.getSettings as
      | (() => ResultInteractionSettings)
      | undefined;
    const getReferenceTextExportMode = (): "preserve" | "readable" =>
      getSettings?.().referenceTextExportMode === "readable"
        ? "readable"
        : "preserve";
    const getFunctionStore = this.options.getFunctionStore as
      | (() => Map<string, FunctionDefinitionNode> | undefined)
      | undefined;
    const getVariableContext = this.options.getVariableContext as
      | (() => Map<string, Variable>)
      | undefined;
    const getActiveSheetId = this.options.getActiveSheetId as
      | (() => string)
      | undefined;
    const serializeReferencePayload = (
      payload: ReferencePayload,
      mode: "preserve" | "readable",
    ): string => {
      if (mode === "preserve") {
        return (
          payload.placeholderKey ||
          payload.sourceValue ||
          payload.sourceLabel ||
          "value"
        );
      }
      return payload.sourceValue || payload.sourceLabel || "value";
    };

    let lastReferencePayload: ReferencePayload | null = null;
    let postInsertCursor: number | null = null;
    let consumeResultClick: boolean = false;
    let highlightedSource: HoveredSourceRef | null = null;
    let highlightLockUntil = 0;
    let clearHighlightTimer: ReturnType<typeof setTimeout> | null = null;
    let activeDragPayload: ReferencePayload | null = null;
    let activeDragMoveRange: ReferenceMovePayload | null = null;
    let activeBoundaryDropTarget: LineBoundaryDropTarget | null = null;
    let activeInlineDropPos: number | null = null;
    let activeMenu: HTMLElement | null = null;
    let activeMenuButton: HTMLElement | null = null;
    let activeMenuActivatorIdentity: {
      sourceLineId: string;
      sourceLine: number;
      selector: string;
    } | null = null;
    let resultActionMenuSequence = 0;
    let activePluginView: any = null;
    let baselineRefreshFrame: number | null = null;
    let baselineScrubMouseUpPending = false;
    let sensitivityAnalysisCache: {
      key: string;
      analysis: SensitivityAnalysis;
      breakEven: SensitivityBreakEven | null;
    } | null = null;
    let explorerIntentDraft: {
      key: string;
      open: boolean;
      prompt: string;
      syntax: string;
      feedback: string;
    } | null = null;
    const clearDropTargetIndicator = (view: any) => {
      view.dom
        .querySelectorAll(`p.${DROP_TARGET_AFTER_CLASS}`)
        .forEach((paragraph) =>
          paragraph.classList.remove(DROP_TARGET_AFTER_CLASS),
        );
      activeBoundaryDropTarget = null;
    };
    const applyDropTargetIndicator = (
      view: any,
      target: LineBoundaryDropTarget | null,
    ) => {
      clearDropTargetIndicator(view);
      if (!target) return;
      const paragraphs = Array.from(
        view.dom.querySelectorAll("p"),
      ) as HTMLElement[];
      const paragraph = paragraphs[target.paragraphIndex] || null;
      if (!paragraph) return;
      paragraph.classList.add(DROP_TARGET_AFTER_CLASS);
      activeBoundaryDropTarget = target;
    };
    const setInlineDropIndicator = (view: any, pos: number | null) => {
      const normalizedPos =
        typeof pos === "number" && Number.isFinite(pos)
          ? Math.max(1, Math.min(pos, view.state.doc.content.size))
          : null;
      if (activeInlineDropPos === normalizedPos) {
        return;
      }
      activeInlineDropPos = normalizedPos;
      const tr = view.state.tr;
      tr.setMeta(HIGHLIGHT_REFRESH_META, Date.now());
      tr.setMeta("addToHistory", false);
      view.dispatch(tr);
    };
    const clearInlineDropIndicator = (view: any) => {
      setInlineDropIndicator(view, null);
    };
    const clearDragSession = () => {
      activeDragPayload = null;
      activeDragMoveRange = null;
      if (typeof window !== "undefined") {
        (window as any)[RESULT_DRAG_ACTIVE_WINDOW_FLAG] = false;
      }
    };
    const resolveActiveMenuActivator = (): HTMLElement | null => {
      if (activeMenuButton?.isConnected) return activeMenuButton;
      if (!activePluginView || !activeMenuActivatorIdentity) return null;
      const { sourceLineId, sourceLine, selector } = activeMenuActivatorIdentity;
      const paragraphById = sourceLineId
        ? activePluginView.dom.querySelector(
            `p[data-line-id="${sourceLineId}"]`,
          )
        : null;
      const paragraphByNumber =
        !paragraphById && sourceLine > 0
          ? activePluginView.dom.querySelectorAll("p")[sourceLine - 1] || null
          : null;
      return (paragraphById || paragraphByNumber)?.querySelector(selector) || null;
    };
    const syncActiveMenuActivatorAria = () => {
      if (!activeMenu?.isConnected) return;
      const activator = resolveActiveMenuActivator();
      if (!activator) return;
      activeMenuButton = activator;
      if (
        !activator.matches(
          ".semantic-result-value, .semantic-live-result-value",
        )
      ) {
        activator.setAttribute("aria-expanded", "true");
        activator.setAttribute("aria-controls", activeMenu.id);
      }
    };
    const activateResultActionMenu = (
      menu: HTMLElement,
      button: HTMLElement,
      resultEl: HTMLElement,
    ) => {
      const payload = payloadFromElement(resultEl);
      activeMenu = menu;
      activeMenuButton = button;
      activeMenuActivatorIdentity = {
        sourceLineId: payload?.sourceLineId || "",
        sourceLine: payload?.sourceLine || 0,
        selector: button.matches(
          ".semantic-result-value, .semantic-live-result-value",
        )
          ? ".semantic-result-value"
          : ".semantic-result-menu",
      };
      syncActiveMenuActivatorAria();
      window.requestAnimationFrame(syncActiveMenuActivatorAria);
      window.setTimeout(syncActiveMenuActivatorAria, 60);
    };
    const closeResultActionMenu = (restoreFocus: boolean = false) => {
      const focusTarget = resolveActiveMenuActivator();
      if (activeMenu?.parentElement) {
        activeMenu.parentElement.removeChild(activeMenu);
      }
      if (focusTarget) {
        if (
          !focusTarget.matches(
            ".semantic-result-value, .semantic-live-result-value",
          )
        ) {
          focusTarget.setAttribute("aria-expanded", "false");
          focusTarget.removeAttribute("aria-controls");
        }
      }
      activeMenu = null;
      activeMenuButton = null;
      activeMenuActivatorIdentity = null;
      if (restoreFocus && focusTarget?.isConnected) {
        focusTarget.focus();
      }
    };
    const buildMenuButton = (
      label: string,
      action: () => void,
      options?: {
        disabled?: boolean;
        title?: string;
        accent?: boolean;
        className?: string;
      },
    ): HTMLButtonElement => {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("role", "menuitem");
      button.textContent = label;
      if (options?.accent) {
        button.classList.add("semantic-result-plot-suggestion");
      }
      if (options?.className) {
        const classNames = options.className.split(/\s+/).filter(Boolean);
        if (classNames.length > 0) {
          button.classList.add(...classNames);
        }
      }
      if (options?.title) {
        button.title = options.title;
      }
      if (options?.disabled) {
        button.disabled = true;
        button.setAttribute("aria-disabled", "true");
      } else {
        button.addEventListener("mousedown", (event) => {
          event.preventDefault();
          event.stopPropagation();
        });
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          action();
        });
      }
      return button;
    };
    const positionResultActionMenu = (
      menu: HTMLElement,
      button: HTMLElement,
    ) => {
      const rect = button.getBoundingClientRect();
      const menuWidth = Math.max(184, menu.offsetWidth || 0);
      const left = Math.max(
        8,
        Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8),
      );
      const top = Math.min(
        rect.bottom + 6,
        window.innerHeight - menu.offsetHeight - 8,
      );
      menu.style.left = `${left}px`;
      menu.style.top = `${Math.max(8, top)}px`;
    };

    const installResultMenuKeyboardNavigation = (menu: HTMLElement) => {
      menu.addEventListener("keydown", (event) => {
        const keyboardEvent = event as KeyboardEvent;
        if (keyboardEvent.key === "Escape") {
          keyboardEvent.preventDefault();
          keyboardEvent.stopPropagation();
          closeResultActionMenu(true);
          return;
        }
        if (
          keyboardEvent.key !== "ArrowDown" &&
          keyboardEvent.key !== "ArrowUp" &&
          keyboardEvent.key !== "Home" &&
          keyboardEvent.key !== "End"
        ) {
          return;
        }
        const items = Array.from(
          menu.querySelectorAll<HTMLButtonElement>(
            'button[role="menuitem"]:not(:disabled)',
          ),
        );
        const currentIndex = items.indexOf(
          document.activeElement as HTMLButtonElement,
        );
        const nextIndex = resolveResultMenuFocusIndex(
          keyboardEvent.key as ResultMenuNavigationKey,
          currentIndex,
          items.length,
        );
        if (nextIndex === null) return;
        keyboardEvent.preventDefault();
        keyboardEvent.stopPropagation();
        items[nextIndex]?.focus();
      });
    };

    const getBaselineForActiveSheet = (): VariableBaselineSnapshot | null => {
      const sheetId = getActiveSheetId?.() || "";
      return sheetId ? loadVariableBaseline(sheetId) : null;
    };

    const getNumericDisplayOptions = () => {
      const settings = getSettings?.();
      return {
        precision: settings?.decimalPlaces ?? 6,
        scientificUpperThreshold: Math.pow(
          10,
          settings?.scientificUpperExponent ?? 12,
        ),
        scientificLowerThreshold: Math.pow(
          10,
          settings?.scientificLowerExponent ?? -4,
        ),
        trimTrailingZeros: settings?.scientificTrimTrailingZeros ?? true,
        groupThousands: settings?.groupThousands ?? true,
      };
    };

    const evaluateSensitivityVariant = (
      view: any,
      plan: SensitivitySourcePlan,
      inputName: string,
      factor: number,
    ): SensitivityEvaluation | null => {
      const currentVariables =
        getVariableContext?.() || new Map<string, Variable>();
      const sourceInput = currentVariables.get(inputName);
      if (!sourceInput || !isSensitivityNumericValue(sourceInput.value)) {
        return null;
      }
      const scaledValue = scaleSensitivityInputValue(sourceInput.value, factor);
      if (!scaledValue) return null;

      const lines: SourceTextblockSnapshot[] = [];
      let lineNumber = 0;
      view.state.doc.descendants((node: any) => {
        if (!node?.isTextblock) return true;
        lineNumber += 1;
        lines.push({
          lineId: String((node as any).attrs?.lineId || "").trim(),
          lineNumber,
          text: getTextblockTextWithoutResultTokens(node),
        });
        return lineNumber < plan.sourceLine;
      });
      const astNodes = lines.map((line) =>
        parseLine(line.text, line.lineNumber),
      );
      const variableStore = new ReactiveVariableStore();
      const functionStore = new Map<string, FunctionDefinitionNode>();
      const equationStore: import("../solve/equationStore").EquationEntry[] =
        [];
      const settings = getSettings?.();
      const syncVariableContext = (): Map<string, Variable> =>
        new Map(
          variableStore
            .getAllVariables()
            .map((variable) => [variable.name, variable]),
        );
      let targetValue: SemanticValue | null = null;

      for (let index = 0; index < astNodes.length; index += 1) {
        const node = astNodes[index];
        const variableName = isCombinedAssignmentNode(node)
          ? node.variableName
          : isVariableAssignmentNode(node)
            ? node.variableName
            : "";
        if (variableName === inputName) {
          variableStore.setVariableWithMetadata({
            ...sourceInput,
            value: scaledValue,
            rawValue: scaledValue.toString(getNumericDisplayOptions()),
            updatedAt: new Date(),
          });
          recordEquationFromNode(node, equationStore);
        } else {
          const evaluationContext: EvaluationContext = {
            variableStore,
            variableContext: syncVariableContext(),
            functionStore,
            equationStore,
            astNodes,
            lineNumber: index + 1,
            decimalPlaces: settings?.decimalPlaces ?? 6,
            scientificUpperThreshold: Math.pow(
              10,
              settings?.scientificUpperExponent ?? 12,
            ),
            scientificLowerThreshold: Math.pow(
              10,
              settings?.scientificLowerExponent ?? -4,
            ),
            scientificTrimTrailingZeros:
              settings?.scientificTrimTrailingZeros ?? true,
            groupThousands: settings?.groupThousands ?? true,
          };
          const renderNode = defaultRegistry.evaluate(node, evaluationContext);
          recordEquationFromNode(node, equationStore);
          if (index + 1 === plan.sourceLine) {
            targetValue =
              variableStore.getVariable(plan.targetName)?.value ||
              parseSensitivityRenderValue(renderNode);
          }
        }
        if (index + 1 >= plan.sourceLine) break;
      }

      if (!isSensitivityNumericValue(targetValue)) return null;
      return {
        numericValue: targetValue.getNumericValue(),
        displayValue: targetValue.toString(getNumericDisplayOptions()),
      };
    };

    const captureCurrentNumericSnapshot =
      (): VariableBaselineSnapshot | null => {
        const variables = getVariableContext?.() || new Map<string, Variable>();
        if (variables.size === 0) return null;

        const displayOptions = getNumericDisplayOptions();
        const entries = Object.fromEntries(
          Array.from(variables.entries()).flatMap(([name, variable]) => {
            const displayValue = variable.value.toString(displayOptions);
            const entry = createVariableBaselineEntry(variable, displayValue);
            return entry ? [[name, entry] as const] : [];
          }),
        );
        if (Object.keys(entries).length === 0) return null;

        const snapshot: VariableBaselineSnapshot = {
          capturedAt: Date.now(),
          entries,
        };
        return snapshot;
      };

    const captureBaselineForActiveSheet =
      (): VariableBaselineSnapshot | null => {
        const sheetId = getActiveSheetId?.() || "";
        if (!sheetId) return null;
        const snapshot = captureCurrentNumericSnapshot();
        if (!snapshot) return null;
        saveVariableBaseline(sheetId, snapshot);
        return snapshot;
      };

    const resolveVariableNameForPayload = (
      view: any,
      payload: ReferencePayload | null,
    ): string | null => {
      if (!payload) return null;
      const source = findSourceTextblockSnapshot(view, payload);
      return resolveBaselineVariableName(source?.text || payload.sourceLabel);
    };

    const resolveBaselineComparisonForPayload = (
      view: any,
      payload: ReferencePayload | null,
    ) => {
      const baseline = getBaselineForActiveSheet();
      if (!baseline) return null;
      const variableName = resolveVariableNameForPayload(view, payload);
      if (!variableName) return null;
      const baselineEntry = baseline.entries[variableName];
      const variable = getVariableContext?.().get(variableName);
      if (!baselineEntry || !variable) return null;
      const comparison = compareVariableWithBaseline(baselineEntry, variable);
      return comparison ? { baselineEntry, comparison, variableName } : null;
    };

    const refreshBaselineResultDeltas = (view: any) => {
      const baseline = getBaselineForActiveSheet();
      view.dom.classList.toggle("sp-baseline-active", Boolean(baseline));
      view.dom
        .querySelectorAll(".semantic-live-result-display")
        .forEach((node: Element) => {
          const resultEl = node as HTMLElement;
          resultEl.removeAttribute("data-baseline-delta");
          resultEl.removeAttribute("data-baseline-direction");
          resultEl.removeAttribute("data-baseline-value");
          resultEl.setAttribute(
            "aria-label",
            resolveDisplayedResultValue(resultEl),
          );
          resultEl.title = resolveDisplayedResultValue(resultEl);
        });

      if (!baseline) return;

      view.dom
        .querySelectorAll(".semantic-live-result-display")
        .forEach((node: Element) => {
          const resultEl = node as HTMLElement;
          const resolved = resolveBaselineComparisonForPayload(
            view,
            payloadFromElement(resultEl),
          );
          if (!resolved?.comparison.changed) return;

          const deltaLabel = formatBaselineDeltaLabel(resolved.comparison);
          resultEl.setAttribute("data-baseline-delta", deltaLabel);
          resultEl.setAttribute(
            "data-baseline-direction",
            resolved.comparison.direction,
          );
          resultEl.setAttribute(
            "data-baseline-value",
            resolved.baselineEntry.displayValue,
          );
          resultEl.setAttribute(
            "aria-label",
            `${resolveDisplayedResultValue(resultEl)} · ${resolved.variableName} ${deltaLabel} from baseline ${resolved.baselineEntry.displayValue}`,
          );
          resultEl.title = `Baseline ${resolved.baselineEntry.displayValue}`;
        });
    };

    const buildBaselineDecorations = (state: any): Decoration[] => {
      const baseline = getBaselineForActiveSheet();
      const variables = getVariableContext?.() || new Map<string, Variable>();
      if (!baseline || variables.size === 0) return [];

      const decorations: Decoration[] = [];
      state.doc.descendants((node: any, pos: number) => {
        if (!node?.isTextblock) return true;
        const variableName = resolveBaselineVariableName(
          getTextblockTextWithoutResultTokens(node),
        );
        if (!variableName) return true;
        const baselineEntry = baseline.entries[variableName];
        const variable = variables.get(variableName);
        if (!baselineEntry || !variable) return true;
        const comparison = compareVariableWithBaseline(baselineEntry, variable);
        if (!comparison?.changed) return true;

        const deltaLabel = formatBaselineDeltaLabel(comparison);
        if (baselineEntry.role !== "input") {
          let resultNodeRange: { from: number; to: number } | null = null;
          node.forEach((child: any, offset: number) => {
            if (!resultNodeRange && child.type?.name === "resultToken") {
              const from = pos + 1 + offset;
              resultNodeRange = { from, to: from + child.nodeSize };
            }
          });
          if (resultNodeRange) {
            decorations.push(
              Decoration.node(resultNodeRange.from, resultNodeRange.to, {
                class: `semantic-baseline-result-node is-${comparison.direction}`,
                "data-baseline-delta": deltaLabel,
                "data-baseline-direction": comparison.direction,
                "data-baseline-value": baselineEntry.displayValue,
                title: `Baseline ${baselineEntry.displayValue}`,
                "aria-label": `${variableName} ${deltaLabel} from baseline ${baselineEntry.displayValue}`,
              }),
            );
          }
          return true;
        }

        decorations.push(
          Decoration.widget(
            pos + node.nodeSize - 1,
            () => {
              const marker = document.createElement("span");
              marker.className = `${BASELINE_INPUT_WIDGET_CLASS} is-${comparison.direction}`;
              marker.setAttribute("contenteditable", "false");
              marker.setAttribute(
                "aria-label",
                `${variableName} ${deltaLabel} from baseline ${baselineEntry.displayValue}`,
              );
              marker.title = `Baseline ${baselineEntry.displayValue}`;
              marker.textContent = `Base ${baselineEntry.displayValue} · ${deltaLabel}`;
              return marker;
            },
            {
              side: 1,
              key: `baseline-input-${variableName}-${deltaLabel}-${baselineEntry.displayValue}`,
            },
          ),
        );
        return true;
      });
      return decorations;
    };

    const buildScenarioComparisonDecorations = (state: any): Decoration[] => {
      const sheetId = getActiveSheetId?.() || "";
      const baseline = getBaselineForActiveSheet();
      const scenarioComparison = sheetId
        ? loadScenarioComparison(sheetId)
        : null;
      const variables = getVariableContext?.() || new Map<string, Variable>();
      const pinnedVariable = scenarioComparison?.pinnedVariable || "";
      if (
        !baseline ||
        !scenarioComparison ||
        scenarioComparison.scenarios.length === 0 ||
        !pinnedVariable
      ) {
        return [];
      }

      const baselineEntry = baseline.entries[pinnedVariable] || null;
      const liveVariable = variables.get(pinnedVariable);
      const liveEntry = liveVariable
        ? createVariableBaselineEntry(
            liveVariable,
            liveVariable.value.toString(getNumericDisplayOptions()),
          )
        : null;
      const widgetKey = [
        pinnedVariable,
        baselineEntry?.displayValue || "missing",
        liveEntry?.displayValue || "missing",
        ...scenarioComparison.scenarios.map(
          (scenario) =>
            `${scenario.id}:${scenario.entries[pinnedVariable]?.displayValue || "missing"}`,
        ),
      ].join("|");

      const decorations: Decoration[] = [];
      let pinnedLineFound = false;
      state.doc.descendants((node: any, pos: number) => {
        if (pinnedLineFound || !node?.isTextblock) return true;
        const variableName = resolveBaselineVariableName(
          getTextblockTextWithoutResultTokens(node),
        );
        if (variableName !== pinnedVariable) return true;
        pinnedLineFound = true;

        decorations.push(
          Decoration.node(pos, pos + node.nodeSize, {
            class: "semantic-scenario-comparison-line",
          }),
        );
        decorations.push(
          Decoration.widget(
            pos + node.nodeSize - 1,
            () => {
              const comparison = document.createElement("span");
              comparison.className = SCENARIO_COMPARISON_WIDGET_CLASS;
              comparison.setAttribute("contenteditable", "false");
              comparison.setAttribute("role", "group");
              comparison.setAttribute("data-pinned-variable", pinnedVariable);
              comparison.setAttribute(
                "aria-label",
                `Scenario comparison for ${pinnedVariable}`,
              );

              const title = document.createElement("span");
              title.className = "semantic-scenario-comparison-title";
              title.textContent = `Scenarios · ${pinnedVariable}`;
              comparison.appendChild(title);

              const values = document.createElement("span");
              values.className = "semantic-scenario-comparison-values";
              comparison.appendChild(values);

              const appendValue = (
                label: string,
                entry: VariableBaselineEntry | null,
                options?: {
                  kind?: "base" | "saved" | "live";
                  scenario?: SavedScenario;
                },
              ) => {
                const card = document.createElement("span");
                card.className = `semantic-scenario-value is-${options?.kind || "saved"}`;
                const delta =
                  baselineEntry && entry && options?.kind !== "base"
                    ? compareStoredScenarioEntries(baselineEntry, entry)
                    : null;
                if (delta) card.classList.add(`is-${delta.direction}`);

                const cardLabel = document.createElement("span");
                cardLabel.className = "semantic-scenario-value-label";
                cardLabel.textContent = label;
                card.appendChild(cardLabel);

                const cardValue = document.createElement("span");
                cardValue.className = "semantic-scenario-value-number";
                cardValue.textContent = entry?.displayValue || "Not available";
                card.appendChild(cardValue);

                if (delta) {
                  const cardDelta = document.createElement("span");
                  cardDelta.className = "semantic-scenario-value-delta";
                  cardDelta.textContent = formatBaselineDeltaLabel(delta);
                  card.appendChild(cardDelta);
                }

                if (options?.scenario) {
                  const remove = document.createElement("button");
                  remove.type = "button";
                  remove.className = "semantic-scenario-remove";
                  remove.textContent = "×";
                  remove.title = `Remove scenario ${options.scenario.name}`;
                  remove.setAttribute(
                    "aria-label",
                    `Remove scenario ${options.scenario.name}`,
                  );
                  remove.addEventListener("mousedown", (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  });
                  remove.addEventListener("click", (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    removeScenario(sheetId, options.scenario?.id || "");
                    if (activePluginView) {
                      refreshBaselinePresentation(activePluginView);
                    }
                  });
                  card.appendChild(remove);
                }
                values.appendChild(card);
              };

              appendValue("Base", baselineEntry, { kind: "base" });
              scenarioComparison.scenarios.forEach((scenario) => {
                appendValue(
                  scenario.name,
                  scenario.entries[pinnedVariable] || null,
                  {
                    kind: "saved",
                    scenario,
                  },
                );
              });
              appendValue("Live", liveEntry, { kind: "live" });
              return comparison;
            },
            {
              side: 3,
              key: `scenario-comparison-${widgetKey}`,
            },
          ),
        );
        return false;
      });
      return decorations;
    };

    const buildSensitivityDecorations = (state: any): Decoration[] => {
      const view = activePluginView;
      const sheetId = getActiveSheetId?.() || "";
      const selection = sheetId ? loadSensitivityAnalysis(sheetId) : null;
      if (!view || !selection) return [];

      const variables = getVariableContext?.() || new Map<string, Variable>();
      const plan = buildSensitivitySourcePlan(
        view,
        {
          sourceLineId: selection.sourceLineId,
          sourceLine: selection.sourceLine,
          sourceLabel: selection.targetName,
          sourceValue: "",
        },
        variables,
        getNumericDisplayOptions(),
      );
      if (!plan || plan.targetName !== selection.targetName) return [];

      const cacheKey = [
        sheetId,
        selection.sourceLineId,
        selection.sourceLine,
        selection.targetName,
        selection.variation,
        state.doc.textContent,
        ...plan.candidates.map((candidate) => {
          const value = variables.get(candidate.name)?.value;
          return `${candidate.name}:${value?.getType() || "missing"}:${value?.getNumericValue() ?? "missing"}`;
        }),
        `target:${plan.baseline.numericValue}`,
      ].join("|");
      if (sensitivityAnalysisCache?.key !== cacheKey) {
        const analysis = calculateSensitivity({
          baseline: plan.baseline,
          candidates: plan.candidates,
          variation: selection.variation,
          evaluate: (inputName, factor) =>
            evaluateSensitivityVariant(view, plan, inputName, factor),
        });
        const strongestInput = analysis.impacts[0]?.name || "";
        sensitivityAnalysisCache = {
          key: cacheKey,
          analysis,
          breakEven: strongestInput
            ? findSensitivityBreakEven({
                inputName: strongestInput,
                evaluate: (factor) =>
                  evaluateSensitivityVariant(view, plan, strongestInput, factor),
              })
            : null,
        };
      }
      const analysis = sensitivityAnalysisCache.analysis;
      const breakEven = sensitivityAnalysisCache.breakEven;

      let line = 0;
      let targetRange: { from: number; to: number; widgetPos: number } | null =
        null;
      let fallbackRange: {
        from: number;
        to: number;
        widgetPos: number;
      } | null = null;
      state.doc.descendants((node: any, pos: number) => {
        if (targetRange || !node?.isTextblock) return true;
        line += 1;
        const lineId = String((node as any).attrs?.lineId || "").trim();
        const range = {
          from: pos,
          to: pos + node.nodeSize,
          widgetPos: pos + node.nodeSize - 1,
        };
        if (!fallbackRange && line === selection.sourceLine) {
          fallbackRange = range;
        }
        if (selection.sourceLineId && lineId !== selection.sourceLineId) {
          return true;
        }
        if (!selection.sourceLineId && line !== selection.sourceLine) {
          return true;
        }
        targetRange = range;
        return false;
      });
      targetRange = targetRange || fallbackRange;
      if (!targetRange) return [];

      const variationPercent = Math.round(selection.variation * 100);
      const widgetKey = [
        cacheKey,
        ...analysis.impacts.map(
          (impact) =>
            `${impact.name}:${impact.minusOutput.numericValue}:${impact.plusOutput.numericValue}`,
        ),
        ...analysis.failedInputs,
      ].join("|");

      return [
        Decoration.node(targetRange.from, targetRange.to, {
          class: "semantic-sensitivity-line",
        }),
        Decoration.widget(
          targetRange.widgetPos,
          () => {
            const container = document.createElement("span");
            container.className = `${SENSITIVITY_ANALYSIS_WIDGET_CLASS} semantic-result-explorer`;
            container.setAttribute("contenteditable", "false");
            container.setAttribute("role", "group");
            container.setAttribute("data-sensitivity-target", plan.targetName);
            container.setAttribute(
              "data-sensitivity-input-count",
              String(analysis.impacts.length),
            );
            container.setAttribute(
              "data-sensitivity-top-input",
              analysis.impacts[0]?.name || "",
            );
            container.setAttribute(
              "aria-label",
              `Explore ${plan.targetName}. Review its source, manipulate its assumptions, and inspect live effects.`,
            );

            const header = document.createElement("span");
            header.className = "semantic-sensitivity-header";
            const heading = document.createElement("span");
            heading.className = "semantic-sensitivity-title";
            heading.textContent = `Explore · ${plan.targetName}`;
            header.appendChild(heading);
            const method = document.createElement("span");
            method.className = "semantic-sensitivity-method";
            method.textContent = "live model";
            header.appendChild(method);
            const close = document.createElement("button");
            close.type = "button";
            close.className = "semantic-sensitivity-close";
            close.textContent = "×";
            close.title = "Close result explorer";
            close.setAttribute("aria-label", "Close result explorer");
            close.addEventListener("mousedown", (event) => {
              event.preventDefault();
              event.stopPropagation();
            });
            close.addEventListener("click", (event) => {
              event.preventDefault();
              event.stopPropagation();
              clearSensitivityAnalysis(sheetId);
              sensitivityAnalysisCache = null;
              if (activePluginView) {
                refreshBaselinePresentation(activePluginView);
              }
            });
            header.appendChild(close);
            container.appendChild(header);

            const resultSummary = document.createElement("span");
            resultSummary.className = "semantic-explorer-result-summary";
            const liveLabel = document.createElement("span");
            liveLabel.textContent = "Now";
            resultSummary.appendChild(liveLabel);
            const liveValue = document.createElement("strong");
            liveValue.textContent = analysis.baseline.displayValue;
            resultSummary.appendChild(liveValue);
            const source = document.createElement("code");
            source.className = "semantic-explorer-source";
            source.textContent = `${plan.targetName} = ${plan.expression}`;
            source.title = "Go to the editable SmartPad source";
            source.setAttribute("role", "button");
            source.setAttribute("tabindex", "0");
            source.setAttribute(
              "aria-label",
              `Go to source: ${plan.targetName} equals ${plan.expression}`,
            );
            const goToExplorerSource = (event: Event) => {
              event.preventDefault();
              event.stopPropagation();
              if (!activePluginView) return;
              jumpToSourceLine(
                activePluginView,
                plan.sourceLineId,
                plan.sourceLine,
              );
              highlightSource(
                activePluginView,
                plan.sourceLineId,
                plan.sourceLine,
                { lockMs: 1600 },
              );
            };
            source.addEventListener("click", goToExplorerSource);
            source.addEventListener("keydown", (event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              goToExplorerSource(event);
            });
            resultSummary.appendChild(source);
            container.appendChild(resultSummary);

            const insightText = buildSensitivityInsight(analysis, plan.targetName);
            const insight = document.createElement("span");
            insight.className = "semantic-explorer-insight";
            insight.setAttribute("data-explorer-insight", "strongest-driver");
            insight.textContent = insightText || "No stable local driver was found.";
            container.appendChild(insight);

            if (breakEven) {
              const inputValue = variables.get(breakEven.inputName)?.value;
              const breakEvenValue = inputValue
                ? formatSemanticNumericValue(
                    inputValue,
                    inputValue.getNumericValue() * breakEven.inputFactor,
                    getNumericDisplayOptions(),
                  )
                : null;
              if (breakEvenValue) {
                const breakEvenInsight = document.createElement("span");
                breakEvenInsight.className = "semantic-explorer-insight is-secondary";
                breakEvenInsight.setAttribute("data-explorer-insight", "break-even");
                breakEvenInsight.textContent = `Possible break-even near ${breakEven.inputName} = ${breakEvenValue} in the sampled range.`;
                container.appendChild(breakEvenInsight);
              }
            }

            const legend = document.createElement("span");
            legend.className = "semantic-sensitivity-legend";
            legend.innerHTML = `<span class="semantic-explorer-drag-hint">Drag a value ↔</span><span class="is-minus">−${variationPercent}%</span><span class="is-plus">+${variationPercent}%</span>`;
            container.appendChild(legend);

            const rows = document.createElement("span");
            rows.className = "semantic-sensitivity-rows";
            rows.setAttribute("role", "list");
            analysis.impacts.forEach((impact, index) => {
              const row = document.createElement("span");
              row.className = "semantic-sensitivity-row";
              row.setAttribute("role", "listitem");
              row.setAttribute("data-sensitivity-input", impact.name);
              row.setAttribute("data-sensitivity-rank", String(index + 1));
              row.setAttribute(
                "aria-label",
                `${impact.name}. Minus ${variationPercent} percent gives ${impact.minusOutput.displayValue}. Plus ${variationPercent} percent gives ${impact.plusOutput.displayValue}.`,
              );

              const label = document.createElement("span");
              label.className = "semantic-sensitivity-input";
              const inputName = document.createElement("span");
              inputName.className = "semantic-explorer-input-name";
              inputName.textContent = impact.name;
              label.appendChild(inputName);
              const inputVariable = variables.get(impact.name);
              const valueButton = document.createElement("button");
              valueButton.type = "button";
              valueButton.className = "semantic-explorer-input-value";
              valueButton.textContent = inputVariable
                ? inputVariable.value.toString(getNumericDisplayOptions())
                : String(impact.baseInput);
              valueButton.title = `Drag left or right to change ${impact.name} in the sheet. Shift = fine, Alt = coarse, Esc = cancel.`;
              valueButton.setAttribute(
                "aria-label",
                `Change ${impact.name}. Drag left or right; Shift for fine changes and Alt for coarse changes.`,
              );
              if (inputVariable && activePluginView) {
                valueButton.addEventListener("mousedown", (event) => {
                  if (event.button !== 0 || !activePluginView) return;
                  const baseNumeric = inputVariable.value.getNumericValue();
                  const originalRange = findVariableAssignmentValueRange(
                    activePluginView,
                    impact.name,
                  );
                  if (!originalRange || !Number.isFinite(baseNumeric)) return;
                  event.preventDefault();
                  event.stopPropagation();
                  const startX = event.clientX;
                  let moved = false;
                  document.body.classList.add("number-scrubbing");

                  const finish = (cancelled: boolean) => {
                    document.removeEventListener("mousemove", move);
                    document.removeEventListener("mouseup", up);
                    document.removeEventListener("keydown", keydown, true);
                    document.body.classList.remove("number-scrubbing");
                    if (cancelled && moved && activePluginView) {
                      replaceVariableAssignmentValue(
                        activePluginView,
                        impact.name,
                        originalRange.rawValue,
                      );
                    }
                  };
                  const move = (moveEvent: MouseEvent) => {
                    if (!activePluginView) return;
                    const deltaX = moveEvent.clientX - startX;
                    if (Math.abs(deltaX) > 3) moved = true;
                    if (!moved) return;
                    moveEvent.preventDefault();
                    const rate = moveEvent.shiftKey
                      ? 0.001
                      : moveEvent.altKey
                        ? 0.02
                        : 0.005;
                    const factor = Math.max(0.01, 1 + deltaX * rate);
                    const nextRawValue = formatSemanticNumericValue(
                      inputVariable.value,
                      baseNumeric * factor,
                      getNumericDisplayOptions(),
                    );
                    if (nextRawValue) {
                      replaceVariableAssignmentValue(
                        activePluginView,
                        impact.name,
                        nextRawValue,
                      );
                    }
                  };
                  const up = () => finish(false);
                  const keydown = (keyboardEvent: KeyboardEvent) => {
                    if (keyboardEvent.key !== "Escape") return;
                    keyboardEvent.preventDefault();
                    keyboardEvent.stopPropagation();
                    finish(true);
                  };
                  document.addEventListener("mousemove", move);
                  document.addEventListener("mouseup", up);
                  document.addEventListener("keydown", keydown, true);
                });
              } else {
                valueButton.disabled = true;
              }
              label.appendChild(valueButton);
              row.appendChild(label);

              const track = document.createElement("span");
              track.className = "semantic-sensitivity-track";
              const axis = document.createElement("span");
              axis.className = "semantic-sensitivity-axis";
              track.appendChild(axis);
              const responseCurve = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "svg",
              );
              responseCurve.setAttribute("viewBox", "0 0 100 20");
              responseCurve.setAttribute("preserveAspectRatio", "none");
              responseCurve.setAttribute("class", "semantic-explorer-mini-curve");
              responseCurve.setAttribute("aria-hidden", "true");
              const curveScale = Math.max(
                analysis.maxAbsDelta,
                Number.EPSILON,
              );
              const curveY = (delta: number) =>
                10 - Math.max(-1, Math.min(1, delta / curveScale)) * 7;
              const curve = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "polyline",
              );
              curve.setAttribute(
                "points",
                `0,${curveY(impact.minusDelta)} 50,10 100,${curveY(impact.plusDelta)}`,
              );
              responseCurve.appendChild(curve);
              const livePoint = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "circle",
              );
              livePoint.setAttribute("cx", "50");
              livePoint.setAttribute("cy", "10");
              livePoint.setAttribute("r", "1.8");
              responseCurve.appendChild(livePoint);
              track.appendChild(responseCurve);
              const appendBar = (
                kind: "minus" | "plus",
                delta: number,
                output: SensitivityEvaluation,
              ) => {
                const bar = document.createElement("span");
                const direction =
                  delta < 0 ? "left" : delta > 0 ? "right" : "zero";
                bar.className = `semantic-sensitivity-bar is-${kind} is-${direction}`;
                bar.style.setProperty(
                  "--sensitivity-bar-width",
                  `${resolveSensitivityBarPercent(delta, analysis.maxAbsDelta)}%`,
                );
                bar.title = `${kind === "minus" ? "−" : "+"}${variationPercent}% ${impact.name} → ${output.displayValue}`;
                track.appendChild(bar);
              };
              appendBar("minus", impact.minusDelta, impact.minusOutput);
              appendBar("plus", impact.plusDelta, impact.plusOutput);
              row.appendChild(track);

              const outputs = document.createElement("span");
              outputs.className = "semantic-sensitivity-outputs";
              const minus = document.createElement("span");
              minus.className = "is-minus";
              minus.textContent = impact.minusOutput.displayValue;
              outputs.appendChild(minus);
              const plus = document.createElement("span");
              plus.className = "is-plus";
              plus.textContent = impact.plusOutput.displayValue;
              outputs.appendChild(plus);
              row.appendChild(outputs);
              rows.appendChild(row);
            });
            container.appendChild(rows);

            const footer = document.createElement("span");
            footer.className = "semantic-sensitivity-footer";
            footer.textContent = `Ranges compare one assumption at a time around the current model.`;
            if (analysis.failedInputs.length > 0) {
              footer.title = `Could not recalculate: ${analysis.failedInputs.join(", ")}`;
            }
            container.appendChild(footer);

            const askToggle = document.createElement("button");
            askToggle.type = "button";
            askToggle.className = "semantic-explorer-ask-toggle";
            askToggle.textContent = "Ask in plain language…";
            const intentDraftKey = `${sheetId}:${plan.sourceLineId || plan.sourceLine}:${plan.targetName}`;
            if (explorerIntentDraft?.key !== intentDraftKey) {
              explorerIntentDraft = {
                key: intentDraftKey,
                open: false,
                prompt: "",
                syntax: "",
                feedback:
                  "Your sheet changes only after you review and insert the syntax.",
              };
            }
            const intentDraft = explorerIntentDraft!;
            askToggle.setAttribute("aria-expanded", String(intentDraft.open));
            container.appendChild(askToggle);

            const composer = document.createElement("span");
            composer.className = "semantic-explorer-intent";
            composer.hidden = !intentDraft.open;
            const prompt = document.createElement("input");
            prompt.type = "text";
            prompt.className = "semantic-explorer-intent-prompt";
            prompt.placeholder = `Try “plot ${plan.targetName} against ${analysis.impacts[0]?.name || "an input"}”`;
            prompt.value = intentDraft.prompt;
            prompt.setAttribute("aria-label", "Describe what you want SmartPad to do");
            composer.appendChild(prompt);
            const proposalRow = document.createElement("span");
            proposalRow.className = "semantic-explorer-intent-proposal";
            const syntax = document.createElement("input");
            syntax.type = "text";
            syntax.className = "semantic-explorer-intent-syntax";
            syntax.placeholder = "Validated SmartPad syntax will appear here";
            syntax.value = intentDraft.syntax;
            syntax.setAttribute("aria-label", "Editable SmartPad syntax proposal");
            proposalRow.appendChild(syntax);
            const apply = document.createElement("button");
            apply.type = "button";
            apply.className = "semantic-explorer-intent-apply";
            apply.textContent = "Insert";
            apply.disabled = true;
            proposalRow.appendChild(apply);
            composer.appendChild(proposalRow);
            const feedback = document.createElement("span");
            feedback.className = "semantic-explorer-intent-feedback";
            feedback.textContent = intentDraft.feedback;
            composer.appendChild(feedback);
            container.appendChild(composer);

            let currentProposal = interpretNaturalIntent(prompt.value, {
              targetName: plan.targetName,
              variableNames: Array.from(variables.keys()),
            });
            const validateEditedSyntax = () => {
              const editedNode = parseLine(syntax.value.trim(), 1);
              const valid =
                Boolean(syntax.value.trim()) &&
                editedNode.type !== "plainText" &&
                editedNode.type !== "error";
              apply.disabled = !valid;
              feedback.classList.toggle("is-error", !valid && Boolean(syntax.value));
              if (!valid && syntax.value) {
                feedback.textContent = "This is not valid SmartPad syntax yet.";
                intentDraft.feedback = feedback.textContent;
              }
              return valid;
            };
            const updateProposal = () => {
              currentProposal = interpretNaturalIntent(prompt.value, {
                targetName: plan.targetName,
                variableNames: Array.from(variables.keys()),
              });
              syntax.value = currentProposal?.syntax || "";
              intentDraft.prompt = prompt.value;
              intentDraft.syntax = syntax.value;
              feedback.classList.toggle("is-error", !currentProposal && Boolean(prompt.value.trim()));
              feedback.textContent = currentProposal
                ? `${currentProposal.summary}. Review or edit the syntax before inserting.`
                : prompt.value.trim()
                  ? "I cannot map that safely yet. Try plot, find, convert, or set."
                  : "Your sheet changes only after you review and insert the syntax.";
              intentDraft.feedback = feedback.textContent;
              validateEditedSyntax();
            };
            askToggle.addEventListener("click", (event) => {
              event.preventDefault();
              event.stopPropagation();
              composer.hidden = !composer.hidden;
              intentDraft.open = !composer.hidden;
              askToggle.setAttribute("aria-expanded", String(!composer.hidden));
              if (!composer.hidden) prompt.focus();
            });
            prompt.addEventListener("input", updateProposal);
            syntax.addEventListener("input", () => {
              intentDraft.syntax = syntax.value;
              validateEditedSyntax();
            });
            if (currentProposal && !syntax.value) {
              syntax.value = currentProposal.syntax;
              intentDraft.syntax = syntax.value;
            }
            validateEditedSyntax();
            apply.addEventListener("click", (event) => {
              event.preventDefault();
              event.stopPropagation();
              if (!activePluginView || !validateEditedSyntax()) return;
              const editedSyntax = syntax.value.trim();
              const editedNode = parseLine(editedSyntax, 1);
              let applied = false;
              if (isVariableAssignmentNode(editedNode)) {
                applied = replaceVariableAssignmentValue(
                  activePluginView,
                  editedNode.variableName,
                  editedNode.rawValue,
                );
              }
              if (!applied) {
                const insertedCursor = insertTextAfterSourceLine(
                  activePluginView,
                  {
                    sourceLineId: plan.sourceLineId,
                    sourceLine: plan.sourceLine,
                    sourceLabel: plan.targetName,
                    sourceValue: analysis.baseline.displayValue,
                  },
                  editedSyntax,
                );
                applied = typeof insertedCursor === "number";
              }
              if (applied) {
                feedback.classList.remove("is-error");
                feedback.textContent = currentProposal?.kind === "set"
                  ? "Updated the existing visible assignment."
                  : "Inserted as visible, editable SmartPad syntax.";
                intentDraft.feedback = feedback.textContent;
                apply.disabled = true;
              }
            });
            return container;
          },
          { side: 4, key: `sensitivity-analysis-${widgetKey}` },
        ),
      ];
    };

    const refreshBaselinePresentation = (view: any) => {
      const resetHorizontalEditorScroll = () => {
        let element: HTMLElement | null = view.dom as HTMLElement;
        while (element) {
          if (
            element.classList.contains("editor-content") ||
            element.classList.contains("editor-card-container")
          ) {
            element.scrollLeft = 0;
          }
          element = element.parentElement;
        }
      };
      resetHorizontalEditorScroll();
      const tr = view.state.tr;
      tr.setMeta(BASELINE_REFRESH_META, Date.now());
      tr.setMeta("addToHistory", false);
      view.dispatch(tr);
      if (baselineRefreshFrame !== null) {
        window.cancelAnimationFrame(baselineRefreshFrame);
      }
      baselineRefreshFrame = window.requestAnimationFrame(() => {
        baselineRefreshFrame = null;
        resetHorizontalEditorScroll();
        refreshBaselineResultDeltas(view);
      });
    };

    const openScenarioNameMenu = (
      view: any,
      resultEl: HTMLElement,
      button: HTMLElement,
      payload: ReferencePayload | null,
    ) => {
      const sheetId = getActiveSheetId?.() || "";
      const variableName = resolveVariableNameForPayload(view, payload);
      if (!sheetId || !variableName) return;

      closeResultActionMenu();
      const menu = document.createElement("div");
      menu.className =
        "semantic-result-action-menu semantic-scenario-name-menu";
      menu.id = `smartpad-scenario-dialog-${++resultActionMenuSequence}`;
      menu.setAttribute("role", "dialog");
      menu.setAttribute("aria-label", `Save scenario for ${variableName}`);

      const heading = document.createElement("label");
      heading.className = "semantic-scenario-name-label";
      heading.textContent = `Save scenario for ${variableName}`;
      menu.appendChild(heading);

      const input = document.createElement("input");
      input.className = "semantic-scenario-name-input";
      input.type = "text";
      input.maxLength = 48;
      input.value = suggestScenarioName(loadScenarioComparison(sheetId));
      input.setAttribute("aria-label", "Scenario name");
      heading.htmlFor = `scenario-name-${Math.random().toString(36).slice(2, 8)}`;
      input.id = heading.htmlFor;
      menu.appendChild(input);

      const feedback = document.createElement("span");
      feedback.className = "semantic-scenario-name-feedback";
      feedback.setAttribute("role", "status");
      menu.appendChild(feedback);

      const actions = document.createElement("span");
      actions.className = "semantic-scenario-name-actions";
      const save = document.createElement("button");
      save.type = "button";
      save.textContent = "Save";
      save.className = "is-primary";
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.textContent = "Cancel";
      actions.append(save, cancel);
      menu.appendChild(actions);

      const submit = () => {
        const name = input.value.replace(/\s+/g, " ").trim();
        if (!name) {
          feedback.textContent = "Give this scenario a name.";
          input.focus();
          return;
        }
        const snapshot = captureCurrentNumericSnapshot();
        const saved = snapshot
          ? captureScenario(sheetId, variableName, name, snapshot)
          : null;
        if (!saved) {
          feedback.textContent = `SmartPad can keep up to ${MAX_SCENARIOS_PER_SHEET} scenarios here.`;
          return;
        }
        refreshBaselinePresentation(view);
        closeResultActionMenu();
        resultEl.focus?.();
      };
      [save, cancel].forEach((action) => {
        action.addEventListener("mousedown", (event) => {
          event.preventDefault();
          event.stopPropagation();
        });
      });
      save.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        submit();
      });
      cancel.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeResultActionMenu();
        button.focus();
      });
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          submit();
        } else if (event.key === "Escape") {
          event.preventDefault();
          closeResultActionMenu();
          button.focus();
        }
      });

      document.body.appendChild(menu);
      activateResultActionMenu(menu, button, resultEl);
      positionResultActionMenu(menu, button);
      window.requestAnimationFrame(() => {
        input.focus();
        input.select();
      });
    };

    const openResultActionMenu = (
      view: any,
      resultEl: HTMLElement,
      button: HTMLElement,
    ) => {
      const wasOpenForButton = resolveActiveMenuActivator() === button;
      closeResultActionMenu();
      if (wasOpenForButton) {
        return;
      }

      const payload = payloadFromElement(resultEl);
      const displayedValue = resolveDisplayedResultValue(resultEl);
      const menu = document.createElement("div");
      menu.className = "semantic-result-action-menu";
      menu.id = `smartpad-result-menu-${++resultActionMenuSequence}`;
      menu.setAttribute("role", "menu");
      menu.setAttribute("aria-label", `Actions for result ${displayedValue}`);

      menu.appendChild(
        buildMenuButton("Copy value", () => {
          const copyValue = resolveDisplayedResultValue(resultEl);
          void writeTextToClipboard(copyValue).then((copied) => {
            if (copied || !!copyValue) {
              showCopyFeedback(resultEl);
            }
          });
          closeResultActionMenu();
        }),
      );

      menu.appendChild(
        buildMenuButton(
          "Go to source line",
          () => {
            if (payload) {
              jumpToSourceLine(view, payload.sourceLineId, payload.sourceLine);
              highlightSource(view, payload.sourceLineId, payload.sourceLine, {
                lockMs: 1600,
              });
            }
            closeResultActionMenu();
          },
          {
            disabled:
              !payload || (!payload.sourceLineId && payload.sourceLine <= 0),
            title: "Move the editor caret to the line that produced this result",
            className: "semantic-result-source-action",
          },
        ),
      );

      const activeSheetId = getActiveSheetId?.() || "";
      const sensitivityPlan = buildSensitivitySourcePlan(
        view,
        payload,
        getVariableContext?.() || new Map<string, Variable>(),
        getNumericDisplayOptions(),
      );
      const pinnedSensitivity = activeSheetId
        ? loadSensitivityAnalysis(activeSheetId)
        : null;
      const sensitivityShownHere = Boolean(
        sensitivityPlan &&
          pinnedSensitivity &&
          pinnedSensitivity.targetName === sensitivityPlan.targetName &&
          ((pinnedSensitivity.sourceLineId &&
            pinnedSensitivity.sourceLineId === sensitivityPlan.sourceLineId) ||
            (!pinnedSensitivity.sourceLineId &&
              pinnedSensitivity.sourceLine === sensitivityPlan.sourceLine)),
      );
      menu.appendChild(
        buildMenuButton(
          sensitivityShownHere
            ? "Exploring this result"
            : pinnedSensitivity
              ? "Explore this result instead"
              : "Explore result",
          () => {
            if (activeSheetId && sensitivityPlan) {
              saveSensitivityAnalysis(activeSheetId, {
                sourceLineId: sensitivityPlan.sourceLineId,
                sourceLine: sensitivityPlan.sourceLine,
                targetName: sensitivityPlan.targetName,
              });
              sensitivityAnalysisCache = null;
              refreshBaselinePresentation(view);
            }
            closeResultActionMenu();
          },
          {
            disabled: !activeSheetId || !sensitivityPlan || sensitivityShownHere,
            title: sensitivityPlan
              ? "Open one inline place to understand and manipulate this result"
              : "Available for a named numeric result with editable root assumptions",
            className:
              "semantic-result-sensitivity-action semantic-result-explorer-action",
            accent: Boolean(sensitivityPlan && !sensitivityShownHere),
          },
        ),
      );

      const activeBaseline = getBaselineForActiveSheet();
      const scenarioVariableName = resolveVariableNameForPayload(view, payload);
      const scenarioState = activeSheetId
        ? loadScenarioComparison(activeSheetId)
        : null;
      if (!activeBaseline) {
        menu.appendChild(
          buildMenuButton(
            "Set baseline",
            () => {
              if (captureBaselineForActiveSheet()) {
                refreshBaselinePresentation(view);
              }
              closeResultActionMenu();
            },
            {
              disabled: !activeSheetId,
              title:
                "Capture the current numeric model before exploring changes",
              className: "semantic-result-baseline-action",
            },
          ),
        );
      } else {
        menu.appendChild(
          buildMenuButton(
            "Update baseline",
            () => {
              if (captureBaselineForActiveSheet()) {
                refreshBaselinePresentation(view);
              }
              closeResultActionMenu();
            },
            {
              title: "Use the current model as the new baseline",
              className: "semantic-result-baseline-action",
            },
          ),
        );
        menu.appendChild(
          buildMenuButton(
            "Clear baseline",
            () => {
              if (activeSheetId) {
                clearVariableBaseline(activeSheetId);
                refreshBaselinePresentation(view);
              }
              closeResultActionMenu();
            },
            {
              title: "Stop comparing this sheet with its baseline",
              className: "semantic-result-baseline-clear-action",
            },
          ),
        );
      }

      if (activeBaseline) {
        menu.appendChild(
          buildMenuButton(
            "Save current scenario…",
            () => openScenarioNameMenu(view, resultEl, button, payload),
            {
              disabled:
                !scenarioVariableName ||
                (scenarioState?.scenarios.length || 0) >=
                  MAX_SCENARIOS_PER_SHEET,
              title: scenarioVariableName
                ? "Keep the current model as a named comparison"
                : "Available for named result lines",
              className: "semantic-result-scenario-action",
            },
          ),
        );
      }
      if (scenarioState?.scenarios.length) {
        const alreadyPinned =
          scenarioVariableName === scenarioState.pinnedVariable;
        menu.appendChild(
          buildMenuButton(
            alreadyPinned ? "Comparing this result" : "Compare this result",
            () => {
              if (activeSheetId && scenarioVariableName) {
                pinScenarioVariable(activeSheetId, scenarioVariableName);
                refreshBaselinePresentation(view);
              }
              closeResultActionMenu();
            },
            {
              disabled: !scenarioVariableName || alreadyPinned,
              title: alreadyPinned
                ? "The scenario strip is pinned to this result"
                : "Move the inline comparison to this result",
              className: "semantic-result-scenario-pin-action",
            },
          ),
        );
        menu.appendChild(
          buildMenuButton(
            "Clear scenarios",
            () => {
              if (activeSheetId) {
                clearScenarioComparison(activeSheetId);
                refreshBaselinePresentation(view);
              }
              closeResultActionMenu();
            },
            {
              title: "Remove every saved scenario from this sheet",
              className: "semantic-result-scenario-clear-action",
            },
          ),
        );
      }

      const goalSeekActions = buildGoalSeekMenuActions(
        view,
        payload,
        getVariableContext?.() || new Map<string, Variable>(),
        getNumericDisplayOptions(),
      );
      if (goalSeekActions.length === 0) {
        menu.appendChild(
          buildMenuButton("Find an input for a target…", () => {}, {
            disabled: true,
            title:
              "Available when the result depends on a variable SmartPad can solve for",
          }),
        );
      } else {
        goalSeekActions.forEach((goalAction) => {
          menu.appendChild(
            buildMenuButton(
              goalAction.label,
              () => {
                if (!payload) {
                  closeResultActionMenu();
                  return;
                }
                const insertedCursor = insertTextAfterSourceLine(
                  view,
                  payload,
                  goalAction.line,
                );
                if (typeof insertedCursor === "number") {
                  postInsertCursor = insertedCursor;
                  consumeResultClick = true;
                  view.focus();
                }
                closeResultActionMenu();
              },
              { title: goalAction.title },
            ),
          );
        });
      }
      const visualPlotActions = buildVisualPlotMenuActions(view, payload);
      visualPlotActions.forEach((plotAction) => {
        menu.appendChild(
          buildMenuButton(
            plotAction.label,
            () => {
              if (!payload) {
                closeResultActionMenu();
                return;
              }
              const insertedCursor = insertTextAfterSourceLine(
                view,
                payload,
                plotAction.directive,
              );
              if (typeof insertedCursor === "number") {
                postInsertCursor = insertedCursor;
                consumeResultClick = true;
                view.focus();
              }
              closeResultActionMenu();
            },
            { title: plotAction.title, accent: plotAction.accent },
          ),
        );
      });
      const plotActions = buildPlotMenuActions(
        view,
        payload,
        getFunctionStore?.(),
      );
      if (plotActions.length === 0 && visualPlotActions.length === 0) {
        menu.appendChild(
          buildMenuButton("Plot from result", () => {}, {
            disabled: true,
            title:
              "Available when the source result depends on a plottable variable",
          }),
        );
      } else {
        plotActions.forEach((plotAction) => {
          menu.appendChild(
            buildMenuButton(
              plotAction.label,
              () => {
                if (!payload) {
                  closeResultActionMenu();
                  return;
                }
                const insertedCursor = insertTextAfterSourceLine(
                  view,
                  payload,
                  plotAction.directive,
                );
                if (typeof insertedCursor === "number") {
                  postInsertCursor = insertedCursor;
                  consumeResultClick = true;
                  view.focus();
                }
                closeResultActionMenu();
              },
              { title: plotAction.title },
            ),
          );
        });
      }
      document.body.appendChild(menu);
      activateResultActionMenu(menu, button, resultEl);
      installResultMenuKeyboardNavigation(menu);
      positionResultActionMenu(menu, button);
      const firstAction = menu.querySelector(
        "button:not(:disabled)",
      ) as HTMLButtonElement | null;
      firstAction?.focus();
    };
    const refreshHighlightDecorations = (view: any) => {
      const tr = view.state.tr;
      tr.setMeta(HIGHLIGHT_REFRESH_META, Date.now());
      tr.setMeta("addToHistory", false);
      view.dispatch(tr);
    };
    const clearHighlightedSource = (view: any, force: boolean = false) => {
      if (!force && Date.now() < highlightLockUntil) {
        return;
      }
      if (!highlightedSource) return;
      highlightedSource = null;
      refreshHighlightDecorations(view);
    };
    const highlightSource = (
      view: any,
      sourceLineId: string,
      sourceLine: number,
      options?: { persistent?: boolean; lockMs?: number },
    ) => {
      if (!sourceLineId && sourceLine <= 0) {
        return;
      }
      if (clearHighlightTimer) {
        clearTimeout(clearHighlightTimer);
        clearHighlightTimer = null;
      }
      clearHighlightedSource(view, true);
      highlightedSource = { sourceLineId, sourceLine };
      highlightLockUntil = options?.lockMs ? Date.now() + options.lockMs : 0;
      refreshHighlightDecorations(view);
      if (!options?.persistent) {
        clearHighlightTimer = setTimeout(() => {
          clearHighlightedSource(view);
          clearHighlightTimer = null;
        }, 1200);
      }
    };

    return [
      new Plugin({
        view: (view) => {
          activePluginView = view;
          installRefTraceApi();
          const syncHoverHighlight = () => {
            const hoveredReference = view.dom.querySelector(
              `${REFERENCE_SELECTOR}:hover`,
            ) as HTMLElement | null;
            if (hoveredReference) {
              const sourceLineId = String(
                hoveredReference.getAttribute("data-source-line-id") || "",
              ).trim();
              const sourceLine = Number(
                hoveredReference.getAttribute("data-source-line") || 0,
              );
              const currentKey = `${highlightedSource?.sourceLineId || ""}:${highlightedSource?.sourceLine || 0}`;
              const nextKey = `${sourceLineId}:${sourceLine}`;
              if (currentKey !== nextKey) {
                highlightSource(view, sourceLineId, sourceLine, {
                  persistent: true,
                });
              }
              return;
            }
            if (clearHighlightTimer) {
              return;
            }
            clearHighlightedSource(view, true);
          };

          const handlePointerOver = (event: Event) => {
            const target = getEventElement(event.target);
            const referenceEl = target?.closest(
              REFERENCE_SELECTOR,
            ) as HTMLElement | null;
            if (!referenceEl) return;
            const sourceLineId = String(
              referenceEl.getAttribute("data-source-line-id") || "",
            ).trim();
            const sourceLine = Number(
              referenceEl.getAttribute("data-source-line") || 0,
            );
            highlightSource(view, sourceLineId, sourceLine, {
              persistent: true,
            });
          };

          const handlePointerOut = (event: Event) => {
            const target = getEventElement(event.target);
            const referenceEl = target?.closest(
              REFERENCE_SELECTOR,
            ) as HTMLElement | null;
            if (!referenceEl) return;
            const related = getEventElement(
              (event as PointerEvent).relatedTarget,
            );
            if (related?.closest(REFERENCE_SELECTOR)) {
              return;
            }
            if (clearHighlightTimer) {
              clearTimeout(clearHighlightTimer);
              clearHighlightTimer = null;
            }
            clearHighlightedSource(view);
          };

          const handleReferenceClickHighlight = (event: Event) => {
            const target = getEventElement(event.target);
            if (!target) return;
            const menuAction = target.closest(
              ".semantic-result-menu, .semantic-live-result-menu",
            ) as HTMLElement | null;
            if (menuAction) {
              const resultEl = resolveResultElementFromTarget(menuAction);
              if (resultEl) {
                openResultActionMenu(view, resultEl, menuAction);
              }
              event.preventDefault();
              event.stopPropagation();
              return;
            }
            const copyAction = target.closest(
              ".semantic-result-copy, .semantic-live-result-copy",
            ) as HTMLElement | null;
            if (copyAction) {
              const resultEl = resolveResultElementFromTarget(copyAction);
              if (resultEl) {
                const copyValue = resolveDisplayedResultValue(resultEl);
                void writeTextToClipboard(copyValue).then((copied) => {
                  if (copied || !!copyValue) {
                    showCopyFeedback(resultEl);
                  }
                });
              }
              event.preventDefault();
              event.stopPropagation();
              return;
            }
            const referenceEl = target.closest(
              REFERENCE_SELECTOR,
            ) as HTMLElement | null;
            if (!referenceEl) return;
            const sourceLineId = String(
              referenceEl.getAttribute("data-source-line-id") || "",
            ).trim();
            const sourceLine = Number(
              referenceEl.getAttribute("data-source-line") || 0,
            );
            highlightSource(view, sourceLineId, sourceLine, { lockMs: 1200 });
          };

          view.dom.addEventListener("pointerover", handlePointerOver);
          view.dom.addEventListener("pointerout", handlePointerOut);
          view.dom.addEventListener(
            "click",
            handleReferenceClickHighlight,
            true,
          );
          const handleDocumentPointerDown = (event: Event) => {
            const target = getEventElement(event.target);
            if (!target) {
              closeResultActionMenu();
              return;
            }
            const currentActivator = resolveActiveMenuActivator();
            if (
              activeMenu?.contains(target) ||
              currentActivator?.contains(target)
            ) {
              return;
            }
            closeResultActionMenu();
          };
          document.addEventListener(
            "mousedown",
            handleDocumentPointerDown,
            true,
          );
          const handleBaselineScrubMouseUp = () => {
            baselineScrubMouseUpPending = false;
            if (getBaselineForActiveSheet()) {
              refreshBaselinePresentation(view);
            }
          };
          const handleUiRenderComplete = () => {
            window.requestAnimationFrame(() => {
              refreshBaselineResultDeltas(view);
              syncActiveMenuActivatorAria();
              const activeSheetId = getActiveSheetId?.() || "";
              if (
                activeSheetId &&
                loadSensitivityAnalysis(activeSheetId)
              ) {
                sensitivityAnalysisCache = null;
                refreshBaselinePresentation(view);
              }
              if (document.body.classList.contains("number-scrubbing")) {
                if (!baselineScrubMouseUpPending) {
                  baselineScrubMouseUpPending = true;
                  document.addEventListener(
                    "mouseup",
                    handleBaselineScrubMouseUp,
                    { once: true },
                  );
                }
              }
            });
          };
          const handleActiveSheetChanged = () => {
            sensitivityAnalysisCache = null;
            window.requestAnimationFrame(() =>
              refreshBaselinePresentation(view),
            );
          };
          window.addEventListener("uiRenderComplete", handleUiRenderComplete);
          window.addEventListener(
            "smartpadActiveSheetChanged",
            handleActiveSheetChanged,
          );
          const hoverSyncTimer = window.setInterval(syncHoverHighlight, 80);
          window.requestAnimationFrame(() => refreshBaselineResultDeltas(view));

          return {
            destroy() {
              activePluginView = null;
              view.dom.removeEventListener("pointerover", handlePointerOver);
              view.dom.removeEventListener("pointerout", handlePointerOut);
              view.dom.removeEventListener(
                "click",
                handleReferenceClickHighlight,
                true,
              );
              document.removeEventListener(
                "mousedown",
                handleDocumentPointerDown,
                true,
              );
              document.removeEventListener(
                "mouseup",
                handleBaselineScrubMouseUp,
              );
              window.removeEventListener(
                "uiRenderComplete",
                handleUiRenderComplete,
              );
              window.removeEventListener(
                "smartpadActiveSheetChanged",
                handleActiveSheetChanged,
              );
              window.clearInterval(hoverSyncTimer);
              if (baselineRefreshFrame !== null) {
                window.cancelAnimationFrame(baselineRefreshFrame);
                baselineRefreshFrame = null;
              }
              sensitivityAnalysisCache = null;
              view.dom.classList.remove("sp-baseline-active");
              if (clearHighlightTimer) {
                clearTimeout(clearHighlightTimer);
                clearHighlightTimer = null;
              }
              closeResultActionMenu();
              clearDragSession();
              clearDropTargetIndicator(view);
              clearInlineDropIndicator(view);
              view.dom.classList.remove(RESULT_DRAGGING_CLASS);
              clearHighlightedSource(view);
            },
          };
        },
        props: {
          decorations: (state) => {
            const decorations: Decoration[] = [
              ...buildBaselineDecorations(state),
              ...buildScenarioComparisonDecorations(state),
              ...buildSensitivityDecorations(state),
            ];
            if (highlightedSource) {
              const sourceLineId =
                String(highlightedSource.sourceLineId || "").trim() || null;
              const sourceLine = Number(highlightedSource.sourceLine || 0);
              const range = getSourceHighlightRange(
                state.doc,
                sourceLineId,
                sourceLine,
              );
              if (range) {
                decorations.push(
                  Decoration.node(range.from, range.to, {
                    class: SOURCE_LINE_HIGHLIGHT_CLASS,
                  }),
                );
              }
            }

            if (typeof activeInlineDropPos === "number") {
              const inlinePos = Math.max(
                1,
                Math.min(activeInlineDropPos, state.doc.content.size),
              );
              decorations.push(
                Decoration.widget(
                  inlinePos,
                  () => {
                    const caret = document.createElement("span");
                    caret.className = DROP_INLINE_CARET_CLASS;
                    caret.setAttribute("aria-hidden", "true");
                    return caret;
                  },
                  { side: -1 },
                ),
              );
            }

            if (decorations.length === 0) {
              return null;
            }
            return DecorationSet.create(state.doc, decorations);
          },
          handleTextInput: (view, _from, _to, text) => {
            const range = getReferenceRangeInSelection(view.state);
            if (!range) {
              appendRefTrace("handleTextInputPassthrough", {
                text,
                reason: "noReferenceRange",
                ...snapshotSelectionLine(view),
              });
              return false;
            }
            const selectedPayload = findSelectedReferencePayload(view.state);
            const insertText = stripEchoedReferencePrefix(
              text,
              selectedPayload,
            );
            const insertPos = getReferenceTextInsertionPos(view.state, range);
            appendRefTrace("handleTextInputOverReference", {
              originalText: text,
              insertedText: insertText,
              strippedEchoPrefix: text !== insertText,
              insertPos,
              selectionFrom: view.state.selection.from,
              selectionTo: view.state.selection.to,
              sourceLineId: selectedPayload?.sourceLineId || "",
              sourceValue: selectedPayload?.sourceValue || "",
              sourceLabel: selectedPayload?.sourceLabel || "",
              ...snapshotSelectionLine(view),
            });
            if (!insertText) {
              return true;
            }
            const tr = view.state.tr.insertText(
              insertText,
              insertPos,
              insertPos,
            );
            tr.setSelection(
              TextSelection.create(tr.doc, insertPos + insertText.length),
            );
            view.dispatch(tr);
            return true;
          },
          handleKeyDown: (view, event) => {
            const isMod = event.metaKey || event.ctrlKey;
            if (!isMod || event.altKey) {
              return false;
            }
            return false;
          },
          handleDOMEvents: {
            mouseover: (view, event) => {
              const target = getEventElement(event.target);
              const referenceEl = target?.closest(
                REFERENCE_SELECTOR,
              ) as HTMLElement | null;
              if (!referenceEl) return false;
              const sourceLineId = String(
                referenceEl.getAttribute("data-source-line-id") || "",
              ).trim();
              const sourceLine = Number(
                referenceEl.getAttribute("data-source-line") || 0,
              );
              highlightSource(view, sourceLineId, sourceLine, {
                persistent: true,
              });
              return false;
            },
            mouseout: (view, event) => {
              const target = getEventElement(event.target);
              const referenceEl = target?.closest(
                REFERENCE_SELECTOR,
              ) as HTMLElement | null;
              if (!referenceEl) return false;
              const related = getEventElement(
                (event as MouseEvent).relatedTarget,
              );
              if (related?.closest(REFERENCE_SELECTOR)) {
                return false;
              }
              if (clearHighlightTimer) {
                clearTimeout(clearHighlightTimer);
                clearHighlightTimer = null;
              }
              clearHighlightedSource(view);
              return false;
            },
            mouseleave: (view) => {
              if (clearHighlightTimer) {
                clearTimeout(clearHighlightTimer);
                clearHighlightTimer = null;
              }
              clearHighlightedSource(view);
              return false;
            },
            mousedown: (view, event) => {
              const target = getEventElement(event.target);
              if (!target) return false;
              const copyAction = target.closest(
                ".semantic-result-copy, .semantic-live-result-copy",
              ) as HTMLElement | null;
              if (copyAction) {
                const resultEl = resolveResultElementFromTarget(copyAction);
                if (resultEl) {
                  const copyValue = resolveDisplayedResultValue(resultEl);
                  void writeTextToClipboard(copyValue).then((copied) => {
                    if (copied || !!copyValue) {
                      showCopyFeedback(resultEl);
                    }
                  });
                }
                event.preventDefault();
                event.stopPropagation();
                return true;
              }
              const menuAction = target.closest(
                ".semantic-result-menu, .semantic-live-result-menu",
              ) as HTMLElement | null;
              if (menuAction) {
                event.preventDefault();
                event.stopPropagation();
                return true;
              }
              const referenceEl = target.closest(
                REFERENCE_SELECTOR,
              ) as HTMLElement | null;
              if (referenceEl) {
                const payload = payloadFromReferenceElement(referenceEl);
                if (payload) {
                  lastReferencePayload = payload;
                }
                view.focus();
                selectReferenceNode(view, referenceEl);
                const highlightSourceLineId = String(
                  referenceEl.getAttribute("data-source-line-id") || "",
                ).trim();
                const highlightSourceLine = Number(
                  referenceEl.getAttribute("data-source-line") || 0,
                );
                if (highlightSourceLineId || highlightSourceLine > 0) {
                  highlightSource(
                    view,
                    highlightSourceLineId,
                    highlightSourceLine,
                    {
                      lockMs: 1200,
                    },
                  );
                }
                return false;
              }
              const resultEl = target.closest(RESULT_SELECTOR);
              if (!resultEl) return false;
              const payload = payloadFromElement(resultEl as HTMLElement);
              logRefDebug("result mousedown (drag mode)", {
                selectionFrom: view.state.selection.from,
                hasPayload: !!payload,
              });
              appendRefTrace("resultMouseDownDragMode", {
                selectionFrom: view.state.selection.from,
                hasPayload: !!payload,
                sourceLineId: payload?.sourceLineId || "",
                sourceLine: payload?.sourceLine || 0,
                sourceValue: payload?.sourceValue || "",
                ...snapshotSelectionLine(view),
              });
              return false;
            },
            click: (view, event) => {
              const target = getEventElement(event.target);
              if (!target) return false;
              const copyAction = target.closest(
                ".semantic-result-copy, .semantic-live-result-copy",
              ) as HTMLElement | null;
              if (copyAction) {
                const resultEl = resolveResultElementFromTarget(copyAction);
                if (!resultEl) return false;
                const copyValue = resolveDisplayedResultValue(resultEl);
                void writeTextToClipboard(copyValue).then((copied) => {
                  if (copied || !!copyValue) {
                    showCopyFeedback(resultEl);
                  }
                });
                event.preventDefault();
                event.stopPropagation();
                return true;
              }
              const menuAction = target.closest(
                ".semantic-result-menu, .semantic-live-result-menu",
              ) as HTMLElement | null;
              if (menuAction) {
                const resultEl = resolveResultElementFromTarget(menuAction);
                if (!resultEl) return false;
                openResultActionMenu(view, resultEl, menuAction);
                event.preventDefault();
                event.stopPropagation();
                return true;
              }

              const referenceEl = target.closest(
                REFERENCE_SELECTOR,
              ) as HTMLElement | null;
              if (referenceEl) {
                const payload = payloadFromReferenceElement(referenceEl);
                if (payload) {
                  lastReferencePayload = payload;
                }
                const highlightSourceLineId = String(
                  referenceEl.getAttribute("data-source-line-id") || "",
                ).trim();
                const highlightSourceLine = Number(
                  referenceEl.getAttribute("data-source-line") || 0,
                );
                if (highlightSourceLineId || highlightSourceLine > 0) {
                  highlightSource(
                    view,
                    highlightSourceLineId,
                    highlightSourceLine,
                    {
                      lockMs: 1200,
                    },
                  );
                }
                const sourceLineId = String(
                  referenceEl.getAttribute("data-source-line-id") || "",
                ).trim();
                const isBroken =
                  referenceEl.classList.contains("semantic-reference-broken") ||
                  !!referenceEl.closest(".semantic-reference-broken");
                if (isBroken && (sourceLineId || highlightSourceLine > 0)) {
                  event.preventDefault();
                  return jumpToSourceLine(
                    view,
                    sourceLineId,
                    highlightSourceLine,
                  );
                }
                return false;
              }

              const resultEl = target.closest(
                RESULT_SELECTOR,
              ) as HTMLElement | null;
              if (!resultEl) return false;
              if (consumeResultClick && typeof postInsertCursor === "number") {
                const clamped = Math.max(
                  1,
                  Math.min(postInsertCursor, view.state.doc.content.size),
                );
                const tr = view.state.tr.setSelection(
                  TextSelection.create(view.state.doc, clamped),
                );
                view.dispatch(tr);
                logRefDebug("consume result click restore", {
                  restoreTo: clamped,
                  selectionFrom: view.state.selection.from,
                });
                appendRefTrace("consumeResultClickRestore", {
                  restoreTo: clamped,
                  selectionFrom: view.state.selection.from,
                });
                postInsertCursor = null;
                consumeResultClick = false;
              }
              appendRefTrace("resultClickHandled", {
                ...snapshotSelectionLine(view),
              });
              return false;
            },
            keydown: (view, event) => {
              const keyboardEvent = event as KeyboardEvent;
              const target = getEventElement(keyboardEvent.target);
              appendRefTrace("domKeydown", {
                key: String(keyboardEvent.key || ""),
                code: String(keyboardEvent.code || ""),
                metaKey: Boolean(keyboardEvent.metaKey),
                ctrlKey: Boolean(keyboardEvent.ctrlKey),
                altKey: Boolean(keyboardEvent.altKey),
                shiftKey: Boolean(keyboardEvent.shiftKey),
                ...snapshotSelectionLine(view),
              });

              if (
                target &&
                !keyboardEvent.metaKey &&
                !keyboardEvent.ctrlKey &&
                !keyboardEvent.altKey
              ) {
                const resultValue = target.closest(
                  ".semantic-result-value, .semantic-live-result-value",
                ) as HTMLElement | null;
                if (
                  resultValue &&
                  (keyboardEvent.key === "Enter" ||
                    keyboardEvent.key === " " ||
                    keyboardEvent.key === "ArrowDown")
                ) {
                  const resultEl = resolveResultElementFromTarget(resultValue);
                  if (resultEl) {
                    keyboardEvent.preventDefault();
                    keyboardEvent.stopPropagation();
                    openResultActionMenu(view, resultEl, resultValue);
                    return true;
                  }
                }

                const referenceEl = target.closest(
                  REFERENCE_SELECTOR,
                ) as HTMLElement | null;
                if (
                  referenceEl &&
                  (keyboardEvent.key === "Enter" || keyboardEvent.key === " ")
                ) {
                  const sourceLineId = String(
                    referenceEl.getAttribute("data-source-line-id") || "",
                  ).trim();
                  const sourceLine = Number(
                    referenceEl.getAttribute("data-source-line") || 0,
                  );
                  if (sourceLineId || sourceLine > 0) {
                    keyboardEvent.preventDefault();
                    keyboardEvent.stopPropagation();
                    highlightSource(view, sourceLineId, sourceLine, {
                      lockMs: 1600,
                    });
                    return jumpToSourceLine(view, sourceLineId, sourceLine);
                  }
                }
              }
              return false;
            },
            beforeinput: (view, event) => {
              const inputEvt = event as InputEvent;
              appendRefTrace("domBeforeInput", {
                inputType: String(inputEvt.inputType || ""),
                data: String(inputEvt.data || ""),
                ...snapshotSelectionLine(view),
              });
              return false;
            },
            input: (view, event) => {
              const inputEvt = event as InputEvent;
              appendRefTrace("domInput", {
                inputType: String(inputEvt.inputType || ""),
                data: String(inputEvt.data || ""),
                ...snapshotSelectionLine(view),
              });
              return false;
            },
            dragstart: (_view, event) => {
              const target = getEventElement(event.target);
              if (!target) return false;
              const referenceEl = target.closest(
                REFERENCE_SELECTOR,
              ) as HTMLElement | null;
              if (referenceEl) {
                const payload = payloadFromReferenceElement(referenceEl);
                const moveRange = payload
                  ? getReferenceRangeFromElement(_view, referenceEl)
                  : null;
                if (!payload || !moveRange || !event.dataTransfer) return false;
                activeDragPayload = payload;
                activeDragMoveRange = moveRange;
                closeResultActionMenu();
                _view.dom.classList.add(RESULT_DRAGGING_CLASS);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData(DND_MIME, JSON.stringify(payload));
                event.dataTransfer.setData(
                  REFERENCE_MOVE_MIME,
                  JSON.stringify(moveRange),
                );
                event.dataTransfer.setData(
                  "text/plain",
                  payload.sourceValue || payload.sourceLabel || "value",
                );
                event.stopPropagation();
                if (typeof window !== "undefined") {
                  (window as any)[RESULT_DRAG_ACTIVE_WINDOW_FLAG] = true;
                }
                return true;
              }
              const resultEl = resolveResultElementFromTarget(target);
              if (!resultEl) return false;
              const payload = payloadFromElement(resultEl);
              if (!payload || !event.dataTransfer) return false;
              activeDragPayload = payload;
              closeResultActionMenu();
              _view.dom.classList.add(RESULT_DRAGGING_CLASS);
              installResultDragImage(event as DragEvent, resultEl);
              event.dataTransfer.effectAllowed = "copy";
              event.dataTransfer.setData(DND_MIME, JSON.stringify(payload));
              event.dataTransfer.setData(
                "text/plain",
                payload.sourceValue || payload.sourceLabel || "value",
              );
              if (typeof window !== "undefined") {
                (window as any)[RESULT_DRAG_ACTIVE_WINDOW_FLAG] = true;
              }
              return true;
            },
            dragover: (view, event) => {
              const dragEvent = event as DragEvent;
              if (!dragEvent.dataTransfer && !activeDragPayload) return false;
              const dragTypes = Array.from(dragEvent.dataTransfer?.types || []);
              const hasMimePayload = Boolean(
                dragEvent.dataTransfer?.getData(DND_MIME),
              );
              const hasMovePayload = Boolean(
                dragEvent.dataTransfer?.getData(REFERENCE_MOVE_MIME),
              );
              const windowDragActive =
                typeof window !== "undefined" &&
                Boolean((window as any)[RESULT_DRAG_ACTIVE_WINDOW_FLAG]);
              const isResultDrag =
                dragTypes.includes(DND_MIME) ||
                dragTypes.includes(REFERENCE_MOVE_MIME) ||
                hasMimePayload ||
                hasMovePayload ||
                !!activeDragPayload ||
                windowDragActive;
              if (!isResultDrag) {
                clearDropTargetIndicator(view);
                clearInlineDropIndicator(view);
                return false;
              }
              dragEvent.preventDefault();
              dragEvent.dataTransfer.dropEffect =
                activeDragMoveRange || hasMovePayload ? "move" : "copy";
              const boundaryTarget = resolveBoundaryDropTarget(view, dragEvent);
              const inlinePos = resolveInlineDropPos(view, dragEvent);
              const preferInline = shouldPreferInlineDrop(
                view,
                dragEvent,
                inlinePos,
              );
              if (
                typeof inlinePos === "number" &&
                (preferInline || !boundaryTarget)
              ) {
                clearDropTargetIndicator(view);
                setInlineDropIndicator(view, inlinePos);
              } else if (boundaryTarget) {
                clearInlineDropIndicator(view);
                applyDropTargetIndicator(view, boundaryTarget);
              } else if (!boundaryTarget) {
                clearDropTargetIndicator(view);
                clearInlineDropIndicator(view);
              }
              return false;
            },
            dragleave: (view, event) => {
              const dragEvent = event as DragEvent;
              const types = Array.from(dragEvent.dataTransfer?.types || []);
              const hasMimePayload = Boolean(
                dragEvent.dataTransfer?.getData(DND_MIME),
              );
              if (
                !types.includes(DND_MIME) &&
                !hasMimePayload &&
                !activeDragPayload
              ) {
                return false;
              }
              const related = getEventElement(
                (event as any).relatedTarget || null,
              );
              if (!related || !view.dom.contains(related)) {
                clearDropTargetIndicator(view);
                clearInlineDropIndicator(view);
              }
              // Keep the drag payload alive until `drop`/`dragend`.
              // `dragleave` often fires with null relatedTarget while still inside the editor.
              return false;
            },
            dragend: (view) => {
              clearDropTargetIndicator(view);
              clearInlineDropIndicator(view);
              view.dom.classList.remove(RESULT_DRAGGING_CLASS);
              clearDragSession();
              return false;
            },
            drop: (view, event) => {
              if (!event.dataTransfer && !activeDragPayload) return false;
              event.preventDefault();
              event.stopPropagation();
              view.dom.classList.remove(RESULT_DRAGGING_CLASS);
              const dragEvent = event as DragEvent;
              const fallbackInlinePos = resolveInlineDropPos(view, dragEvent);
              const inlineDropPos =
                typeof activeInlineDropPos === "number"
                  ? activeInlineDropPos
                  : shouldPreferInlineDrop(view, dragEvent, fallbackInlinePos)
                    ? fallbackInlinePos
                    : null;
              const boundaryTarget =
                typeof inlineDropPos === "number"
                  ? null
                  : activeBoundaryDropTarget ||
                    resolveBoundaryDropTarget(view, dragEvent);
              clearDropTargetIndicator(view);
              clearInlineDropIndicator(view);
              const raw = event.dataTransfer?.getData(DND_MIME) || "";
              const rawMove =
                event.dataTransfer?.getData(REFERENCE_MOVE_MIME) || "";
              try {
                const payload = raw
                  ? (JSON.parse(raw) as ReferencePayload)
                  : activeDragPayload;
                if (!payload) {
                  clearDragSession();
                  return false;
                }
                const moveRange = rawMove
                  ? (JSON.parse(rawMove) as ReferenceMovePayload)
                  : activeDragMoveRange;
                const insertMode: "reference" = "reference";
                const insertedCursor =
                  typeof inlineDropPos === "number"
                    ? insertReferenceAt(
                        view,
                        payload,
                        inlineDropPos,
                        insertMode,
                        {
                          moveRange,
                        },
                      )
                    : boundaryTarget
                      ? moveRange
                        ? insertReferenceAt(
                            view,
                            payload,
                            getTextblockSplitPosByLineNumber(
                              view.state.doc,
                              boundaryTarget.sourceLine,
                            ) ?? view.state.selection.from,
                            insertMode,
                            { moveRange },
                          )
                        : insertReferenceAfterBoundary(
                            view,
                            payload,
                            boundaryTarget,
                            insertMode,
                          )
                      : (() => {
                          const inlinePos = resolveInlineDropPos(
                            view,
                            event as DragEvent,
                          );
                          const insertionPos =
                            inlinePos ?? view.state.selection.from;
                          return insertReferenceAt(
                            view,
                            payload,
                            insertionPos,
                            insertMode,
                            {
                              moveRange,
                            },
                          );
                        })();
                if (typeof insertedCursor === "number") {
                  postInsertCursor = insertedCursor;
                  consumeResultClick = true;
                  clearDragSession();
                  event.preventDefault();
                  event.stopPropagation();
                  return true;
                }
                clearDragSession();
                return false;
              } catch {
                clearDragSession();
                return false;
              }
            },
            copy: (view, event) => {
              if (!event.clipboardData) return false;
              const payload = findDirectlySelectedReferencePayload(view.state);
              if (!payload) return false;
              event.clipboardData.setData(
                CLIPBOARD_MIME,
                JSON.stringify(payload),
              );
              event.clipboardData.setData(
                "text/plain",
                serializeReferencePayload(
                  payload,
                  getReferenceTextExportMode(),
                ),
              );
              event.preventDefault();
              return true;
            },
            paste: (view, event) => {
              if (!event.clipboardData) return false;
              const raw = event.clipboardData.getData(CLIPBOARD_MIME);
              if (!raw) return false;
              try {
                const payload = JSON.parse(raw) as ReferencePayload;
                const insertionPos = view.state.selection.from;
                const insertedCursor = insertReferenceAt(
                  view,
                  payload,
                  insertionPos,
                  "reference",
                );
                if (typeof insertedCursor === "number") {
                  postInsertCursor = insertedCursor;
                  event.preventDefault();
                  return true;
                }
                return false;
              } catch {
                return false;
              }
            },
          },
        },
      }),
    ];
  },
});
