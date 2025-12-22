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
import { isVariableAssignmentNode, isCombinedAssignmentNode, isExpressionNode } from "../parsing/ast";
import { tokenizeExpression, Token } from "./SemanticHighlightExtension";

const variableHoverPluginKey = new PluginKey("variableHover");

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
              const target = event.target as HTMLElement;
              if (target.classList.contains("semantic-variable")) {
                const pos = view.posAtDOM(target, 0);
                if (pos === null || pos === undefined) return;

                const variableName = target.textContent;
                if (!variableName) return;

                

                const decorations: Decoration[] = [];
                const variableContext = getVariableContext();

                view.state.doc.forEach((node: ProseMirrorNode, offset: number) => {
                  if (node.type.name === "paragraph") {
                    const text = node.textContent;
                    const astNode = parseLine(text, 0);
                    

                    // Highlight declaration
                    if (isVariableAssignmentNode(astNode) || isCombinedAssignmentNode(astNode)) {
                      if (astNode.variableName === variableName) {
                        const from = offset + text.indexOf(variableName) + 1;
                        const to = from + variableName.length;
                        decorations.push(
                          Decoration.inline(from, to, {
                            class: "variable-highlight-declaration",
                          })
                        );
                      }
                    }

                    let expressionToTokenize = "";
                    let expressionOffset = 0;

                    if (isVariableAssignmentNode(astNode) && !astNode.parsedValue.isNumeric()) {
                        expressionToTokenize = text.substring(text.indexOf('=') + 1);
                        expressionOffset = text.indexOf(expressionToTokenize);
                    } else if (isExpressionNode(astNode)) {
                        expressionToTokenize = text.substring(0, text.indexOf('=>'));
                    } else if (isCombinedAssignmentNode(astNode)) {
                        expressionToTokenize = text.substring(text.indexOf('=') + 1, text.indexOf('=>'));
                        expressionOffset = text.indexOf(expressionToTokenize);
                    }

                    

                    if (expressionToTokenize) {
                        const tokens = tokenizeExpression(expressionToTokenize, expressionOffset, variableContext);
                        
                        tokens.forEach(token => {
                          if (token.type === 'variable' && token.text === variableName) {
                            const from = offset + token.start + 1;
                            const to = offset + token.end + 1;
                            
                            const isDeclaration = decorations.some(d => d.from === from && d.to === to);
                            if (!isDeclaration) {
                                decorations.push(
                                    Decoration.inline(from, to, {
                                        class: "variable-highlight-reference",
                                    })
                                );
                            }
                          }
                        });
                    }
                  }
                });

                

                const decorationSet = DecorationSet.create(view.state.doc, decorations);
                const newState = {
                  decorations: decorationSet,
                  hoveredVariableName: variableName,
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
