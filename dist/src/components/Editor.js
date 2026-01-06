"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useEditorContext = void 0;
exports.EditorProvider = EditorProvider;
const react_1 = __importStar(require("react"));
const react_2 = require("@tiptap/react");
const core_1 = require("@tiptap/core");
const starter_kit_1 = __importDefault(require("@tiptap/starter-kit"));
const extension_placeholder_1 = __importDefault(require("@tiptap/extension-placeholder"));
const model_1 = require("@tiptap/pm/model");
const state_1 = require("@tiptap/pm/state");
require("./Editor.css");
const useVariables_1 = require("../state/useVariables");
const VariableContext_1 = require("../state/VariableContext");
const SettingsContext_1 = require("../state/SettingsContext");
const variableStore_1 = require("../state/variableStore");
const SemanticHighlightExtension_1 = require("./SemanticHighlightExtension");
const NumberScrubberExtension_1 = require("./NumberScrubberExtension");
const ResultsDecoratorExtension_1 = require("./ResultsDecoratorExtension");
const VariableHoverExtension_1 = require("./VariableHoverExtension");
const pasteTransforms_1 = require("./pasteTransforms");
const ResultInlineNode_1 = require("./ResultInlineNode");
const ResultInteractionExtension_1 = require("./ResultInteractionExtension");
const editorText_1 = require("./editorText");
const DateValue_1 = require("../types/DateValue");
// Import helper to identify combined assignment nodes (e.g. "speed = slider(...)")
const astParser_1 = require("../parsing/astParser");
const equationStore_1 = require("../solve/equationStore");
const eval_1 = require("../eval");
const createEnterKeyExtension = () => core_1.Extension.create({
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
                    const tr = state.tr.setSelection(state_1.TextSelection.create(state.doc, nodeEndPos));
                    view.dispatch(tr);
                    return false;
                }
                // Otherwise, allow default "Enter" behavior
                return false;
            },
        };
    },
});
const EditorContext = (0, react_1.createContext)(null);
const useEditorContext = () => {
    const context = (0, react_1.useContext)(EditorContext);
    if (!context) {
        throw new Error("useEditorContext must be used within an EditorProvider");
    }
    return context;
};
exports.useEditorContext = useEditorContext;
// Create a separate EditorProvider component
function EditorProvider({ children }) {
    const { replaceAllVariables } = (0, useVariables_1.useVariables)();
    const { settings } = (0, SettingsContext_1.useSettingsContext)();
    const isUpdatingRef = (0, react_1.useRef)(false);
    // Use the reactive store from VariableContext
    const { reactiveStore } = (0, VariableContext_1.useVariableContext)();
    // Legacy handleUpdate function removed - now using AST pipeline exclusively
    // AST-BASED UPDATE PIPELINE (Main Implementation)
    const handleUpdateV2 = (0, react_1.useCallback)(({ editor }) => {
        if (isUpdatingRef.current)
            return;
        isUpdatingRef.current = true;
        console.time("handleUpdateV2-total");
        const perfStart = performance.now();
        console.log("[AST PIPELINE] Starting AST-based update pipeline...");
        try {
            // PROPER TipTap approach: Never modify user input text, only use decorations
            const content = (0, editorText_1.getSmartPadText)(editor);
            const lines = content.split("\n");
            // STAGE 1: Parse user input as-is (no cleaning, no text manipulation)
            console.time("handleUpdateV2-parsing");
            const astNodes = lines.map((line, index) => (0, astParser_1.parseLine)(line, index + 1));
            console.timeEnd("handleUpdateV2-parsing");
            console.log("[AST PIPELINE] Parsed", astNodes.length, "lines into AST nodes");
            // STAGE 2: Evaluation for state management only (not for text replacement)
            console.time("handleUpdateV2-evaluation");
            // Clear reactive store to ensure clean state
            reactiveStore.clearVariables();
            console.log("[AST PIPELINE] Processing nodes for state updates only...");
            // Process nodes one by one in document order for variable state
            const collectedRenderNodes = [];
            const functionStore = new Map();
            const equationStore = [];
            // Pre-compute paragraph text and absolute starts directly from ProseMirror
            const lineToPositions = new Map();
            const paragraphData = [ /* 1-based */];
            {
                let paragraphIndex = 0;
                editor.state.doc.forEach((node, offset) => {
                    if (!node.isTextblock)
                        return;
                    paragraphIndex += 1;
                    const nodeStart = offset + 1; // first text position inside this textblock
                    paragraphData[paragraphIndex] = { start: nodeStart, text: String(node.textContent || "") };
                });
            }
            for (let lineNum = 1; lineNum < paragraphData.length; lineNum++) {
                const data = paragraphData[lineNum];
                if (!data)
                    continue;
                const arrowIndex = data.text.indexOf("=>");
                if (arrowIndex < 0)
                    continue;
                const exprFrom = data.start;
                const exprTo = data.start + arrowIndex;
                const from = data.start + arrowIndex;
                const to = from + 2;
                lineToPositions.set(lineNum, { exprFrom, exprTo, from, to });
            }
            try {
                window.__paragraphData = paragraphData;
                window.__lineToPositions = Array.from(lineToPositions.entries());
                console.debug("[Editor] paragraphData", paragraphData);
                console.debug("[Editor] lineToPositions", Array.from(lineToPositions.entries()));
            }
            catch { }
            for (let index = 0; index < astNodes.length; index++) {
                const node = astNodes[index];
                // Create current variable context (updated for each line)
                const createCurrentVariableContext = () => {
                    const variableContext = new Map();
                    reactiveStore.getAllVariables().forEach((variable) => {
                        // Use semantic values directly - no more legacy conversion needed
                        variableContext.set(variable.name, variable);
                    });
                    return variableContext;
                };
                const evaluationContext = {
                    variableStore: reactiveStore,
                    variableContext: createCurrentVariableContext(),
                    functionStore,
                    equationStore,
                    lineNumber: index + 1,
                    decimalPlaces: settings.decimalPlaces,
                    scientificUpperThreshold: Math.pow(10, settings.scientificUpperExponent),
                    scientificLowerThreshold: Math.pow(10, settings.scientificLowerExponent),
                    scientificTrimTrailingZeros: settings.scientificTrimTrailingZeros,
                    dateDisplayFormat: settings.dateDisplayFormat,
                    dateLocale: (0, DateValue_1.getDateLocaleEffective)(),
                    functionCallDepth: 0,
                };
                // Evaluate the node ONLY for state updates (variables)
                // Results and errors will be shown via decorations, not text replacement
                const renderNode = eval_1.defaultRegistry.evaluate(node, evaluationContext);
                if (renderNode) {
                    collectedRenderNodes.push(renderNode);
                }
                (0, equationStore_1.recordEquationFromNode)(node, equationStore);
            }
            // After evaluation, attach positions by matching paragraph expressions to render nodes' expressions
            const normalize = (s) => s.replace(/\s+/g, "").trim();
            const usedIndices = new Set();
            for (let lineNum = 1; lineNum < paragraphData.length; lineNum++) {
                const data = paragraphData[lineNum];
                if (!data)
                    continue;
                const arrowIdx = data.text.indexOf("=>");
                if (arrowIdx < 0)
                    continue;
                const exprText = data.text.substring(0, arrowIdx).trim();
                // Find best matching render node that represents an inline computation
                let matchIndex = -1;
                for (let i = 0; i < collectedRenderNodes.length; i++) {
                    if (usedIndices.has(i))
                        continue;
                    const rn = collectedRenderNodes[i];
                    const displayText = rn.displayText;
                    if (!displayText || !displayText.includes("=>"))
                        continue;
                    const leftOfArrow = displayText.split("=>")[0].trim();
                    const orig = (rn.originalRaw || "").replace(/\s*=>\s*$/, "").trim();
                    if (normalize(leftOfArrow) === normalize(exprText) || (orig && normalize(orig) === normalize(exprText))) {
                        matchIndex = i;
                        break;
                    }
                }
                if (matchIndex >= 0) {
                    const rn = collectedRenderNodes[matchIndex];
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
            const updatedVariables = new Map();
            reactiveStore.getAllVariables().forEach((variable) => {
                updatedVariables.set(variable.name, variable);
            });
            replaceAllVariables(updatedVariables);
            console.timeEnd("handleUpdateV2-evaluation");
            // DISPATCH EVENT: Notify plugins that evaluation is complete with render nodes
            try {
                // Increment evaluation sequence counter for deterministic test waiting
                window.__evaluationSeq = (window.__evaluationSeq || 0) + 1;
                window.dispatchEvent(new CustomEvent("evaluationDone", {
                    detail: {
                        renderNodes: collectedRenderNodes,
                        sequence: window.__evaluationSeq
                    }
                }));
            }
            catch (e) {
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
            console.log(`💾 Memory: ${(performance.memory?.usedJSHeapSize / 1024 / 1024 || 0).toFixed(1)}MB`);
            console.log("");
            console.log("[AST PIPELINE] AST-based update pipeline completed");
        }
        catch (error) {
            console.error("[AST PIPELINE] Error in AST-based update pipeline:", error);
        }
        finally {
            isUpdatingRef.current = false;
        }
    }, [
        replaceAllVariables,
        reactiveStore,
        settings.decimalPlaces,
        settings.scientificUpperExponent,
        settings.scientificLowerExponent,
        settings.scientificTrimTrailingZeros,
    ]);
    // AST pipeline is now the default (no feature flag needed)
    const editor = (0, react_2.useEditor)({
        extensions: [
            starter_kit_1.default.configure({
                heading: false,
                italic: false,
            }),
            extension_placeholder_1.default.configure({
                placeholder: "Start typing...",
            }),
            createEnterKeyExtension(),
            // Semantic highlighting marks
            SemanticHighlightExtension_1.VariableMark,
            SemanticHighlightExtension_1.OperatorMark,
            SemanticHighlightExtension_1.NumberMark,
            SemanticHighlightExtension_1.ScrubbableNumberMark,
            SemanticHighlightExtension_1.FunctionMark,
            SemanticHighlightExtension_1.ResultMark,
            SemanticHighlightExtension_1.ErrorMark,
            SemanticHighlightExtension_1.TriggerMark,
            // Inline node for computed results (selectable, non-editable)
            ResultInlineNode_1.ResultInlineNode,
            // Keyboard/selection behavior for result tokens
            ResultInteractionExtension_1.ResultInteractionExtension,
            // Number scrubber for interactive dragging
            NumberScrubberExtension_1.NumberScrubberExtension,
            // Semantic highlighting extension with variable context
            SemanticHighlightExtension_1.SemanticHighlightExtension.configure({
                getVariableContext: () => {
                    // Use semantic values directly - no legacy conversion needed
                    const variables = reactiveStore.getAllVariables();
                    return new Map(variables.map((variable) => [variable.name, variable]));
                },
            }),
            // The ResultsDecoratorExtension is responsible for rendering the results of calculations.
            ResultsDecoratorExtension_1.ResultsDecoratorExtension,
            // The VariableHoverExtension provides hover-to-highlight functionality for variables.
            VariableHoverExtension_1.VariableHoverExtension.configure({
                getVariableContext: () => {
                    // Use semantic values directly - no legacy conversion needed
                    const variables = reactiveStore.getAllVariables();
                    return new Map(variables.map((variable) => [variable.name, variable]));
                },
            }),
        ],
        content: "<p></p>",
        editorProps: {
            transformPastedHTML: (html) => (0, pasteTransforms_1.normalizePastedHTML)(html),
            handlePaste: (view, event) => {
                const clipboard = event.clipboardData;
                if (!clipboard) {
                    return false;
                }
                const html = clipboard.getData("text/html") || "";
                const markdown = clipboard.getData("text/markdown") ||
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
                const paragraphs = lines.map((line) => schema.nodes.paragraph.create(null, line ? schema.text(line) : undefined));
                const slice = new model_1.Slice(model_1.Fragment.fromArray(paragraphs), 0, 0);
                view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView());
                return true;
            },
            clipboardTextSerializer: (slice) => slice.content.textBetween(0, slice.content.size, "\n", (node) => {
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
            }
            catch { }
        },
    });
    (0, react_1.useEffect)(() => {
        if (editor) {
            // Expose instances to window for testing purposes (development only)
            window.tiptapEditor = editor;
            window.reactiveStore = reactiveStore;
            window.ReactiveVariableStore = variableStore_1.ReactiveVariableStore;
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
    (0, react_1.useEffect)(() => {
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
    const setSmartPadContent = (0, react_1.useCallback)((content) => {
        if (!editor)
            return;
        const lines = content.split("\n");
        const doc = {
            type: "doc",
            content: lines.map((line) => line === ""
                ? { type: "paragraph" }
                : { type: "paragraph", content: [{ type: "text", text: line }] }),
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
    }, [editor, handleUpdateV2]);
    return (react_1.default.createElement(EditorContext.Provider, { value: { editor, setSmartPadContent } }, children));
}
function Editor() {
    const { editor } = (0, exports.useEditorContext)();
    return (react_1.default.createElement("div", { className: "editor-container", "data-testid": "smart-pad-editor" },
        react_1.default.createElement(react_2.EditorContent, { editor: editor, className: "editor-content" })));
}
exports.default = Editor;
