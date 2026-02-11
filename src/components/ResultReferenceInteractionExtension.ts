import { Extension } from "@tiptap/core";
import { NodeSelection, Plugin, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { createReferencePlaceholder } from "../references/referenceIds";
import type { SettingsState } from "../state/types";

const RESULT_SELECTOR =
  ".semantic-result-display, .semantic-live-result-display, .semantic-assignment-display";
const REFERENCE_SELECTOR = ".semantic-reference-chip";
const SOURCE_LINE_HIGHLIGHT_CLASS = "semantic-source-line-highlight";
const DND_MIME = "application/x-smartpad-result-reference";
const CLIPBOARD_MIME = "application/x-smartpad-reference";
const REF_DEBUG_FLAG = "__SP_REF_DEBUG";
const REF_DEBUG_LOG_STORE = "__SP_REF_DEBUG_LOGS";

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

const logRefDebug = (...args: any[]) => {
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
    return cursor;
  } catch {
    logRefDebug("insertReferenceAt failed", {
      sourceLineId: payload.sourceLineId,
      pos,
    });
    return null;
  }
};

const payloadFromElement = (target: HTMLElement): ReferencePayload | null => {
  const fallbackLineId = String(
    target.closest("p[data-line-id]")?.getAttribute("data-line-id") || ""
  ).trim();
  const lineId = String(target.getAttribute("data-source-line-id") || fallbackLineId).trim();
  const sourceLine = Number(target.getAttribute("data-source-line") || 0);
  if (!lineId) return null;
  const label =
    String(target.getAttribute("data-source-label") || "").trim() ||
    String(target.getAttribute("aria-label") || "").trim();
  const value = String(target.getAttribute("data-result") || "").trim();
  const placeholderKey = String(target.getAttribute("data-placeholder-key") || "").trim();
  return {
    sourceLineId: lineId,
    sourceLine,
    sourceLabel: label || value || "value",
    sourceValue: value,
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
              event.preventDefault();
              event.stopPropagation();
              view.focus();
              logRefDebug("result mousedown", {
                selectionFrom: view.state.selection.from,
                hasPayload: !!payload,
              });
              if (!payload) {
                return true;
              }
              const insertionPos = view.state.selection.from;
              const insertMode = getChipInsertMode();
              const insertedCursor = insertReferenceAt(view, payload, insertionPos, insertMode);
              if (typeof insertedCursor === "number") {
                postInsertCursor = insertedCursor;
                consumeResultClick = true;
                view.focus();
                return true;
              }
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
              event.preventDefault();
              event.stopPropagation();
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
                postInsertCursor = null;
                consumeResultClick = false;
              }
              view.focus();
              return true;
            },
            dragstart: (_view, event) => {
              const target = getEventElement(event.target);
              if (!target) return false;
              const resultEl = target.closest(RESULT_SELECTOR) as HTMLElement | null;
              if (!resultEl) return false;
              const payload = payloadFromElement(resultEl);
              if (!payload || !event.dataTransfer) return false;
              event.dataTransfer.effectAllowed = "copy";
              event.dataTransfer.setData(DND_MIME, JSON.stringify(payload));
              return true;
            },
            drop: (view, event) => {
              if (!event.dataTransfer) return false;
              const raw = event.dataTransfer.getData(DND_MIME);
              if (!raw) return false;
              try {
                const payload = JSON.parse(raw) as ReferencePayload;
                const coords = view.posAtCoords({
                  left: event.clientX,
                  top: event.clientY,
                });
                const insertionPos = coords?.pos ?? view.state.selection.from;
                const insertMode = getChipInsertMode();
                const insertedCursor = insertReferenceAt(view, payload, insertionPos, insertMode);
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
            copy: (view, event) => {
              if (!event.clipboardData) return false;
              const payload = findSelectedReferencePayload(view.state);
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
