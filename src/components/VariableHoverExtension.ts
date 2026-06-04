/**
 * @file This file defines the Tiptap extension for the hover-to-highlight feature.
 * When the user hovers over a variable, this extension finds all occurrences of that
 * variable in the document and applies a highlight decoration to them.
 */
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { Node as ProseMirrorNode } from "prosemirror-model";
import { Variable } from "../state/types";
import { parseLine } from "../parsing/astParser";
import {
  isVariableAssignmentNode,
  isCombinedAssignmentNode,
  isCommentNode,
  isFunctionDefinitionNode,
} from "../parsing/ast";
import { extractTokensFromASTNode } from "./SemanticHighlightExtension";

const variableHoverPluginKey = new PluginKey("variableHover");

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isVariableBoundary = (char: string | undefined) =>
  !char || /[\s+\-*/^%=<>()\[\]{},.:;!?]/.test(char);

const hasDecoration = (decorations: Decoration[], from: number, to: number) =>
  decorations.some((decoration) => decoration.from === from && decoration.to === to);

const rangesOverlap = (aFrom: number, aTo: number, bFrom: number, bTo: number) =>
  aFrom < bTo && bFrom < aTo;

/**
 * A Tiptap extension that adds hover-to-highlight functionality for variables.
 * It creates a ProseMirror plugin that listens to mouse events and manages
 * decorations for highlighting.
 */
export const VariableHoverExtension = Extension.create({
  name: "variableHover",

  addProseMirrorPlugins() {
    const getVariableContext =
      this.options.getVariableContext || (() => new Map<string, Variable>());

    return [
      new Plugin({
        key: variableHoverPluginKey,

        state: {
          init() {
            return {
              decorations: DecorationSet.empty,
              hoveredVariableName: null,
            };
          },
          apply(tr, oldState) {
            const meta = tr.getMeta(variableHoverPluginKey);
            if (meta) {
              return meta;
            }
            if (tr.docChanged && oldState) {
              return {
                  decorations: oldState.decorations.map(tr.mapping, tr.doc),
                  hoveredVariableName: oldState.hoveredVariableName,
              };
            }
            return oldState;
          },
        },

        props: {
          decorations(state) {
            const pluginState = this.getState(state);
            return pluginState ? pluginState.decorations : DecorationSet.empty;
          },

          handleDOMEvents: {
            /**
             * Handles the mouseover event on the editor.
             * If the hovered element is a variable, it finds all occurrences of that
             * variable and applies decorations to highlight them.
             */
            mouseover: (view, event) => {
              const rawTarget = event.target as Node | null;
              const eventTarget =
                rawTarget instanceof HTMLElement ? rawTarget : rawTarget?.parentElement;
              const target = eventTarget?.closest?.(".semantic-variable, .semantic-function") as
                | HTMLElement
                | null;
              if (!target) return;
              if (
                target.classList.contains("semantic-variable") ||
                target.classList.contains("semantic-function")
              ) {
                const pos = view.posAtDOM(target, 0);
                if (pos === null || pos === undefined) return;

                const symbolName = target.textContent;
                if (!symbolName) return;
                const symbolType = target.classList.contains("semantic-function")
                  ? "function"
                  : "variable";

                

                const decorations: Decoration[] = [];
                const variableContext = getVariableContext();

                view.state.doc.forEach((node: ProseMirrorNode, offset: number) => {
                  if (node.type.name === "paragraph") {
                    const text = node.textContent;
                    const astNode = parseLine(text, 0);
                    if (isCommentNode(astNode)) return;
                    

                    // Highlight declaration
                    if (symbolType === "variable" && (isVariableAssignmentNode(astNode) || isCombinedAssignmentNode(astNode))) {
                      if (astNode.variableName === symbolName) {
                        const from = offset + text.indexOf(symbolName) + 1;
                        const to = from + symbolName.length;
                        decorations.push(
                          Decoration.inline(from, to, {
                            class: "variable-highlight-declaration",
                          })
                        );
                      }
                    }

                    if (symbolType === "function" && isFunctionDefinitionNode(astNode)) {
                      if (astNode.functionName === symbolName) {
                        const from = offset + text.indexOf(symbolName) + 1;
                        const to = from + symbolName.length;
                        decorations.push(
                          Decoration.inline(from, to, {
                            class: "variable-highlight-declaration",
                          })
                        );
                      }
                    }

                    const tokens = extractTokensFromASTNode(astNode, variableContext);
                    const protectedRanges = tokens
                      .filter((token) => {
                        if (token.type !== "variable" && token.type !== "function") return false;
                        if (token.type !== symbolType) return true;
                        return token.text !== symbolName;
                      })
                      .map((token) => ({
                        from: offset + token.start + 1,
                        to: offset + token.end + 1,
                      }));
                    tokens.forEach(token => {
                      if (token.type === symbolType && token.text === symbolName) {
                        const from = offset + token.start + 1;
                        const to = offset + token.end + 1;

                        if (!hasDecoration(decorations, from, to)) {
                            decorations.push(
                                Decoration.inline(from, to, {
                                    class: "variable-highlight-reference",
                                })
                            );
                        }
                      }
                    });

                    const variableRegex = new RegExp(escapeRegExp(symbolName), "g");
                    let match: RegExpExecArray | null;
                    while ((match = variableRegex.exec(text))) {
                      const start = match.index;
                      const end = start + symbolName.length;
                      if (
                        !isVariableBoundary(text[start - 1]) ||
                        !isVariableBoundary(text[end])
                      ) {
                        continue;
                      }
                      const from = offset + start + 1;
                      const to = offset + end + 1;
                      if (protectedRanges.some((range) => rangesOverlap(from, to, range.from, range.to))) {
                        continue;
                      }
                      if (hasDecoration(decorations, from, to)) {
                        continue;
                      }
                      decorations.push(
                        Decoration.inline(from, to, {
                          class: "variable-highlight-reference",
                        })
                      );
                    }
                  }
                });

                

                const decorationSet = DecorationSet.create(view.state.doc, decorations);
                const newState = {
                  decorations: decorationSet,
                  hoveredVariableName: symbolName,
                };
                
                const tr = view.state.tr;
                tr.setMeta(variableHoverPluginKey, newState);
                view.dispatch(tr);
              }
            },
            /**
             * Handles the mouseout event on the editor.
             * If a variable is currently being highlighted, this clears the decorations.
             */
            mouseout: (view, event) => {
                const currentState = variableHoverPluginKey.getState(view.state);
                if (currentState && currentState.hoveredVariableName) {
                    const tr = view.state.tr;
                    tr.setMeta(variableHoverPluginKey, {
                        decorations: DecorationSet.empty,
                        hoveredVariableName: null,
                    });
                    view.dispatch(tr);
                }
            },
          },
        },
      }),
    ];
  },
});
