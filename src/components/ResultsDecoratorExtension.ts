import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { Node as ProseMirrorNode } from "prosemirror-model";
import type { RenderNode } from "../eval/renderNodes";
import { parseVariableAssignment } from "../parsing/variableParser";

const REF_TRACE_FLAG = "__SP_REF_TRACE_ENABLED";
const REF_TRACE_LOG_STORE = "__SP_REF_TRACE_LOGS";
const REF_TRACE_STORAGE_KEY = "smartpad-debug-ref-trace";
const REF_TRACE_MAX_ENTRIES = 600;

/**
 * ResultsDecoratorExtension
 * Listens for `evaluationDone` events dispatched by the Editor AST pipeline and
 * converts RenderNodes into result/error widget decorations.
 */
export const ResultsDecoratorExtension = Extension.create({
  name: "resultsDecoratorExtension",

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey("results-decorator");

    return [
      new Plugin({
        key: pluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, oldSet) {
            // Preserve existing decorations unless we receive new ones via meta
            const newDecos = tr.getMeta(pluginKey);
            if (newDecos) {
              return newDecos as DecorationSet;
            }
            // Map decorations through document changes
            return oldSet.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return pluginKey.getState(state);
          },
        },
        view(view) {
          const isRefTraceEnabled = (): boolean => {
            if (typeof window === "undefined") return false;
            if (Boolean((window as any)[REF_TRACE_FLAG])) return true;
            try {
              const raw = window.localStorage.getItem(REF_TRACE_STORAGE_KEY);
              return raw === "1" || raw?.toLowerCase() === "true";
            } catch {
              return false;
            }
          };
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
          const normalize = (s: string | undefined | null): string =>
            (s || "").replace(/\s+/g, "").trim();
          const getNodeTextWithoutResults = (node: ProseMirrorNode): string => {
            let text = "";
            node.descendants((child) => {
              if (child.type?.name === "resultToken") {
                return false;
              }
              if (child.type?.name === "referenceToken") {
                text += "§";
                return false;
              }
              if (child.isText) {
                text += child.text;
              }
              return undefined;
            });
            return text;
          };
          const resultHistory = new Map<string, string>();
          const liveResultHistory = new Map<string, string>();
          const referenceValueHistory = new Map<string, string>();
          const liveFlashUntil = new Map<string, number>();
          const referenceFlashUntil = new Map<string, number>();
          const FLASH_DURATION_MS = 900;

          // Only eligible node types should create widgets
          const isWidgetEligible = (rn: any) =>
            rn && (rn.type === "mathResult" || rn.type === "combined" || rn.type === "error");

          // Helper to rebuild decorations from render nodes
          const buildDecorations = (
            doc: ProseMirrorNode,
            renderNodes: RenderNode[],
            lineResultStatusById: Map<
              string,
              { hasError: boolean; errorMessage?: string; display?: string }
            >
          ): DecorationSet => {
            const decorations: Decoration[] = [];

            // Build a map from line number to render nodes for quick lookup
            const renderMap = new Map<number, RenderNode[]>();
            renderNodes.forEach((rn) => {
              const list = renderMap.get(rn.line) || [];
              list.push(rn);
              renderMap.set(rn.line, list);
            });

            // Derive positions by scanning paragraphs for assignment errors (no =>)
            if (renderNodes.length > 0) {
              // Build paragraph index: 1-based line numbers
              const paragraphIndex: Array<{
                start: number;
                text: string;
                lineId: string;
                node: ProseMirrorNode;
              }> = [
                /*1-based*/
              ];
              let line = 0;
              doc.forEach((node: ProseMirrorNode, offset: number) => {
                if (!node.isTextblock) return;
                line += 1;
                const start = offset + 1;
                const text = getNodeTextWithoutResults(node);
                const lineId = String((node as any).attrs?.lineId || "");
                paragraphIndex[line] = { start, text, lineId, node };
              });

              for (let i = 1; i < paragraphIndex.length; i++) {
                const info = paragraphIndex[i];
                if (!info) continue;
                if (info.text.includes("=>")) continue;

                const lineNodes = renderMap.get(i) || [];
                const lineStatus = info.lineId
                  ? lineResultStatusById.get(info.lineId)
                  : undefined;
                const liveNode = lineNodes.find(
                  (node: any) =>
                    !!node.livePreview &&
                    (node.type === "mathResult" || node.type === "combined")
                ) as any;
                if (liveNode) {
                  const liveText =
                    typeof liveNode.result === "number" || typeof liveNode.result === "string"
                      ? String(liveNode.result)
                      : String(liveNode.displayText || "")
                          .replace(/^.*=>\s*/, "")
                          .trim();
                  const sourceLabel = String(
                    liveNode.expression ||
                      liveNode.variableName ||
                      (liveNode.originalRaw || info.text || "").replace(/§/g, "").trim()
                  ).trim();
                  if (liveText) {
                    const liveHistoryKey = `${info.lineId || i}`;
                    const previousLiveValue = liveResultHistory.get(liveHistoryKey);
                    if (previousLiveValue !== undefined && previousLiveValue !== liveText) {
                      liveFlashUntil.set(liveHistoryKey, Date.now() + FLASH_DURATION_MS);
                    }
                    liveResultHistory.set(liveHistoryKey, liveText);
                    const flashLiveResult = (liveFlashUntil.get(liveHistoryKey) || 0) > Date.now();
                    const anchor = info.start + info.text.length;
                    const widget = Decoration.widget(
                      anchor,
                      () => {
                        const wrapper = document.createElement("span");
                        wrapper.className =
                          "semantic-wrapper semantic-lane-result-wrapper semantic-live-result-wrapper";
                        wrapper.setAttribute("contenteditable", "false");
                        const container = document.createElement("span");
                        container.className =
                          "semantic-result-container semantic-live-result-container";
                        container.setAttribute("contenteditable", "false");
                        const span = document.createElement("span");
                        span.className = flashLiveResult
                          ? "semantic-result-display semantic-live-result-display semantic-result-flash"
                          : "semantic-result-display semantic-live-result-display";
                        span.setAttribute("contenteditable", "false");
                        span.setAttribute("data-result", liveText);
                        span.setAttribute("data-source-line-id", info.lineId || "");
                        span.setAttribute("data-source-line", String(i));
                        span.setAttribute("data-source-label", sourceLabel);
                        span.setAttribute("title", liveText);
                        span.setAttribute("aria-label", liveText);
                        span.setAttribute("draggable", "true");
                        span.textContent = liveText;
                        container.appendChild(span);
                        wrapper.appendChild(container);
                        return wrapper;
                      },
                      { side: 1 }
                    );
                    decorations.push(widget);
                    continue;
                  }
                }

                const assignment = parseVariableAssignment(info.text);
                if (assignment.isValid && assignment.rawValue) {
                  const renderNode = lineNodes.find((node) => node.type === "error");
                  const isError = renderNode?.type === "error";
                  if (isError) {
                    let resultText = assignment.rawValue.trim();
                    if (renderNode) {
                      const rn: any = renderNode;
                      if (rn.type === "error" && rn.displayText) {
                        const displayText = String(rn.displayText || "");
                        if (displayText.includes("=>")) {
                          resultText = displayText.replace(/^.*=>\s*/, "");
                        } else if (displayText.includes("⚠️")) {
                          resultText = displayText.substring(displayText.indexOf("⚠️")).trim();
                        } else {
                          resultText = displayText.trim();
                        }
                      }
                    }

                    const anchor = info.start + info.text.length;
                    const widget = Decoration.widget(
                      anchor,
                      () => {
                        const wrapper = document.createElement("span");
                        wrapper.className =
                          "semantic-wrapper semantic-lane-result-wrapper semantic-error-result-wrapper";
                        wrapper.setAttribute("contenteditable", "false");
                        const container = document.createElement("span");
                        container.className = "semantic-result-container";
                        container.setAttribute("contenteditable", "false");
                        const span = document.createElement("span");
                        span.className = "semantic-error-result";
                        span.setAttribute("contenteditable", "false");
                        span.setAttribute("data-result", resultText);
                        span.setAttribute("title", resultText);
                        span.setAttribute("aria-label", resultText);
                        span.textContent = resultText;
                        container.appendChild(span);
                        wrapper.appendChild(container);
                        return wrapper;
                      },
                      { side: 1 }
                    );
                    decorations.push(widget);
                    continue;
                  }
                }

                if (!lineStatus?.hasError) continue;
                const blockedReason = String(
                  lineStatus.errorMessage || lineStatus.display || "Live result unavailable"
                ).trim();
                const anchor = info.start + info.text.length;
                decorations.push(
                  Decoration.widget(
                    anchor,
                    () => {
                      const wrapper = document.createElement("span");
                      wrapper.className =
                        "semantic-wrapper semantic-lane-result-wrapper semantic-live-blocked-wrapper";
                      wrapper.setAttribute("contenteditable", "false");
                      const container = document.createElement("span");
                      container.className = "semantic-result-container";
                      container.setAttribute("contenteditable", "false");
                      const span = document.createElement("span");
                      span.className = "semantic-live-blocked-display";
                      span.setAttribute("contenteditable", "false");
                      span.setAttribute("data-result", blockedReason);
                      span.setAttribute("title", blockedReason);
                      span.setAttribute("aria-label", blockedReason);
                      span.textContent = "...";
                      container.appendChild(span);
                      wrapper.appendChild(container);
                      return wrapper;
                    },
                    { side: 1 }
                  )
                );
              }

              for (let i = 1; i < paragraphIndex.length; i++) {
                const info = paragraphIndex[i];
                if (!info) continue;
                const brokenSources = new Set<string>();

                info.node.nodesBetween(0, info.node.content.size, (child: any, pos: number) => {
                  if (child.type?.name !== "referenceToken") {
                    return undefined;
                  }
                  const sourceLine = Number(child.attrs?.sourceLine || 0);
                  const sourceLineIdRaw = String(child.attrs?.sourceLineId || "");
                  const sourceLineId =
                    sourceLineIdRaw ||
                    (sourceLine > 0 ? String(paragraphIndex[sourceLine]?.lineId || "") : "");
                  if (!sourceLineId) {
                    return false;
                  }
                  const sourceStatus = lineResultStatusById.get(sourceLineId);
                  if (!sourceStatus?.hasError) {
                    return false;
                  }
                  brokenSources.add(sourceLineId);
                  const from = info.start + pos;
                  const to = from + child.nodeSize;
                  decorations.push(
                    Decoration.inline(from, to, {
                      class: "semantic-reference-broken",
                    })
                  );
                  return false;
                });

                if (brokenSources.size > 0) {
                  const anchor = info.start + info.node.content.size;
                  decorations.push(
                    Decoration.widget(
                      anchor,
                      () => {
                        const wrapper = document.createElement("span");
                        wrapper.className = "semantic-wrapper semantic-reference-warning-wrapper";
                        wrapper.setAttribute("contenteditable", "false");
                        const warning = document.createElement("span");
                        warning.className = "semantic-reference-line-warning";
                        warning.setAttribute("contenteditable", "false");
                        warning.textContent = "⚠ source line has error";
                        wrapper.appendChild(warning);
                        return wrapper;
                      },
                      { side: 1 }
                    )
                  );
                }
              }
            }

            return DecorationSet.create(doc, decorations);
          };

          // Global event listener
          const listener = (e: Event) => {
            const custom = e as CustomEvent<{
              renderNodes: RenderNode[];
              lineResultStatusById?: Array<
                [string, { hasError: boolean; errorMessage?: string; display?: string }]
              >;
              sequence?: number;
            }>;
            const renderNodes = custom.detail?.renderNodes ?? [];
            const lineResultStatusById = new Map(
              (custom.detail?.lineResultStatusById || []) as Array<
                [string, { hasError: boolean; errorMessage?: string; display?: string }]
              >
            );

            const resultNodeType = view.state.schema.nodes.resultToken;
            const tr = view.state.tr;
            let changed = false;

            // Build paragraph index for matching results (1-based line numbers)
            const paragraphIndex: Array<{
              start: number;
              text: string;
              node: ProseMirrorNode;
              lineId: string;
            }> = [
              /*1-based*/
            ];
            let line = 0;
            view.state.doc.forEach((node: ProseMirrorNode, offset: number) => {
              if (!node.isTextblock) return;
              line += 1;
              const start = offset + 1;
              const text = getNodeTextWithoutResults(node);
              const lineId = String((node as any).attrs?.lineId || "");
              paragraphIndex[line] = { start, text, node, lineId };
            });
            const lineNumberById = new Map<string, number>();
            paragraphIndex.forEach((entry, idx) => {
              if (!entry?.lineId) return;
              lineNumberById.set(entry.lineId, idx);
            });

            const duplicatePrefixesFromReference = (attrs: any): string[] => {
              const seen = new Set<string>();
              const values = [String(attrs?.sourceValue || ""), String(attrs?.label || "")]
                .map((value) => value.trim())
                .filter((value) => value.length > 0)
                .sort((a, b) => b.length - a.length);
              const unique: string[] = [];
              values.forEach((value) => {
                if (seen.has(value)) return;
                seen.add(value);
                unique.push(value);
              });
              return unique;
            };
            const duplicateLiteralRemovals: Array<{ from: number; to: number }> = [];
            const referenceNodeType = view.state.schema.nodes.referenceToken;
            if (referenceNodeType) {
              for (let i = paragraphIndex.length - 1; i >= 1; i--) {
                const info = paragraphIndex[i];
                if (!info) continue;
                let childOffset = 0;
                for (let c = 0; c < info.node.childCount - 1; c++) {
                  const child = info.node.child(c);
                  const next = info.node.child(c + 1);
                  if (child.type !== referenceNodeType || !next.isText) {
                    childOffset += child.nodeSize;
                    continue;
                  }
                  const duplicatePrefixes = duplicatePrefixesFromReference(child.attrs);
                  if (duplicatePrefixes.length === 0) {
                    childOffset += child.nodeSize;
                    continue;
                  }
                  const nextText = String(next.text || "");
                  const leadingWhitespace = nextText.match(/^\s*/)?.[0]?.length || 0;
                  const trimmedText = nextText.slice(leadingWhitespace);
                  if (!trimmedText) {
                    childOffset += child.nodeSize;
                    continue;
                  }
                  const matchedPrefix = duplicatePrefixes.find((prefix) => {
                    if (!trimmedText.startsWith(prefix)) {
                      return false;
                    }
                    const nextChar = trimmedText[prefix.length] || "";
                    return !nextChar || /[\s+\-*/^%=),]/.test(nextChar);
                  });
                  if (!matchedPrefix) {
                    childOffset += child.nodeSize;
                    continue;
                  }
                  const absoluteStart = info.start + childOffset + child.nodeSize + leadingWhitespace;
                  duplicateLiteralRemovals.push({
                    from: absoluteStart,
                    to: absoluteStart + matchedPrefix.length,
                  });
                  childOffset += child.nodeSize;
                }
              }
            }

            for (let r = duplicateLiteralRemovals.length - 1; r >= 0; r--) {
              const removal = duplicateLiteralRemovals[r];
              tr.delete(removal.from, removal.to);
              changed = true;
            }
            if (duplicateLiteralRemovals.length > 0) {
              appendRefTrace("duplicateLiteralRemovals", {
                count: duplicateLiteralRemovals.length,
              });
            }
            if (referenceNodeType) {
              for (let i = paragraphIndex.length - 1; i >= 1; i--) {
                const info = paragraphIndex[i];
                if (!info) continue;

                info.node.nodesBetween(0, info.node.content.size, (node: ProseMirrorNode, pos) => {
                  if (node.type !== referenceNodeType) {
                    return undefined;
                  }

                  const attrs: any = node.attrs || {};
                  const placeholderKey = String(attrs.placeholderKey || "").trim();
                  const sourceLineRaw = Number(attrs.sourceLine || 0);
                  let sourceLineId = String(attrs.sourceLineId || "").trim();

                  if ((!sourceLineId || !lineResultStatusById.has(sourceLineId)) && sourceLineRaw > 0) {
                    sourceLineId = String(paragraphIndex[sourceLineRaw]?.lineId || "").trim();
                  }

                  const sourceStatus = sourceLineId ? lineResultStatusById.get(sourceLineId) : undefined;
                  const sourceDisplay =
                    sourceStatus && !sourceStatus.hasError
                      ? String(sourceStatus.display || "").trim()
                      : "";
                  const previousDisplay = String(attrs.sourceValue || attrs.label || "").trim();
                  const nextDisplay = sourceDisplay || previousDisplay;
                  const historyKey = placeholderKey || `${i}:${pos}`;
                  const priorSeen = referenceValueHistory.get(historyKey);
                  if (sourceDisplay && priorSeen !== undefined && priorSeen !== sourceDisplay) {
                    referenceFlashUntil.set(historyKey, Date.now() + FLASH_DURATION_MS);
                  }
                  const shouldFlash = (referenceFlashUntil.get(historyKey) || 0) > Date.now();

                  if (sourceDisplay) {
                    referenceValueHistory.set(historyKey, sourceDisplay);
                  } else if (priorSeen === undefined && previousDisplay) {
                    referenceValueHistory.set(historyKey, previousDisplay);
                  }

                  const resolvedSourceLine =
                    sourceLineRaw > 0
                      ? sourceLineRaw
                      : sourceLineId
                        ? Number(lineNumberById.get(sourceLineId) || 0)
                        : 0;
                  const nextLabel = nextDisplay || String(attrs.label || "value");
                  const attrsChanged =
                    String(attrs.sourceLineId || "") !== sourceLineId ||
                    Number(attrs.sourceLine || 0) !== resolvedSourceLine ||
                    String(attrs.sourceValue || "") !== nextDisplay ||
                    String(attrs.label || "") !== nextLabel ||
                    Boolean(attrs.flash) !== shouldFlash;

                  if (attrsChanged) {
                    appendRefTrace("referenceAttrsUpdated", {
                      sourceLineId: sourceLineId || "",
                      sourceLineRaw,
                      resolvedSourceLine,
                      previousDisplay,
                      nextDisplay,
                      shouldFlash,
                    });
                    tr.setNodeMarkup(info.start + pos, undefined, {
                      ...attrs,
                      sourceLineId,
                      sourceLine: resolvedSourceLine,
                      sourceValue: nextDisplay,
                      label: nextLabel,
                      flash: shouldFlash,
                    });
                    changed = true;
                  }

                  return false;
                });
              }
            }

            const eligibleNodes = (renderNodes as any[]).filter((rn) => isWidgetEligible(rn));
            const eligibleNodesByLine = new Map<number, any[]>();
            eligibleNodes.forEach((rn) => {
              const list = eligibleNodesByLine.get(rn.line) || [];
              list.push(rn);
              eligibleNodesByLine.set(rn.line, list);
            });

          // Update inline result nodes from bottom to top so positions stay valid
            for (let i = paragraphIndex.length - 1; i >= 1; i--) {
              const info = paragraphIndex[i];
              if (!info) continue;
              const trimmedText = info.text.trim();
              if (trimmedText.startsWith("#")) {
                if (!resultNodeType) {
                  continue;
                }

                const removals: Array<{ from: number; to: number }> = [];
                info.node.nodesBetween(0, info.node.content.size, (node: ProseMirrorNode, pos) => {
                  if (node.type === resultNodeType) {
                    const from = info.start + pos;
                    removals.push({ from, to: from + node.nodeSize });
                    return false;
                  }
                  return undefined;
                });

                for (let r = removals.length - 1; r >= 0; r--) {
                  tr.delete(removals[r].from, removals[r].to);
                  changed = true;
                }
                continue;
              }
              const arrowIdx = info.text.indexOf("=>");
              if (arrowIdx < 0) {
              if (!resultNodeType) {
                continue;
              }

              const removals: Array<{ from: number; to: number }> = [];
              info.node.nodesBetween(0, info.node.content.size, (node: ProseMirrorNode, pos) => {
                if (node.type === resultNodeType) {
                  const from = info.start + pos;
                  removals.push({ from, to: from + node.nodeSize });
                  return false;
                }
                return undefined;
              });

              for (let r = removals.length - 1; r >= 0; r--) {
                tr.delete(removals[r].from, removals[r].to);
                changed = true;
              }
              continue;
            }

            if (!resultNodeType) {
              continue;
            }

              const exprText = info.text.substring(0, arrowIdx).trim();
              const historyKey = `${i}:${normalize(exprText)}`;
              // Find best matching eligible render node by comparing left-of-arrow text
              let matched: any | null = null;
            const matchByExpression = (candidates: any[]): any | null => {
              for (const rn of candidates) {
                const displayText = String((rn as any).displayText || "");
                if (displayText.includes("=>")) {
                  const leftOfArrow = displayText.split("=>")[0].trim();
                  if (normalize(leftOfArrow) === normalize(exprText)) {
                    return rn;
                  }
                }
                if ((rn as any).originalRaw) {
                  const orig = String((rn as any).originalRaw)
                    .replace(/\s*=>\s*$/, "")
                    .trim();
                  if (normalize(orig) === normalize(exprText)) {
                    return rn;
                  }
                }
              }
              return null;
            };

            const lineCandidates = eligibleNodesByLine.get(i) || [];
            matched = matchByExpression(lineCandidates);
            if (!matched) {
              matched = matchByExpression(eligibleNodes);
            }
            if (!matched && lineCandidates.length === 1) {
              matched = lineCandidates[0];
            }

              const afterArrowPos = info.start + arrowIdx + 2;
              const lineEndPos = info.start + info.node.content.size;
              const slice = tr.doc.slice(afterArrowPos, lineEndPos).content;

              if (!matched) {
                if (slice.childCount > 0) {
                  tr.delete(afterArrowPos, lineEndPos);
                  changed = true;
                }
                continue;
              }

              const displayText = String(matched.displayText || "");
              let resultText: string = "";
              if (displayText.includes("=>")) {
                resultText = displayText.replace(/^.*=>\s*/, "");
              } else if (displayText.includes("⚠️")) {
                resultText = displayText.substring(displayText.indexOf("⚠️")).trim();
              } else {
                resultText = displayText;
              }

              const isError = matched.type === "error";
              const normalizedResult = resultText.trim();
              let existingResult: ProseMirrorNode | null = null;
              slice.forEach((child) => {
                if (!existingResult && resultNodeType && child.type === resultNodeType) {
                  existingResult = child;
                }
              });
              const existingText = existingResult ? existingResult.textContent || "" : "";
              const previousValue = existingText.trim() || resultHistory.get(historyKey);
              const hasChanged =
                previousValue !== undefined && previousValue !== normalizedResult && !isError;
              const flashValue = hasChanged;
              const hasExpected =
                !!existingResult &&
                existingResult.type === resultNodeType &&
                existingText === normalizedResult &&
                !!existingResult.attrs.isError === isError &&
                String(existingResult.attrs.sourceLineId || "") === String(info.lineId || "") &&
                Number(existingResult.attrs.sourceLine || 0) === i;

                if (!hasExpected) {
                  tr.delete(afterArrowPos, lineEndPos);
                  const spaceNode = view.state.schema.text(" ");
                  const content = normalizedResult
                    ? view.state.schema.text(normalizedResult)
                    : undefined;
                  tr.insert(afterArrowPos, spaceNode);
                  tr.insert(
                    afterArrowPos + spaceNode.nodeSize,
                    resultNodeType.create(
                      {
                        value: normalizedResult,
                        isError,
                        flash: flashValue,
                        sourceLineId: info.lineId || "",
                        sourceLine: i,
                        sourceLabel: exprText.replace(/§/g, "").trim(),
                      },
                      content
                    )
                  );
                  changed = true;
                }

              if (!isError) {
                resultHistory.set(historyKey, normalizedResult);
              }
            }

            const decoSet = buildDecorations(tr.doc, renderNodes, lineResultStatusById);
            const finalSet: DecorationSet = decoSet;

            const currentSet = pluginKey.getState(view.state) as DecorationSet | undefined;
            const decoChanged = currentSet
              ? !(currentSet as any).eq?.(finalSet)
              : true;

            if (decoChanged) {
              tr.setMeta(pluginKey, finalSet);
            }

            if (changed || decoChanged) {
              tr.setMeta("addToHistory", false);
              view.dispatch(tr);
            }

            // Dispatch uiRenderComplete event AFTER decorations are applied and update a global sequence flag
            // This makes the pipeline end deterministic for tests
            try {
              const decorationCount = (finalSet as any).find ? (finalSet as any).find().length : 0;
              const sequence =
                (custom.detail as any)?.sequence ?? ((window as any).__evaluationSeq || 0);
              try {
                (window as any).__uiRenderSeq = sequence;
              } catch {}
              window.dispatchEvent(
                new CustomEvent("uiRenderComplete", {
                  detail: {
                    renderNodes: renderNodes,
                    decorationCount,
                    sequence,
                  },
                })
              );
            } catch (e) {
              console.warn("Failed to dispatch uiRenderComplete event", e);
            }
          };

          window.addEventListener("evaluationDone", listener);

          return {
            destroy() {
              window.removeEventListener("evaluationDone", listener);
            },
          };
        },
      }),
    ];
  },
});
