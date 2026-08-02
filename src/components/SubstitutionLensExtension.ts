import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { Node as ProseMirrorNode } from "prosemirror-model";
import { buildSubstitutionLens } from "../analysis/substitutionLens";
import { RenderNode } from "../eval/renderNodes";
import {
  isCombinedAssignmentNode,
  isExpressionNode,
  isVariableAssignmentNode,
} from "../parsing/ast";
import { parseLine } from "../parsing/astParser";
import { Variable } from "../state/types";
import { SemanticValue } from "../types";

interface SubstitutionLensState {
  renderNodes: RenderNode[];
}

const pluginKey = new PluginKey<SubstitutionLensState>("substitutionLens");

const getParagraphText = (node: ProseMirrorNode): string => {
  let text = "";
  node.descendants((child) => {
    if (child.type.name === "resultToken") return false;
    if (child.type.name === "referenceToken") {
      text += String(child.attrs?.sourceValue || child.attrs?.label || "value");
      return false;
    }
    if (child.isText) text += child.text || "";
    return undefined;
  });
  return text;
};

const buildDecorations = (
  doc: ProseMirrorNode,
  selection: any,
  renderNodes: RenderNode[],
  variableContext: Map<string, Variable>,
  displayOptions: any
): DecorationSet => {
  if (!(selection instanceof TextSelection) || !selection.empty) {
    return DecorationSet.empty;
  }
  const cursorPos = selection.from;
  let line = 0;
  let target:
    | { line: number; offset: number; node: ProseMirrorNode; text: string }
    | undefined;
  doc.forEach((node, offset) => {
    if (!node.isTextblock) return;
    line += 1;
    if (cursorPos >= offset && cursorPos <= offset + node.nodeSize) {
      target = { line, offset, node, text: getParagraphText(node) };
    }
  });
  if (!target) return DecorationSet.empty;

  const astNode = parseLine(target.text, target.line);
  let expression = "";
  let variableName = "";
  if (isCombinedAssignmentNode(astNode)) {
    expression = astNode.expression;
    variableName = astNode.variableName;
  } else if (isExpressionNode(astNode)) {
    expression = astNode.expression;
  } else if (isVariableAssignmentNode(astNode)) {
    expression = astNode.rawValue;
    variableName = astNode.variableName;
  } else {
    return DecorationSet.empty;
  }

  const lineRenderNodes = renderNodes.filter(
    (node) =>
      node.line === target!.line &&
      (node.type === "mathResult" || node.type === "combined")
  ) as Array<RenderNode & { result?: string | number; semanticValue?: SemanticValue }>;
  const renderNode =
    lineRenderNodes.find((node) => !node.livePreview) || lineRenderNodes[0];
  const variableValue = variableName ? variableContext.get(variableName)?.value : undefined;
  const result = renderNode?.semanticValue || variableValue || renderNode?.result;
  if (!result) return DecorationSet.empty;
  const normalizedResult = typeof result === "number" ? String(result) : result;

  const lens = buildSubstitutionLens(
    expression,
    normalizedResult,
    variableContext,
    displayOptions
  );
  if (!lens) return DecorationSet.empty;

  return DecorationSet.create(doc, [
    Decoration.widget(
      target.offset + target.node.nodeSize - 1,
      () => {
        const wrapper = document.createElement("span");
        wrapper.className = "smartpad-substitution-lens";
        wrapper.setAttribute("contenteditable", "false");
        wrapper.setAttribute("data-substitution-line", String(target!.line));
        wrapper.setAttribute("aria-label", "Current values substituted into this formula");

        const expressionSpan = document.createElement("span");
        expressionSpan.className = "smartpad-substitution-expression";
        expressionSpan.textContent = lens.substitutedExpression;
        const equals = document.createElement("span");
        equals.className = "smartpad-substitution-equals";
        equals.textContent = "=";
        const resultSpan = document.createElement("span");
        resultSpan.className = "smartpad-substitution-result";
        resultSpan.textContent = lens.result;
        wrapper.append(expressionSpan, equals, resultSpan);
        return wrapper;
      },
      { side: 1, key: `substitution-${target.line}-${lens.substitutedExpression}-${lens.result}` }
    ),
  ]);
};

export const SubstitutionLensExtension = Extension.create({
  name: "substitutionLens",

  addProseMirrorPlugins() {
    const getVariableContext =
      this.options.getVariableContext || (() => new Map<string, Variable>());
    const getDisplayOptions = this.options.getDisplayOptions || (() => ({}));

    return [
      new Plugin<SubstitutionLensState>({
        key: pluginKey,
        state: {
          init: () => ({ renderNodes: [] }),
          apply(tr, previous) {
            return tr.getMeta(pluginKey) || previous;
          },
        },
        props: {
          decorations(state) {
            const pluginState = pluginKey.getState(state) || { renderNodes: [] };
            return buildDecorations(
              state.doc,
              state.selection,
              pluginState.renderNodes,
              getVariableContext(),
              getDisplayOptions()
            );
          },
        },
        view(view) {
          const onEvaluationDone = (event: Event) => {
            const detail = (event as CustomEvent).detail || {};
            const current = pluginKey.getState(view.state) || { renderNodes: [] };
            view.dispatch(
              view.state.tr.setMeta(pluginKey, {
                ...current,
                renderNodes: Array.isArray(detail.renderNodes) ? detail.renderNodes : [],
              })
            );
          };
          window.addEventListener("evaluationDone", onEvaluationDone);
          return {
            destroy() {
              window.removeEventListener("evaluationDone", onEvaluationDone);
            },
          };
        },
      }),
    ];
  },
});
