import { Extension } from "@tiptap/core";
import { NodeSelection, Plugin, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { createReferencePlaceholder } from "../references/referenceIds";
import type { SettingsState } from "../state/types";

const RESULT_SELECTOR =
  ".semantic-result-display, .semantic-live-result-display";
const REFERENCE_SELECTOR = ".semantic-reference-chip";
const SOURCE_LINE_HIGHLIGHT_CLASS = "semantic-source-line-highlight";
const DND_MIME = "application/x-smartpad-result-reference";
const CLIPBOARD_MIME = "application/x-smartpad-reference";
const REF_DEBUG_FLAG = "__SP_REF_DEBUG";
const REF_DEBUG_LOG_STORE = "__SP_REF_DEBUG_LOGS";
const REF_TRACE_FLAG = "__SP_REF_TRACE_ENABLED";
const REF_TRACE_LOG_STORE = "__SP_REF_TRACE_LOGS";
const REF_TRACE_STORAGE_KEY = "smartpad-debug-ref-trace";
const REF_TRACE_API_INSTALLED = "__SP_REF_TRACE_API_INSTALLED";
const REF_TRACE_MAX_ENTRIES = 600;
const RESULT_DRAG_ACTIVE_WINDOW_FLAG = "__SP_RESULT_CHIP_DRAG_ACTIVE";

interface ReferencePayload {
  sourceLineId: string;
  sourceLine: number;
  sourceLabel: string;
  sourceValue: string;
  placeholderKey?: string;
}

interface HoveredSourceRef {
  sourceLineId: string;
  sourceLine: number;
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

const isWordBoundary = (value: string): boolean => !/[a-zA-Z0-9_]/.test(value || "");

const getSelectedTextblockLineId = (state: any): string => {
  const selection = state?.selection;
  const $from = selection?.$from;
  if (!$from) return "";
  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    const node = $from.node(depth);
    if (node?.isTextblock) {
      return String((node as any).attrs?.lineId || "").trim();
    }
  }
  return "";
};

const getEventElement = (eventTarget: EventTarget | null): HTMLElement | null => {
  if (!eventTarget) return null;
  if (eventTarget instanceof HTMLElement) return eventTarget;
  if (eventTarget instanceof Element) return eventTarget as HTMLElement;
  const maybeNode = eventTarget as Node;
  if (maybeNode?.parentElement instanceof HTMLElement) {
    return maybeNode.parentElement;
  }
  return null;
};

const uniqueNonEmptyValues = (values: Array<string | null | undefined>): string[] => {
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

const isOperatorPrefix = (value: string): boolean => /^[+\-*/^%=<>!]/.test(value);

const stripEchoedReferencePrefix = (text: string, payload: ReferencePayload | null): string => {
  const input = String(text || "");
  if (!payload || !input) {
    return input;
  }
  const candidates = uniqueNonEmptyValues([payload.sourceValue, payload.sourceLabel]).sort(
    (a, b) => b.length - a.length
  );
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

const insertReferenceAt = (
  view: any,
  payload: ReferencePayload,
  pos: number,
  mode: "reference" | "value" = "reference"
): number | null => {
  if (!payload.sourceLineId) return null;
  const { state } = view;
  const insertTextValue = String(payload.sourceValue || payload.sourceLabel || "value");
  const referenceNode = mode === "reference" ? createReferenceNode(state, payload) : null;
  if (mode === "reference" && !referenceNode) return null;
  try {
    const insertionPos = Math.max(0, Math.min(pos, state.doc.content.size));
    const before = insertionPos > 0 ? getTextAt(state.doc, insertionPos - 1, insertionPos) : "";
    const after = getTextAt(state.doc, insertionPos, insertionPos + 1);
    const prefix = before && !isWordBoundary(before) ? " " : "";
    // Keep a trailing text slot after inserted atom references so caret can
    // remain visible and stable when the reference lands at end-of-line.
    const suffix = after
      ? !isWordBoundary(after)
        ? " "
        : ""
      : " ";

    const tr = state.tr;
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
    while (selectionPos > 1 && !tr.doc.resolve(selectionPos).parent.inlineContent) {
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
      sourceLineId: payload.sourceLineId,
    });
    appendRefTrace("insertReferenceAt", {
      mode,
      insertionPos,
      cursor,
      selectionPos,
      sourceLineId: payload.sourceLineId,
      sourceLine: payload.sourceLine,
      sourceValue: payload.sourceValue,
    });
    return cursor;
  } catch {
    logRefDebug("insertReferenceAt failed", {
      sourceLineId: payload.sourceLineId,
      pos,
    });
    appendRefTrace("insertReferenceAtFailed", {
      mode,
      sourceLineId: payload.sourceLineId,
      sourceLine: payload.sourceLine,
      pos,
    });
    return null;
  }
};

const insertReferenceOnNewLine = (
  view: any,
  payload: ReferencePayload,
  mode: "reference" | "value" = "reference"
): number | null => {
  const { state } = view;
  const { $from } = state.selection;
  let textblockDepth = $from.depth;
  while (textblockDepth > 0 && !$from.node(textblockDepth).isTextblock) {
    textblockDepth -= 1;
  }
  if (textblockDepth <= 0 || !$from.node(textblockDepth).isTextblock) {
    return null;
  }

  const lineEnd = $from.end(textblockDepth);
  const splitSelectionPos = Math.max(1, Math.min(lineEnd + 1, state.doc.content.size));
  const splitTr = state.tr.split(lineEnd);
  splitTr.setSelection(TextSelection.create(splitTr.doc, splitSelectionPos));
  view.dispatch(splitTr);
  return insertReferenceAt(view, payload, view.state.selection.from, mode);
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
  mode: "reference" | "value" = "reference"
): number | null => {
  const { state } = view;
  const splitPos = getLastTextblockSplitPos(state.doc);
  if (typeof splitPos !== "number" || splitPos <= 0) {
    return insertReferenceAt(view, payload, state.doc.content.size, mode);
  }
  try {
    const splitSelectionPos = Math.max(1, Math.min(splitPos + 1, state.doc.content.size));
    const splitTr = state.tr.split(splitPos);
    splitTr.setSelection(TextSelection.create(splitTr.doc, splitSelectionPos));
    view.dispatch(splitTr);
    return insertReferenceAt(view, payload, view.state.selection.from, mode);
  } catch {
    return insertReferenceAt(view, payload, state.doc.content.size, mode);
  }
};

const shouldInsertOnBottomNewLine = (view: any, event: DragEvent): boolean => {
  const paragraphs = Array.from(
    view.dom.querySelectorAll("p[data-line-id]")
  ) as HTMLElement[];
  const lastParagraph = paragraphs[paragraphs.length - 1];
  if (!lastParagraph) {
    return false;
  }
  const lastRect = lastParagraph.getBoundingClientRect();
  return event.clientY >= lastRect.bottom + 6;
};

const normalizeChipText = (value: string): string => String(value || "").replace(/\s+/g, " ").trim();

const resolveDisplayedResultValue = (target: HTMLElement): string => {
  // Prefer the literal rendered chip text so inserted references match exactly
  // what the user sees, even if attributes are stale.
  const visibleText = normalizeChipText(target.innerText || target.textContent || "");
  if (visibleText) return visibleText;
  const ariaValue = normalizeChipText(String(target.getAttribute("aria-label") || ""));
  if (ariaValue) return ariaValue;
  const titleValue = normalizeChipText(String(target.getAttribute("title") || ""));
  if (titleValue) return titleValue;
  return normalizeChipText(String(target.getAttribute("data-result") || ""));
};

const resolveResultElementFromTarget = (target: HTMLElement | null): HTMLElement | null => {
  if (!target) return null;
  const direct = target.closest(RESULT_SELECTOR) as HTMLElement | null;
  if (direct) return direct;
  const wrapper = target.closest(".semantic-wrapper, .semantic-result-container") as HTMLElement | null;
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
  const fallbackLineId = String(
    target.closest("p[data-line-id]")?.getAttribute("data-line-id") || ""
  ).trim();
  const lineId = String(target.getAttribute("data-source-line-id") || fallbackLineId).trim();
  const sourceLine = Number(target.getAttribute("data-source-line") || 0);
  if (!lineId) return null;
  const label =
    String(target.getAttribute("data-source-label") || "").trim() ||
    String(target.getAttribute("aria-label") || "").trim();
  const renderedText = normalizeChipText(target.textContent || "");
  const value = resolveDisplayedResultValue(target);
  const sourceValue = value || renderedText;
  const placeholderKey = String(target.getAttribute("data-placeholder-key") || "").trim();
  return {
    sourceLineId: lineId,
    sourceLine,
    sourceLabel: label || sourceValue || "value",
    sourceValue,
    placeholderKey,
  };
};

const findSelectedReferencePayload = (state: any): ReferencePayload | null => {
  const referenceType = state.schema.nodes.referenceToken;
  if (!referenceType) return null;
  if (state.selection instanceof NodeSelection && state.selection.node?.type === referenceType) {
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

const findDirectlySelectedReferencePayload = (state: any): ReferencePayload | null => {
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

const getReferenceRangeInSelection = (state: any): { from: number; to: number } | null => {
  const referenceType = state.schema.nodes.referenceToken;
  if (!referenceType) return null;
  const { selection } = state;

  if (selection instanceof NodeSelection && selection.node?.type === referenceType) {
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
  state.doc.nodesBetween(selection.from, selection.to, (node: any, pos: number) => {
    if (node.type === referenceType) {
      found = { from: pos, to: pos + node.nodeSize };
      return false;
    }
    return undefined;
  });
  return found;
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

const jumpToSourceLine = (view: any, sourceLineId: string): boolean => {
  if (!sourceLineId) return false;
  const paragraph = view.dom.querySelector(`p[data-line-id="${sourceLineId}"]`);
  if (!paragraph) return false;
  const pos = view.posAtDOM(paragraph, 0);
  const target = Math.max(1, Math.min(pos + 1, view.state.doc.content.size));
  const tr = view.state.tr.setSelection(TextSelection.create(view.state.doc, target));
  view.dispatch(tr);
  view.focus();
  return true;
};

const getSourceHighlightRange = (
  doc: any,
  sourceLineId: string | null,
  sourceLine: number = 0
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
      getSettings: (): Pick<SettingsState, "chipInsertMode" | "referenceTextExportMode"> => ({
        chipInsertMode: "reference",
        referenceTextExportMode: "preserve",
      }),
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
          TextSelection.create(state.doc, state.selection.to)
        );
        view.dispatch(tr);
        return false;
      },
    };
  },

  addProseMirrorPlugins() {
    const getSettings = this.options.getSettings as
      | (() => Pick<SettingsState, "chipInsertMode" | "referenceTextExportMode">)
      | undefined;
    const getChipInsertMode = (): "reference" | "value" =>
      getSettings?.().chipInsertMode === "value" ? "value" : "reference";
    const getReferenceTextExportMode = (): "preserve" | "readable" =>
      getSettings?.().referenceTextExportMode === "readable" ? "readable" : "preserve";
    const serializeReferencePayload = (
      payload: ReferencePayload,
      mode: "preserve" | "readable"
    ): string => {
      if (mode === "preserve") {
        return payload.placeholderKey || payload.sourceValue || payload.sourceLabel || "value";
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
    const clearDragSession = () => {
      activeDragPayload = null;
      if (typeof window !== "undefined") {
        (window as any)[RESULT_DRAG_ACTIVE_WINDOW_FLAG] = false;
      }
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
      options?: { persistent?: boolean; lockMs?: number }
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
          installRefTraceApi();
          const syncHoverHighlight = () => {
            const hoveredReference = view.dom.querySelector(
              `${REFERENCE_SELECTOR}:hover`
            ) as HTMLElement | null;
            if (hoveredReference) {
              const sourceLineId = String(
                hoveredReference.getAttribute("data-source-line-id") || ""
              ).trim();
              const sourceLine = Number(hoveredReference.getAttribute("data-source-line") || 0);
              const currentKey = `${highlightedSource?.sourceLineId || ""}:${highlightedSource?.sourceLine || 0}`;
              const nextKey = `${sourceLineId}:${sourceLine}`;
              if (currentKey !== nextKey) {
                highlightSource(view, sourceLineId, sourceLine, { persistent: true });
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
            const referenceEl = target?.closest(REFERENCE_SELECTOR) as HTMLElement | null;
            if (!referenceEl) return;
            const sourceLineId = String(
              referenceEl.getAttribute("data-source-line-id") || ""
            ).trim();
            const sourceLine = Number(referenceEl.getAttribute("data-source-line") || 0);
            highlightSource(view, sourceLineId, sourceLine, { persistent: true });
          };

          const handlePointerOut = (event: Event) => {
            const target = getEventElement(event.target);
            const referenceEl = target?.closest(REFERENCE_SELECTOR) as HTMLElement | null;
            if (!referenceEl) return;
            const related = getEventElement((event as PointerEvent).relatedTarget);
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
            const referenceEl = target?.closest(REFERENCE_SELECTOR) as HTMLElement | null;
            if (!referenceEl) return;
            const sourceLineId = String(
              referenceEl.getAttribute("data-source-line-id") || ""
            ).trim();
            const sourceLine = Number(referenceEl.getAttribute("data-source-line") || 0);
            highlightSource(view, sourceLineId, sourceLine, { lockMs: 1200 });
          };

          view.dom.addEventListener("pointerover", handlePointerOver);
          view.dom.addEventListener("pointerout", handlePointerOut);
          view.dom.addEventListener("click", handleReferenceClickHighlight, true);
          const hoverSyncTimer = window.setInterval(syncHoverHighlight, 80);

          return {
            destroy() {
              view.dom.removeEventListener("pointerover", handlePointerOver);
              view.dom.removeEventListener("pointerout", handlePointerOut);
              view.dom.removeEventListener("click", handleReferenceClickHighlight, true);
              window.clearInterval(hoverSyncTimer);
              if (clearHighlightTimer) {
                clearTimeout(clearHighlightTimer);
                clearHighlightTimer = null;
              }
              clearDragSession();
              clearHighlightedSource(view);
            },
          };
        },
        props: {
          decorations: (state) => {
            if (!highlightedSource) {
              return null;
            }
            const sourceLineId = String(highlightedSource.sourceLineId || "").trim() || null;
            const sourceLine = Number(highlightedSource.sourceLine || 0);
            const range = getSourceHighlightRange(state.doc, sourceLineId, sourceLine);
            if (!range) {
              return null;
            }
            return DecorationSet.create(state.doc, [
              Decoration.node(range.from, range.to, {
                class: SOURCE_LINE_HIGHLIGHT_CLASS,
              }),
            ]);
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
            const insertText = stripEchoedReferencePrefix(text, selectedPayload);
            appendRefTrace("handleTextInputOverReference", {
              originalText: text,
              insertedText: insertText,
              strippedEchoPrefix: text !== insertText,
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
            const insertPos = range.to;
            const tr = view.state.tr.insertText(insertText, insertPos, insertPos);
            tr.setSelection(TextSelection.create(tr.doc, insertPos + insertText.length));
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
              const referenceEl = target?.closest(REFERENCE_SELECTOR) as HTMLElement | null;
              if (!referenceEl) return false;
              const sourceLineId = String(
                referenceEl.getAttribute("data-source-line-id") || ""
              ).trim();
              const sourceLine = Number(referenceEl.getAttribute("data-source-line") || 0);
              highlightSource(view, sourceLineId, sourceLine, { persistent: true });
              return false;
            },
            mouseout: (view, event) => {
              const target = getEventElement(event.target);
              const referenceEl = target?.closest(REFERENCE_SELECTOR) as HTMLElement | null;
              if (!referenceEl) return false;
              const related = getEventElement((event as MouseEvent).relatedTarget);
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
              const referenceEl = target.closest(REFERENCE_SELECTOR) as HTMLElement | null;
              if (referenceEl) {
                const payload = payloadFromElement(referenceEl);
                if (payload) {
                  lastReferencePayload = payload;
                }
                event.preventDefault();
                event.stopPropagation();
                view.focus();
                selectReferenceNode(view, referenceEl);
                const highlightSourceLineId = String(
                  referenceEl.getAttribute("data-source-line-id") || ""
                ).trim();
                const highlightSourceLine = Number(
                  referenceEl.getAttribute("data-source-line") || 0
                );
                if (highlightSourceLineId || highlightSourceLine > 0) {
                  highlightSource(view, highlightSourceLineId, highlightSourceLine, {
                    lockMs: 1200,
                  });
                }
                return true;
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

              const referenceEl = target.closest(REFERENCE_SELECTOR) as HTMLElement | null;
              if (referenceEl) {
                const payload = payloadFromElement(referenceEl);
                if (payload) {
                  lastReferencePayload = payload;
                }
                const highlightSourceLineId = String(
                  referenceEl.getAttribute("data-source-line-id") || ""
                ).trim();
                const highlightSourceLine = Number(
                  referenceEl.getAttribute("data-source-line") || 0
                );
                if (highlightSourceLineId || highlightSourceLine > 0) {
                  highlightSource(view, highlightSourceLineId, highlightSourceLine, {
                    lockMs: 1200,
                  });
                }
                const sourceLineId =
                  String(referenceEl.getAttribute("data-source-line-id") || "").trim();
                const isBroken =
                  referenceEl.classList.contains("semantic-reference-broken") ||
                  !!referenceEl.closest(".semantic-reference-broken");
                if (isBroken && sourceLineId) {
                  event.preventDefault();
                  return jumpToSourceLine(view, sourceLineId);
                }
                return false;
              }

              const resultEl = target.closest(RESULT_SELECTOR) as HTMLElement | null;
              if (!resultEl) return false;
              if (consumeResultClick && typeof postInsertCursor === "number") {
                const clamped = Math.max(
                  1,
                  Math.min(postInsertCursor, view.state.doc.content.size)
                );
                const tr = view.state.tr.setSelection(
                  TextSelection.create(view.state.doc, clamped)
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
              appendRefTrace("domKeydown", {
                key: String((event as KeyboardEvent).key || ""),
                code: String((event as KeyboardEvent).code || ""),
                metaKey: Boolean((event as KeyboardEvent).metaKey),
                ctrlKey: Boolean((event as KeyboardEvent).ctrlKey),
                altKey: Boolean((event as KeyboardEvent).altKey),
                shiftKey: Boolean((event as KeyboardEvent).shiftKey),
                ...snapshotSelectionLine(view),
              });
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
              const resultEl = resolveResultElementFromTarget(target);
              if (!resultEl) return false;
              const payload = payloadFromElement(resultEl);
              if (!payload || !event.dataTransfer) return false;
              activeDragPayload = payload;
              event.dataTransfer.effectAllowed = "copy";
              event.dataTransfer.setData(DND_MIME, JSON.stringify(payload));
              event.dataTransfer.setData(
                "text/plain",
                payload.sourceValue || payload.sourceLabel || "value"
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
              const isResultDrag = dragTypes.includes(DND_MIME) || !!activeDragPayload;
              if (!isResultDrag) {
                return false;
              }
              dragEvent.preventDefault();
              dragEvent.dataTransfer.dropEffect = "copy";
              return false;
            },
            dragleave: (_view, event) => {
              const dragEvent = event as DragEvent;
              const types = Array.from(dragEvent.dataTransfer?.types || []);
              if (!types.includes(DND_MIME) && !activeDragPayload) {
                return false;
              }
              // Keep the drag payload alive until `drop`/`dragend`.
              // `dragleave` often fires with null relatedTarget while still inside the editor.
              return false;
            },
            dragend: (_view) => {
              clearDragSession();
              return false;
            },
            drop: (view, event) => {
              if (!event.dataTransfer && !activeDragPayload) return false;
              const raw = event.dataTransfer?.getData(DND_MIME) || "";
              try {
                const payload = raw
                  ? (JSON.parse(raw) as ReferencePayload)
                  : activeDragPayload;
                if (!payload) {
                  clearDragSession();
                  return false;
                }
                const insertMode = getChipInsertMode();
                const insertOnBottom = shouldInsertOnBottomNewLine(view, event as DragEvent);
                const insertedCursor = insertOnBottom
                  ? insertReferenceOnBottomNewLine(view, payload, insertMode)
                  : (() => {
                      const coords = view.posAtCoords({
                        left: event.clientX,
                        top: event.clientY,
                      });
                      const insertionPos = coords?.pos ?? view.state.selection.from;
                      return insertReferenceAt(view, payload, insertionPos, insertMode);
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
              event.clipboardData.setData(CLIPBOARD_MIME, JSON.stringify(payload));
              event.clipboardData.setData(
                "text/plain",
                serializeReferencePayload(payload, getReferenceTextExportMode())
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
                const insertedCursor = insertReferenceAt(view, payload, insertionPos, "reference");
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
