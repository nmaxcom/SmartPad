import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { Node as ProseMirrorNode } from "prosemirror-model";
import type { RenderNode } from "../eval/renderNodes";
import { parseVariableAssignment } from "../parsing/variableParser";

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
          const normalize = (s: string | undefined | null): string =>
            (s || "").replace(/\s+/g, "").trim();
          const getNodeTextWithoutResults = (node: ProseMirrorNode): string => {
            let text = "";
            node.descendants((child) => {
              if (child.type?.name === "resultToken") {
                return false;
              }
              if (child.isText) {
                text += child.text;
              }
              return undefined;
            });
            return text;
          };

          // Only eligible node types should create widgets
          const isWidgetEligible = (rn: any) =>
            rn && (rn.type === "mathResult" || rn.type === "combined" || rn.type === "error");

          // Helper to rebuild decorations from render nodes
          const buildDecorations = (
            doc: ProseMirrorNode,
            renderNodes: RenderNode[]
          ): DecorationSet => {
            const decorations: Decoration[] = [];

            // Build a map from line number to render node for quick lookup
            const renderMap = new Map<number, RenderNode>();
            renderNodes.forEach((rn) => {
              renderMap.set(rn.line, rn);
            });

            // Derive positions by scanning paragraphs for assignment errors (no =>)
            if (renderNodes.length > 0) {
              // Build paragraph index: 1-based line numbers
              const paragraphIndex: Array<{ start: number; text: string }> = [
                /*1-based*/
              ];
              let line = 0;
              doc.forEach((node: ProseMirrorNode, offset: number) => {
                if (!node.isTextblock) return;
                line += 1;
                const start = offset + 1;
                const text = getNodeTextWithoutResults(node);
                paragraphIndex[line] = { start, text };
              });

              for (let i = 1; i < paragraphIndex.length; i++) {
                const info = paragraphIndex[i];
                if (!info) continue;
                if (info.text.includes("=>")) continue;

                const assignment = parseVariableAssignment(info.text);
                if (!assignment.isValid || !assignment.rawValue) continue;

                const renderNode = renderMap.get(i);
                const isError = renderNode?.type === "error";
                if (!isError) continue;

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
                    wrapper.className = "semantic-wrapper";
                    const container = document.createElement("span");
                    container.className = "semantic-result-container";
                    const span = document.createElement("span");
                    span.className = "semantic-error-result";
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
              }
            }

            return DecorationSet.create(doc, decorations);
          };

          // Global event listener
          const listener = (e: Event) => {
            const custom = e as CustomEvent<{ renderNodes: RenderNode[]; sequence?: number }>;
            const renderNodes = custom.detail?.renderNodes ?? [];

            const resultNodeType = view.state.schema.nodes.resultToken;
            const tr = view.state.tr;
            let changed = false;

            // Build paragraph index for matching results (1-based line numbers)
            const paragraphIndex: Array<{ start: number; text: string; node: ProseMirrorNode }> = [
              /*1-based*/
            ];
            let line = 0;
            view.state.doc.forEach((node: ProseMirrorNode, offset: number) => {
              if (!node.isTextblock) return;
              line += 1;
              const start = offset + 1;
              const text = getNodeTextWithoutResults(node);
              paragraphIndex[line] = { start, text, node };
            });

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
              const renderText = normalizedResult;
              const existingResult = slice.childCount === 1 ? slice.child(0) : null;
              const existingText = existingResult ? existingResult.textContent || "" : "";
              const hasExpected =
                !!existingResult &&
                existingResult.type === resultNodeType &&
                existingText === normalizedResult &&
                !!existingResult.attrs.isError === isError;

              if (!hasExpected) {
                tr.delete(afterArrowPos, lineEndPos);
                const content = normalizedResult
                  ? view.state.schema.text(normalizedResult)
                  : undefined;
                tr.insert(
                  afterArrowPos,
                  resultNodeType.create({ value: normalizedResult, isError }, content)
                );
                changed = true;
              }
            }

            const decoSet = buildDecorations(tr.doc, renderNodes);
            const finalSet: DecorationSet = decoSet;

            const currentSet = pluginKey.getState(view.state) as DecorationSet | undefined;
            const decoChanged = currentSet ? !currentSet.eq(finalSet) : true;

            if (decoChanged) {
              tr.setMeta(pluginKey, finalSet);
            }

            if (changed || decoChanged) {
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
