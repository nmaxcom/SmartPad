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
          // Helper to rebuild decorations from render nodes
          const buildDecorations = (renderNodes: RenderNode[]): DecorationSet => {
            const decorations: Decoration[] = [];

            // Build a map from line number to render node for quick lookup
            const renderMap = new Map<number, RenderNode>();
            renderNodes.forEach((rn) => {
              renderMap.set(rn.line, rn);
            });

            const normalize = (s: string | undefined | null): string =>
              (s || "").replace(/\s+/g, "").trim();

            const isLiteralAssignmentValue = (value: string): boolean => {
              const trimmed = value.trim();
              if (!trimmed) return false;

              const numberLiteral =
                /^-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;
              const percentLiteral = /^-?\d+(?:\.\d+)?%$/;
              const currencySymbolLiteral =
                /^[\$€£¥₹₿]\s*\d{1,3}(?:,\d{3})*(?:\.\d+)?$/;
              const currencyCodeLiteral =
                /^\d{1,3}(?:,\d{3})*(?:\.\d+)?\s+(CHF|CAD|AUD)$/;
              const unitLiteral =
                /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\s*[a-zA-Z°][a-zA-Z0-9°\/\^\-\*\·]*$/;

              return (
                numberLiteral.test(trimmed) ||
                percentLiteral.test(trimmed) ||
                currencySymbolLiteral.test(trimmed) ||
                currencyCodeLiteral.test(trimmed) ||
                unitLiteral.test(trimmed)
              );
            };

            // Only eligible node types should create widgets
            const isWidgetEligible = (rn: any) =>
              rn && (rn.type === "mathResult" || rn.type === "combined" || rn.type === "error");

            // Derive positions by scanning paragraphs and matching expressions to render nodes
            if (renderNodes.length > 0) {
              // Build paragraph index: 1-based line numbers
              const paragraphIndex: Array<{ start: number; text: string }> = [
                /*1-based*/
              ];
              let line = 0;
              view.state.doc.forEach((node: ProseMirrorNode, offset: number) => {
                if (!node.isTextblock) return;
                line += 1;
                const start = offset + 1;
                const text = String(node.textContent || "");
                paragraphIndex[line] = { start, text };
              });
              const normalize = (s: string) => (s || "").replace(/\s+/g, "").trim();
              const eligibleNodes = (renderNodes as any[]).filter((rn) => isWidgetEligible(rn));
              for (let i = 1; i < paragraphIndex.length; i++) {
                const info = paragraphIndex[i];
                if (!info) continue;
                const arrowIdx = info.text.indexOf("=>");
                if (arrowIdx >= 0) {
                  const exprText = info.text.substring(0, arrowIdx).trim();
                  // Find best matching eligible render node by comparing left-of-arrow text
                  let matched: any | null = null;
                  for (const rn of eligibleNodes) {
                    const displayText = String((rn as any).displayText || "");
                    if (!displayText) continue;
                    if (displayText.includes("=>")) {
                      const leftOfArrow = displayText.split("=>")[0].trim();
                      if (normalize(leftOfArrow) === normalize(exprText)) {
                        matched = rn;
                        break;
                      }
                    } else if ((rn as any).originalRaw) {
                      const orig = String((rn as any).originalRaw)
                        .replace(/\s*=>\s*$/, "")
                        .trim();
                      if (normalize(orig) === normalize(exprText)) {
                        matched = rn;
                        break;
                      }
                    }
                  }
                  if (!matched) continue;
                  const displayText = String(matched.displayText || "");
                  let resultText: string = "";
                  if (displayText.includes("=>")) {
                    resultText = displayText.replace(/^.*=>\s*/, "");
                  } else if (displayText.includes("⚠️")) {
                    resultText = displayText.substring(displayText.indexOf("⚠️")).trim();
                  } else {
                    resultText = displayText;
                  }
                  const anchor = info.start + arrowIdx + 2; // after =>
                  const isError = matched.type === "error";

                  const widget = Decoration.widget(
                    anchor,
                    () => {
                      const wrapper = document.createElement("span");
                      wrapper.className = "semantic-wrapper";
                      wrapper.setAttribute("contenteditable", "false");
                      wrapper.appendChild(document.createTextNode(" "));
                      const container = document.createElement("span");
                      container.className = "semantic-result-container";
                      const span = document.createElement("span");
                      span.className = isError ? "semantic-error-result" : "semantic-result-display";
                      span.setAttribute("data-result", resultText);
                      span.setAttribute("title", resultText);
                      span.setAttribute("aria-label", resultText);
                      container.appendChild(span);
                      wrapper.appendChild(container);
                      // Ensure one visible space outside the result container after '=>'
                      // The wrapper itself begins with a text node " "; no trailing text content needed
                      return wrapper;
                    },
                    { side: 1 }
                  );
                  decorations.push(widget);
                  continue;
                }

                const assignment = parseVariableAssignment(info.text);
                if (!assignment.isValid || !assignment.rawValue) continue;

                const renderNode = renderMap.get(i);
                const isError = renderNode?.type === "error";
                if (!isError && !isLiteralAssignmentValue(assignment.rawValue)) continue;

                let resultText = assignment.rawValue.trim();
                if (renderNode) {
                  const rn: any = renderNode;
                  if (rn.type === "combined" && rn.result !== undefined) {
                    resultText = String(rn.result);
                  } else if (rn.type === "variable" && rn.value !== undefined) {
                    resultText = String(rn.value);
                  } else if (rn.type === "error" && rn.displayText) {
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
                    wrapper.setAttribute("contenteditable", "false");
                    wrapper.appendChild(document.createTextNode(" "));
                    const container = document.createElement("span");
                    container.className = "semantic-result-container";
                    const span = document.createElement("span");
                    span.className = isError
                      ? "semantic-error-result"
                      : "semantic-assignment-display";
                    span.setAttribute("data-result", resultText);
                    span.setAttribute("title", resultText);
                    span.setAttribute("aria-label", resultText);
                    container.appendChild(span);
                    wrapper.appendChild(container);
                    return wrapper;
                  },
                  { side: 1 }
                );
                decorations.push(widget);
              }
            }

            return DecorationSet.create(view.state.doc, decorations);
          };

          // Global event listener
          const listener = (e: Event) => {
            const custom = e as CustomEvent<{ renderNodes: RenderNode[]; sequence?: number }>;
            const renderNodes = custom.detail?.renderNodes ?? [];
            const decoSet = buildDecorations(renderNodes);
            // If no decorations were produced, keep the existing ones mapped to the current doc
            let finalSet: DecorationSet = decoSet;
            try {
              const count = (decoSet as any).find ? (decoSet as any).find().length : 0;
              if (count === 0) {
                const current = pluginKey.getState(view.state) as DecorationSet;
                finalSet = current ? current.map(view.state.tr.mapping, view.state.doc) : decoSet;
              }
            } catch {}

            // Dispatch transaction with meta to update decorations
            view.dispatch(view.state.tr.setMeta(pluginKey, finalSet));

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
