import React, { useCallback, useRef, useEffect, createContext, useContext } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Fragment, Slice, Node as ProseMirrorNode } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";
import "./Editor.css";
import { useVariables } from "../state/useVariables";
import { useVariableContext } from "../state/VariableContext";
import { useSettingsContext } from "../state/SettingsContext";
import { Variable } from "../state/types";
import { ReactiveVariableStore } from "../state/variableStore";
import {
  SemanticHighlightExtension,
  VariableMark,
  OperatorMark,
  NumberMark,
  ScrubbableNumberMark,
  FunctionMark,
  ResultMark,
  ErrorMark,
  TriggerMark,
} from "./SemanticHighlightExtension";
import { NumberScrubberExtension } from "./NumberScrubberExtension";
import { ResultsDecoratorExtension } from "./ResultsDecoratorExtension";
import { VariableHoverExtension } from "./VariableHoverExtension";
import { normalizePastedHTML } from "./pasteTransforms";
import { ResultInlineNode } from "./ResultInlineNode";
import { ReferenceInlineNode } from "./ReferenceInlineNode";
import { ResultInteractionExtension } from "./ResultInteractionExtension";
import { ResultReferenceInteractionExtension } from "./ResultReferenceInteractionExtension";
import { PlotViewExtension } from "./PlotViewExtension";
import { getDateLocaleEffective } from "../types/DateValue";
import { LineIdExtension } from "./LineIdExtension";
// Import helper to identify combined assignment nodes (e.g. "speed = slider(...)")
import { parseLine } from "../parsing/astParser";
import { recordEquationFromNode } from "../solve/equationStore";
import { isExpressionNode } from "../parsing/ast";
import { SemanticParsers, NumberValue, SymbolicValue, SemanticValueTypes } from "../types";
import { defaultRegistry } from "../eval";
import type { RenderNode } from "../eval";
import type { EvaluationContext } from "../eval";
import {
  getLiveResultMetrics,
  hasUnresolvedLiveIdentifiers,
  isLikelyLiveExpression,
  recordLiveResultEvaluation,
  recordLiveResultRendered,
  recordLiveResultSuppressed,
  shouldShowLiveForAssignmentValue,
} from "../eval/liveResultPreview";

const createEnterKeyExtension = () =>
  Extension.create({
    name: "enterKeyExtension",

    addKeyboardShortcuts() {
      return {
        Enter: () => {
          const { state, view } = this.editor;
          const { selection } = state;
          const { $from, from } = selection;

          // Get the current node and its text content
          const currentNode = $from.node();
          if (!currentNode.isTextblock) {
            return false; // Not in a text block, do default behavior
          }
          const lineText = currentNode.textContent;
          const arrowIndex = lineText.indexOf("=>");

          if (arrowIndex === -1) {
            return false; // No arrow on this line, do default behavior
          }

          // Find cursor position relative to the start of the node
          const nodeStartPos = $from.start();
          const nodeEndPos = $from.end();
          const cursorInNode = from - nodeStartPos;

          if (cursorInNode > arrowIndex + 1) {
            // Cursor is after the '=>' but not at the very end
            // Check if cursor is at the end of the line
            if (from >= nodeEndPos) {
              // Cursor is at the end of the line, allow new line creation
              return false;
            }
            // Move cursor to end so Enter creates a new line after the result
            const tr = state.tr.setSelection(TextSelection.create(state.doc, nodeEndPos));
            view.dispatch(tr);
            return false;
          }

          // Otherwise, allow default "Enter" behavior
          return false;
        },
      };
    },
  });

interface LineReferenceUsage {
  placeholderKey: string;
  sourceLineId: string;
  sourceLine: number;
  sourceLabel: string;
  sourceValue: string;
}

interface EditorLineData {
  line: number;
  lineId: string;
  text: string;
  positionText: string;
  start: number;
  references: LineReferenceUsage[];
}

interface LineResultState {
  value: any | null;
  display: string;
  hasError: boolean;
  errorMessage?: string;
}

const extractParagraphTextAndReferences = (node: ProseMirrorNode): {
  text: string;
  positionText: string;
  references: LineReferenceUsage[];
} => {
  let text = "";
  let positionText = "";
  const references: LineReferenceUsage[] = [];

  node.descendants((child) => {
    const nodeName = child.type?.name;
    if (nodeName === "resultToken") {
      return false;
    }
    if (nodeName === "referenceToken") {
      const placeholderKey = String(child.attrs?.placeholderKey || "").trim();
      const sourceLineId = String(child.attrs?.sourceLineId || "").trim();
      const sourceLine = Number(child.attrs?.sourceLine || 0);
      const sourceLabel = String(child.attrs?.label || "").trim();
      const sourceValue = String(child.attrs?.sourceValue || "").trim();
      if (placeholderKey) {
        text += placeholderKey;
        positionText += "§";
        references.push({
          placeholderKey,
          sourceLineId,
          sourceLine,
          sourceLabel,
          sourceValue,
        });
      }
      return false;
    }
    if (child.isText) {
      text += child.text || "";
      positionText += child.text || "";
    }
    return undefined;
  });

  return { text, positionText, references };
};

const extractEditorLineData = (doc: ProseMirrorNode): EditorLineData[] => {
  const lines: EditorLineData[] = [];
  let line = 0;
  doc.forEach((node: ProseMirrorNode, offset: number) => {
    if (!node.isTextblock) return;
    line += 1;
    const start = offset + 1;
    const lineId = String(node.attrs?.lineId || "");
    const extracted = extractParagraphTextAndReferences(node);
    lines.push({
      line,
      lineId,
      text: extracted.text,
      positionText: extracted.positionText,
      start,
      references: extracted.references,
    });
  });
  return lines;
};

const parseRenderNodeValue = (renderNode: any): any | null => {
  if (!renderNode) return null;
  const raw = renderNode.result;
  if (typeof raw === "number") {
    return NumberValue.from(raw);
  }
  if (typeof raw === "string") {
    const parsed = SemanticParsers.parse(raw.trim());
    return parsed || SymbolicValue.from(raw.trim());
  }
  return null;
};

// Create Editor Context
interface EditorContextType {
  editor: any;
  setSmartPadContent: (content: string) => void;
}

const EditorContext = createContext<EditorContextType | null>(null);

export const useEditorContext = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error("useEditorContext must be used within an EditorProvider");
  }
  return context;
};

// Create a separate EditorProvider component
export function EditorProvider({ children }: { children: React.ReactNode }) {
  const { replaceAllVariables } = useVariables();
  const { settings } = useSettingsContext();
  const settingsRef = useRef(settings);
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Use the reactive store from VariableContext
  const { reactiveStore } = useVariableContext();

  // Legacy handleUpdate function removed - now using AST pipeline exclusively

  // AST-BASED UPDATE PIPELINE (Main Implementation)
  const handleUpdateV2 = useCallback(
    ({ editor }: any) => {
      if (isUpdatingRef.current) return;
      isUpdatingRef.current = true;

      console.time("handleUpdateV2-total");
      const perfStart = performance.now();
      console.log("[AST PIPELINE] Starting AST-based update pipeline...");

      try {
        // PROPER TipTap approach: Never modify user input text, only use decorations
        const lineData = extractEditorLineData(editor.state.doc);
        const lines = lineData.map((entry) => entry.text);

        // STAGE 1: Parse user input as-is (no cleaning, no text manipulation)
        console.time("handleUpdateV2-parsing");
        const astNodes = lines.map((line: string, index: number) => parseLine(line, index + 1));
        console.timeEnd("handleUpdateV2-parsing");
        console.log("[AST PIPELINE] Parsed", astNodes.length, "lines into AST nodes");

        // STAGE 2: Evaluation for state management only (not for text replacement)
        console.time("handleUpdateV2-evaluation");

        // Clear reactive store to ensure clean state
        reactiveStore.clearVariables();

        console.log("[AST PIPELINE] Processing nodes for state updates only...");

        // Process nodes one by one in document order for variable state
        const collectedRenderNodes: RenderNode[] = [];
        const functionStore = new Map<string, import("../parsing/ast").FunctionDefinitionNode>();
        const equationStore: import("../solve/equationStore").EquationEntry[] = [];
        const lineResultById = new Map<string, LineResultState>();
        const lineResultByLine = new Map<number, LineResultState>();
        const lineResultStatusById = new Map<
          string,
          { hasError: boolean; errorMessage?: string; display: string }
        >();
        const brokenReferenceByLine = new Map<
          number,
          { hasBroken: boolean; message: string; sourceLineIds: string[] }
        >();
        // Pre-compute paragraph text and absolute starts directly from ProseMirror
        const lineToPositions = new Map<number, { exprFrom: number; exprTo: number; from: number; to: number }>();
        const paragraphData: Array<{ start: number; text: string; lineId: string }> = [
          /* 1-based */
        ];
        const setLineResultState = (
          lineNumber: number,
          targetLineId: string,
          state: LineResultState
        ) => {
          lineResultByLine.set(lineNumber, state);
          if (!targetLineId) {
            return;
          }
          lineResultById.set(targetLineId, state);
          lineResultStatusById.set(targetLineId, {
            hasError: state.hasError,
            errorMessage: state.errorMessage,
            display: state.display,
          });
        };
        lineData.forEach((entry) => {
          paragraphData[entry.line] = {
            start: entry.start,
            text: entry.positionText,
            lineId: entry.lineId,
          };
        });
        for (let lineNum = 1; lineNum < paragraphData.length; lineNum++) {
          const data = paragraphData[lineNum];
          if (!data) continue;
          const arrowIndex = data.text.indexOf("=>");
          if (arrowIndex < 0) continue;
          const exprFrom = data.start;
          const exprTo = data.start + arrowIndex;
          const from = data.start + arrowIndex;
          const to = from + 2;
          lineToPositions.set(lineNum, { exprFrom, exprTo, from, to });
        }
        for (let index = 0; index < astNodes.length; index++) {
          const node = astNodes[index] as any;
          const lineInfo = lineData[index];
          const lineId = lineInfo?.lineId || "";
          const lineReferences = lineInfo?.references || [];

          // Create current variable context (updated for each line)
          const createCurrentVariableContext = (): Map<string, Variable> => {
            const variableContext = new Map<string, Variable>();
            reactiveStore.getAllVariables().forEach((variable: Variable) => {
              // Use semantic values directly - no more legacy conversion needed
              variableContext.set(variable.name, variable);
            });

            const brokenSourceLineIds: string[] = [];
            for (const ref of lineReferences) {
              const sourceById = ref.sourceLineId ? lineResultById.get(ref.sourceLineId) : null;
              const sourceByLine = ref.sourceLine > 0 ? lineResultByLine.get(ref.sourceLine) : null;
              const source = sourceById || sourceByLine || null;
              if (!source || source.hasError || !source.value) {
                if (ref.sourceLineId) {
                  brokenSourceLineIds.push(ref.sourceLineId);
                } else if (ref.sourceLine > 0) {
                  const fallbackLineId = lineData[ref.sourceLine - 1]?.lineId;
                  if (fallbackLineId) {
                    brokenSourceLineIds.push(fallbackLineId);
                  }
                }

                if (!source && ref.sourceValue) {
                  const parsedFallback = SemanticParsers.parse(ref.sourceValue);
                  if (parsedFallback) {
                    variableContext.set(ref.placeholderKey, {
                      name: ref.placeholderKey,
                      value: parsedFallback,
                      rawValue: ref.sourceValue,
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    });
                  }
                }
                continue;
              }
              variableContext.set(ref.placeholderKey, {
                name: ref.placeholderKey,
                value: source.value,
                rawValue: source.display || source.value.toString(),
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            }

            if (brokenSourceLineIds.length > 0) {
              brokenReferenceByLine.set(index + 1, {
                hasBroken: true,
                message: "source line has error",
                sourceLineIds: Array.from(new Set(brokenSourceLineIds)),
              });
            }
            return variableContext;
          };

          const currentVariableContext = createCurrentVariableContext();
          const brokenRefState = brokenReferenceByLine.get(index + 1);
          const hasBrokenReferences = !!brokenRefState?.hasBroken;

          const evaluationContext: EvaluationContext = {
            variableStore: reactiveStore,
            variableContext: currentVariableContext,
            functionStore,
            equationStore,
            astNodes,
            lineNumber: index + 1,
            decimalPlaces: settings.decimalPlaces,
            scientificUpperThreshold: Math.pow(10, settings.scientificUpperExponent),
            scientificLowerThreshold: Math.pow(10, settings.scientificLowerExponent),
            scientificTrimTrailingZeros: settings.scientificTrimTrailingZeros,
            groupThousands: settings.groupThousands,
            dateDisplayFormat: settings.dateDisplayFormat,
            dateLocale: getDateLocaleEffective(),
            functionCallDepth: 0,
            plotSampleCount: settings.plotSampleCount,
            plotScrubSampleCount: settings.plotScrubSampleCount,
            plotMinSamples: settings.plotMinSamples,
            plotMaxSamples: settings.plotMaxSamples,
            plotDomainExpansion: settings.plotDomainExpansion,
            plotYViewPadding: settings.plotYViewPadding,
            plotYDomainPadding: settings.plotYDomainPadding,
            plotPanYDomainPadding: settings.plotPanYDomainPadding,
          };

          const isImplicitExpressionLine =
            node.type === "expression" && !String(node.raw || "").includes("=>");

          // Evaluate the node ONLY for state updates (variables)
          // Results and errors will be shown via decorations, not text replacement
          const evalStart = performance.now();
          const renderNode = defaultRegistry.evaluate(node, evaluationContext);
          const evalDurationMs = performance.now() - evalStart;

          if (hasBrokenReferences) {
            const warningNode: RenderNode = {
              type: "error",
              line: index + 1,
              originalRaw: lines[index] ?? node.raw ?? "",
              error: brokenRefState?.message || "source line has error",
              errorType: "runtime",
              displayText: `⚠ ${brokenRefState?.message || "source line has error"}`,
              livePreview: !String(node.raw || "").includes("=>"),
            };
            collectedRenderNodes.push(warningNode);
            lineResultByLine.set(index + 1, {
              value: null,
              display: warningNode.displayText,
              hasError: true,
              errorMessage: warningNode.error,
            });
            if (lineId) {
              lineResultById.set(lineId, {
                value: null,
                display: warningNode.displayText,
                hasError: true,
                errorMessage: warningNode.error,
              });
              lineResultStatusById.set(lineId, {
                hasError: true,
                errorMessage: warningNode.error,
                display: warningNode.displayText,
              });
            }
            recordEquationFromNode(node, equationStore);
            continue;
          }

          if (isImplicitExpressionLine) {
            if (!settings.liveResultEnabled) {
              // Keep existing no-=> expression lines visually quiet when Live Result is off.
              recordEquationFromNode(node, equationStore);
              continue;
            }

            const trimmedRawExpression = String(node.raw || "").trim();
            if (/[=<>!]\s*$/.test(trimmedRawExpression)) {
              recordLiveResultSuppressed("incomplete");
              setLineResultState(index + 1, lineId, {
                value: null,
                display: "",
                hasError: true,
                errorMessage: "evaluation incomplete",
              });
              recordEquationFromNode(node, equationStore);
              continue;
            }

            if (hasUnresolvedLiveIdentifiers(node.components, currentVariableContext)) {
              recordLiveResultSuppressed("unresolved");
              recordEquationFromNode(node, equationStore);
              continue;
            }

            recordLiveResultEvaluation(evalDurationMs);
            if (
              renderNode &&
              (renderNode.type === "mathResult" || renderNode.type === "combined")
            ) {
              collectedRenderNodes.push({
                ...renderNode,
                line: index + 1,
                originalRaw: lines[index] ?? node.raw ?? "",
                livePreview: true,
              } as RenderNode);
              recordLiveResultRendered();
            } else {
              recordLiveResultSuppressed("error");
            }

            recordEquationFromNode(node, equationStore);
            if (
              renderNode &&
              (renderNode.type === "mathResult" || renderNode.type === "combined")
            ) {
              const semanticValue = parseRenderNodeValue(renderNode);
              lineResultByLine.set(index + 1, {
                value: semanticValue,
                display: String((renderNode as any).result ?? ""),
                hasError: false,
              });
              if (lineId) {
                lineResultById.set(lineId, {
                  value: semanticValue,
                  display: String((renderNode as any).result ?? ""),
                  hasError: false,
                });
                lineResultStatusById.set(lineId, {
                  hasError: false,
                  display: String((renderNode as any).result ?? ""),
                });
              }
            } else {
              lineResultByLine.set(index + 1, {
                value: null,
                display: "",
                hasError: true,
                errorMessage: "evaluation failed",
              });
              if (lineId) {
                lineResultById.set(lineId, {
                  value: null,
                  display: "",
                  hasError: true,
                  errorMessage: "evaluation failed",
                });
                lineResultStatusById.set(lineId, {
                  hasError: true,
                  errorMessage: "evaluation failed",
                  display: "",
                });
              }
            }
            continue;
          }

          if (renderNode) {
            collectedRenderNodes.push(renderNode);
          }

          if (node.type === "plainText") {
            const rawLine = lines[index] ?? node.raw ?? "";
            const trimmedRawLine = rawLine.trim();
            const isReferenceOnlyLine =
              lineReferences.length > 0 &&
              rawLine.replace(/__sp_ref_[a-z0-9]+__/gi, "").trim().length === 0;
            if (isReferenceOnlyLine) {
              if (settings.liveResultEnabled) {
                recordLiveResultSuppressed("plaintext");
              }
              continue;
            }
            const looksLikeLiveExpression = isLikelyLiveExpression(
              rawLine,
              currentVariableContext,
              functionStore
            );
            if (!looksLikeLiveExpression) {
              if (settings.liveResultEnabled) {
                recordLiveResultSuppressed("plaintext");
              }
            } else {
              if (/[=<>!]\s*$/.test(trimmedRawLine)) {
                if (settings.liveResultEnabled) {
                  recordLiveResultSuppressed("incomplete");
                }
                setLineResultState(index + 1, lineId, {
                  value: null,
                  display: "",
                  hasError: true,
                  errorMessage: "evaluation incomplete",
                });
                continue;
              }
              const candidateNode = parseLine(`${rawLine} =>`, index + 1);
              if (!isExpressionNode(candidateNode)) {
                if (settings.liveResultEnabled) {
                  recordLiveResultSuppressed("incomplete");
                }
                setLineResultState(index + 1, lineId, {
                  value: null,
                  display: "",
                  hasError: true,
                  errorMessage: "evaluation failed",
                });
              } else if (
                hasUnresolvedLiveIdentifiers(candidateNode.components, currentVariableContext)
              ) {
                if (settings.liveResultEnabled) {
                  recordLiveResultSuppressed("unresolved");
                }
                setLineResultState(index + 1, lineId, {
                  value: null,
                  display: "",
                  hasError: true,
                  errorMessage: "evaluation failed",
                });
              } else {
                const liveStart = performance.now();
                const liveRenderNode = defaultRegistry.evaluate(
                  candidateNode,
                  evaluationContext
                );
                if (settings.liveResultEnabled) {
                  recordLiveResultEvaluation(performance.now() - liveStart);
                }
                if (
                  liveRenderNode &&
                  (liveRenderNode.type === "mathResult" ||
                    liveRenderNode.type === "combined")
                ) {
                  if (settings.liveResultEnabled) {
                    collectedRenderNodes.push({
                      ...liveRenderNode,
                      line: index + 1,
                      originalRaw: rawLine,
                      livePreview: true,
                    } as RenderNode);
                    recordLiveResultRendered();
                  }
                  setLineResultState(index + 1, lineId, {
                    value: parseRenderNodeValue(liveRenderNode),
                    display: String((liveRenderNode as any).result ?? ""),
                    hasError: false,
                  });
                } else {
                  if (settings.liveResultEnabled) {
                    recordLiveResultSuppressed("error");
                  }
                  setLineResultState(index + 1, lineId, {
                    value: null,
                    display: "",
                    hasError: true,
                    errorMessage: "evaluation failed",
                  });
                }
              }
            }
          }

          if (node.type === "variableAssignment" && settings.liveResultEnabled) {
            const rawValue = String((node as any).rawValue || "").trim();
            const variableName = String((node as any).variableName || "");
            if (
              rawValue &&
              shouldShowLiveForAssignmentValue(rawValue, currentVariableContext, functionStore)
            ) {
              const variable = variableName ? reactiveStore.getVariable(variableName) : null;
              const variableValue = variable?.value || null;
              const variableDisplay = String(variable?.rawValue || "").trim();
              if (variableValue && !SemanticValueTypes.isError(variableValue as any) && variableDisplay) {
                collectedRenderNodes.push({
                  type: "mathResult",
                  line: index + 1,
                  expression: rawValue,
                  result: variableDisplay,
                  displayText: `${rawValue} => ${variableDisplay}`,
                  originalRaw: lines[index] ?? node.raw ?? "",
                  livePreview: true,
                } as RenderNode);
                recordLiveResultRendered();
              } else {
                recordLiveResultSuppressed("error");
              }
            } else {
              recordLiveResultSuppressed("plaintext");
            }
          }

          recordEquationFromNode(node, equationStore);

          if (renderNode && renderNode.type === "error") {
            const display = String((renderNode as any).displayText || (renderNode as any).error || "");
            lineResultByLine.set(index + 1, {
              value: null,
              display,
              hasError: true,
              errorMessage: String((renderNode as any).error || "error"),
            });
            if (lineId) {
              lineResultById.set(lineId, {
                value: null,
                display,
                hasError: true,
                errorMessage: String((renderNode as any).error || "error"),
              });
              lineResultStatusById.set(lineId, {
                hasError: true,
                errorMessage: String((renderNode as any).error || "error"),
                display,
              });
            }
          } else if (
            renderNode &&
            (renderNode.type === "mathResult" || renderNode.type === "combined")
          ) {
            const semanticValue = parseRenderNodeValue(renderNode);
            const display = String((renderNode as any).result ?? "");
            lineResultByLine.set(index + 1, {
              value: semanticValue,
              display,
              hasError: false,
            });
            if (lineId) {
              lineResultById.set(lineId, {
                value: semanticValue,
                display,
                hasError: false,
              });
              lineResultStatusById.set(lineId, {
                hasError: false,
                display,
              });
            }
          } else if ((node as any).type === "variableAssignment") {
            const variableName = String((node as any).variableName || "");
            const variable = variableName ? reactiveStore.getVariable(variableName) : null;
            const value = variable?.value || null;
            const display = variable?.rawValue || "";
            const hasError = !!(value && SemanticValueTypes.isError(value as any));
            lineResultByLine.set(index + 1, {
              value,
              display,
              hasError,
              errorMessage: hasError ? String((value as any).toString?.() || "error") : undefined,
            });
            if (lineId) {
              lineResultById.set(lineId, {
                value,
                display,
                hasError,
                errorMessage: hasError ? String((value as any).toString?.() || "error") : undefined,
              });
              lineResultStatusById.set(lineId, {
                hasError,
                errorMessage: hasError ? String((value as any).toString?.() || "error") : undefined,
                display,
              });
            }
          }
        }

        // After evaluation, attach positions by matching paragraph expressions to render nodes' expressions
        const normalize = (s: string) => s.replace(/\s+/g, "").trim();
        const usedIndices = new Set<number>();
        for (let lineNum = 1; lineNum < paragraphData.length; lineNum++) {
          const data = paragraphData[lineNum];
          if (!data) continue;
          const arrowIdx = data.text.indexOf("=>");
          if (arrowIdx < 0) continue;
          const exprText = data.text.substring(0, arrowIdx).trim();
          // Find best matching render node that represents an inline computation
          let matchIndex = -1;
          for (let i = 0; i < collectedRenderNodes.length; i++) {
            if (usedIndices.has(i)) continue;
            const rn: any = collectedRenderNodes[i];
            const displayText: string | undefined = rn.displayText;
            if (!displayText || !displayText.includes("=>")) continue;
            const leftOfArrow = displayText.split("=>")[0].trim();
            const orig = (rn.originalRaw || "").replace(/\s*=>\s*$/, "").trim();
            if (normalize(leftOfArrow) === normalize(exprText) || (orig && normalize(orig) === normalize(exprText))) {
              matchIndex = i;
              break;
            }
          }
          if (matchIndex >= 0) {
            const rn: any = collectedRenderNodes[matchIndex];
            const exprFrom = data.start;
            const exprTo = data.start + arrowIdx;
            const from = data.start + arrowIdx;
            const to = from + 2;
            rn.from = from;
            rn.to = to;
            rn.exprFrom = exprFrom;
            rn.exprTo = exprTo;
            usedIndices.add(matchIndex);
          }
        }

        // Sync variables into React context so the panel updates
        const updatedVariables = new Map<string, Variable>();
        reactiveStore.getAllVariables().forEach((variable: Variable) => {
          updatedVariables.set(variable.name, variable);
        });
        replaceAllVariables(updatedVariables);

        console.timeEnd("handleUpdateV2-evaluation");

        // DISPATCH EVENT: Notify plugins that evaluation is complete with render nodes
        try {
          // Increment evaluation sequence counter for deterministic test waiting
          (window as any).__evaluationSeq = ((window as any).__evaluationSeq || 0) + 1;
          (window as any).__liveResultMetrics = getLiveResultMetrics();
          (window as any).__lineResultStatusById = Array.from(lineResultStatusById.entries());
          
          window.dispatchEvent(
            new CustomEvent("evaluationDone", { 
              detail: { 
                renderNodes: collectedRenderNodes,
                lineResultStatusById: Array.from(lineResultStatusById.entries()),
                sequence: (window as any).__evaluationSeq 
              } 
            })
          );
        } catch (e) {
          console.warn("Failed to dispatch evaluationDone event", e);
        }

        // STAGE 3: NO CONTENT MODIFICATION - decorations handle all visual feedback
        // The SemanticHighlightExtension will automatically show:
        // - Variable highlighting
        // - Error decorations
        // - Result decorations

        console.timeEnd("handleUpdateV2-total");

        // Performance metrics
        const perfEnd = performance.now();
        const totalTime = perfEnd - perfStart;
        const variableCount = reactiveStore.getAllVariables().length;
        const linesPerMs = lines.length / totalTime;

        console.log("");
        console.log("🚀 AST PIPELINE METRICS:");
        console.log(`⏱️  Total Time: ${totalTime.toFixed(2)}ms`);
        console.log(`📄 Lines Processed: ${lines.length}`);
        console.log(`🔢 Variables Created: ${variableCount}`, reactiveStore.getAllVariables());
        console.log(`🏃 Speed: ${linesPerMs.toFixed(1)} lines/ms`);
        console.log(
          `💾 Memory: ${((performance as any).memory?.usedJSHeapSize / 1024 / 1024 || 0).toFixed(1)}MB`
        );
        console.log("");

        console.log("[AST PIPELINE] AST-based update pipeline completed");
      } catch (error) {
        console.error("[AST PIPELINE] Error in AST-based update pipeline:", error);
      } finally {
        isUpdatingRef.current = false;
      }
    },
    [
      replaceAllVariables,
      reactiveStore,
      settings.decimalPlaces,
      settings.scientificUpperExponent,
      settings.scientificLowerExponent,
      settings.scientificTrimTrailingZeros,
      settings.groupThousands,
      settings.liveResultEnabled,
    ]
  );

  // AST pipeline is now the default (no feature flag needed)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        italic: false,
      }),
      Placeholder.configure({
        placeholder: "Start typing...",
      }),
      LineIdExtension,
      createEnterKeyExtension(),

      // Semantic highlighting marks
      VariableMark,
      OperatorMark,
      NumberMark,
      ScrubbableNumberMark,
      FunctionMark,
      ResultMark,
      ErrorMark,
      TriggerMark,
      // Inline node for computed results (selectable, non-editable)
      ResultInlineNode,
      ReferenceInlineNode,
      // Keyboard/selection behavior for result tokens
      ResultInteractionExtension,
      // Interactions that turn result chips into reusable reference chips
      ResultReferenceInteractionExtension.configure({
        getSettings: () => settingsRef.current,
      }),
      // Number scrubber for interactive dragging
      NumberScrubberExtension,
      // Semantic highlighting extension with variable context
      SemanticHighlightExtension.configure({
        getVariableContext: () => {
          // Use semantic values directly - no legacy conversion needed
          const variables = reactiveStore.getAllVariables();
          return new Map(variables.map((variable) => [variable.name, variable]));
        },
      }),
      // The ResultsDecoratorExtension is responsible for rendering the results of calculations.
      ResultsDecoratorExtension,
      // Plot view extension for dependency exploration and @view rendering.
      PlotViewExtension.configure({
        getVariableContext: () => {
          const variables = reactiveStore.getAllVariables();
          return new Map(variables.map((variable) => [variable.name, variable]));
        },
        getSettings: () => settings,
      }),
      // The VariableHoverExtension provides hover-to-highlight functionality for variables.
      VariableHoverExtension.configure({
        getVariableContext: () => {
          // Use semantic values directly - no legacy conversion needed
          const variables = reactiveStore.getAllVariables();
          return new Map(variables.map((variable) => [variable.name, variable]));
        },
      }),
    ],
    content: "<p></p>",
    editorProps: {
      transformPastedHTML: (html) => normalizePastedHTML(html),
      handlePaste: (view, event) => {
        const clipboard = event.clipboardData;
        if (!clipboard) {
          return false;
        }

        const html = clipboard.getData("text/html") || "";
        const markdown =
          clipboard.getData("text/markdown") ||
          clipboard.getData("text/x-vscode-markdown") ||
          "";
        const text = clipboard.getData("text/plain") || "";
        const types = Array.from(clipboard.types || []);
        const hasCodeHtml = /<(pre|code)\b/i.test(html);
        const hasVscodeType = types.some((type) => type.includes("vscode"));

        if (!hasCodeHtml && !markdown && !hasVscodeType) {
          return false;
        }

        const payload = markdown || text || "";
        if (!payload) {
          return false;
        }

        const lines = payload.replace(/\r\n?/g, "\n").split("\n");
        const { schema } = view.state;
        const paragraphs = lines.map((line) =>
          schema.nodes.paragraph.create(
            null,
            line ? schema.text(line) : undefined
          )
        );
        const slice = new Slice(Fragment.fromArray(paragraphs), 0, 0);
        view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView());
        return true;
      },
      clipboardTextSerializer: (slice: Slice) =>
        slice.content.textBetween(0, slice.content.size, "\n", (node) => {
          if (node.type?.name === "resultToken") {
            return node.textContent || node.attrs?.value || "";
          }
          if (node.type?.name === "referenceToken") {
            if (settingsRef.current.referenceTextExportMode === "preserve") {
              return node.attrs?.placeholderKey || node.attrs?.sourceValue || "value";
            }
            return node.attrs?.sourceValue || node.attrs?.label || "value";
          }
          return "";
        }),
    },
    onUpdate: ({ editor }) => {
      handleUpdateV2({ editor }); // Always use AST pipeline
      // Mark the end of a user-initiated update for tests that rely on it
      try {
        window.dispatchEvent(new Event('forceEvaluation'));
      } catch {}
    },
  });

  useEffect(() => {
    if (editor) {
      // Expose instances to window for testing purposes (development only)
      (window as any).tiptapEditor = editor;
      (window as any).reactiveStore = reactiveStore;
      (window as any).ReactiveVariableStore = ReactiveVariableStore;
      
      // Add event listener for test-triggered evaluation
      const handleForceEvaluation = () => {
        if (editor && !isUpdatingRef.current) {
          handleUpdateV2({ editor });
        }
      };
      
      window.addEventListener('forceEvaluation', handleForceEvaluation);
      
      return () => {
        window.removeEventListener('forceEvaluation', handleForceEvaluation);
      };
    }
  }, [editor, reactiveStore, handleUpdateV2]);

  // Trigger re-evaluation when decimal places setting changes
  useEffect(() => {
    if (editor && !isUpdatingRef.current) {
      // Small delay to ensure settings have been updated
      setTimeout(() => {
        handleUpdateV2({ editor });
      }, 100);
    }
  }, [
    settings.decimalPlaces,
    settings.scientificUpperExponent,
    settings.scientificLowerExponent,
    settings.scientificTrimTrailingZeros,
    settings.liveResultEnabled,
    settings.dateLocaleMode,
    settings.dateLocaleOverride,
    settings.dateDisplayFormat,
    editor,
    handleUpdateV2,
  ]);

  // Legacy forceExpressionUpdate function removed - AST pipeline handles this automatically

  // Custom method to properly set multi-line content while preserving empty lines
  const setSmartPadContent = useCallback(
    (content: string) => {
      if (!editor) return;

      const lines = content.split("\n");
      const doc = {
        type: "doc",
        content: lines.map((line) =>
          line === ""
            ? { type: "paragraph" }
            : { type: "paragraph", content: [{ type: "text", text: line }] }
        ),
      };
      editor.commands.setContent(doc, false);

      // Focus and position cursor at the end
      editor.commands.focus();
      editor.commands.setTextSelection(editor.state.doc.content.size);

      // Force the AST pipeline to run by directly calling handleUpdateV2
      setTimeout(() => {
        if (editor) {
          handleUpdateV2({ editor });
        }
      }, 100);
    },
    [editor, handleUpdateV2]
  );

  return (
    <EditorContext.Provider value={{ editor, setSmartPadContent }}>
      {children}
    </EditorContext.Provider>
  );
}

function Editor() {
  const { editor } = useEditorContext();
  const { settings } = useSettingsContext();
  const laneClass = settings.resultLaneEnabled ? "result-lane-enabled" : "result-lane-disabled";

  return (
    <div className={`editor-container ${laneClass}`} data-testid="smart-pad-editor">
      <EditorContent editor={editor} className="editor-content" />
    </div>
  );
}

export default Editor;
