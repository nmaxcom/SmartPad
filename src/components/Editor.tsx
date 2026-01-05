import React, { useCallback, useRef, useEffect, useState, createContext, useContext } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Fragment, Slice } from "@tiptap/pm/model";
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
import { ResultInteractionExtension } from "./ResultInteractionExtension";
import { getSmartPadText } from "./editorText";
import { getDateLocaleEffective } from "../types/DateValue";
// Import helper to identify combined assignment nodes (e.g. "speed = slider(...)")
import { parseLine } from "../parsing/astParser";
import type { ASTNode } from "../parsing/ast";
import {
  defaultRegistry,
  RenderNode,
  isTextRenderNode,
  isErrorRenderNode,
  isMathResultRenderNode,
  isVariableRenderNode,
  isCombinedRenderNode,
} from "../eval";
import type { EvaluationContext } from "../eval";

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
  const isUpdatingRef = useRef(false);

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
        const content = getSmartPadText(editor);
        const lines = content.split("\n");

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
        // Pre-compute paragraph text and absolute starts directly from ProseMirror
        const lineToPositions = new Map<number, { exprFrom: number; exprTo: number; from: number; to: number }>();
        const paragraphData: Array<{ start: number; text: string }> = [/* 1-based */];
        {
          let paragraphIndex = 0;
          editor.state.doc.forEach((node: any, offset: number) => {
            if (!node.isTextblock) return;
            paragraphIndex += 1;
            const nodeStart = offset + 1; // first text position inside this textblock
            paragraphData[paragraphIndex] = { start: nodeStart, text: String(node.textContent || "") };
          });
        }
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
        try {
          (window as any).__paragraphData = paragraphData;
          (window as any).__lineToPositions = Array.from(lineToPositions.entries());
          console.debug("[Editor] paragraphData", paragraphData);
          console.debug("[Editor] lineToPositions", Array.from(lineToPositions.entries()));
        } catch {}
        for (let index = 0; index < astNodes.length; index++) {
          const node = astNodes[index] as any;

          // Create current variable context (updated for each line)
          const createCurrentVariableContext = (): Map<string, Variable> => {
            const variableContext = new Map<string, Variable>();
            reactiveStore.getAllVariables().forEach((variable: Variable) => {
              // Use semantic values directly - no more legacy conversion needed
              variableContext.set(variable.name, variable);
            });
            return variableContext;
          };

          const evaluationContext: EvaluationContext = {
            variableStore: reactiveStore,
            variableContext: createCurrentVariableContext(),
            functionStore,
            lineNumber: index + 1,
            decimalPlaces: settings.decimalPlaces,
            scientificUpperThreshold: Math.pow(10, settings.scientificUpperExponent),
            scientificLowerThreshold: Math.pow(10, settings.scientificLowerExponent),
            scientificTrimTrailingZeros: settings.scientificTrimTrailingZeros,
            dateDisplayFormat: settings.dateDisplayFormat,
            dateLocale: getDateLocaleEffective(),
            functionCallDepth: 0,
          };

          // Evaluate the node ONLY for state updates (variables)
          // Results and errors will be shown via decorations, not text replacement
          const renderNode = defaultRegistry.evaluate(node, evaluationContext);
          if (renderNode) {
            collectedRenderNodes.push(renderNode);
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
          
          window.dispatchEvent(
            new CustomEvent("evaluationDone", { 
              detail: { 
                renderNodes: collectedRenderNodes,
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
      // Keyboard/selection behavior for result tokens
      ResultInteractionExtension,
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

  return (
    <div className="editor-container" data-testid="smart-pad-editor">
      <EditorContent editor={editor} className="editor-content" />
    </div>
  );
}

export default Editor;
