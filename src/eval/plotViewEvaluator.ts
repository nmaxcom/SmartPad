import {
  ASTNode,
  ExpressionNode,
  CombinedAssignmentNode,
  isExpressionNode,
  isCombinedAssignmentNode,
  isViewDirectiveNode,
} from "../parsing/ast";
import { NodeEvaluator, EvaluationContext } from "./registry";
import { PlotKind, PlotSize, PlotViewRenderNode } from "./renderNodes";
import { computePlotData } from "../plotting/plottingUtils";
import { defaultRegistry } from "./registry";

const SUPPORTED_KINDS: PlotKind[] = ["plot", "scatter", "hist", "box", "auto"];
const SUPPORTED_SIZES: PlotSize[] = ["sm", "md", "lg", "xl"];

const normalizeKind = (kind?: string): PlotKind => {
  if (kind && SUPPORTED_KINDS.includes(kind as PlotKind)) {
    return kind as PlotKind;
  }
  return "plot";
};

const normalizeSize = (size?: string): PlotSize | undefined => {
  if (size && SUPPORTED_SIZES.includes(size as PlotSize)) {
    return size as PlotSize;
  }
  return undefined;
};

const buildExpressionNode = (node: CombinedAssignmentNode): ExpressionNode => ({
  type: "expression",
  line: node.line,
  raw: node.raw,
  expression: node.expression,
  components: node.components,
  expectedType: node.expectedType,
});

const findFirstVariable = (components: ExpressionNode["components"]): string | null => {
  for (const component of components) {
    if (component.type === "variable") {
      return component.value;
    }
    if (component.children) {
      const found = findFirstVariable(component.children as any);
      if (found) return found;
    }
    if (component.args) {
      for (const arg of component.args) {
        const found = findFirstVariable(arg.components as any);
        if (found) return found;
      }
    }
  }
  return null;
};

export class PlotViewEvaluator implements NodeEvaluator {
  canHandle(node: ASTNode): boolean {
    return isViewDirectiveNode(node);
  }

  evaluate(node: ASTNode, context: EvaluationContext): PlotViewRenderNode | null {
    if (!isViewDirectiveNode(node)) return null;

    const astNodes = context.astNodes;
    if (!astNodes || node.line <= 1) {
      return {
        type: "plotView",
        line: node.line,
        originalRaw: node.raw,
        kind: normalizeKind(node.kind),
        size: normalizeSize(node.params.size),
        status: "disconnected",
        message: "No expression to attach to",
      };
    }

    const targetNode = astNodes[node.line - 2];
    if (!targetNode) {
      return {
        type: "plotView",
        line: node.line,
        originalRaw: node.raw,
        kind: normalizeKind(node.kind),
        size: normalizeSize(node.params.size),
        status: "disconnected",
        message: "Expression missing",
      };
    }

    let expressionNode: ExpressionNode | null = null;
    if (isExpressionNode(targetNode)) {
      expressionNode = targetNode;
    } else if (isCombinedAssignmentNode(targetNode)) {
      expressionNode = buildExpressionNode(targetNode);
    }

    if (!expressionNode) {
      return {
        type: "plotView",
        line: node.line,
        originalRaw: node.raw,
        kind: normalizeKind(node.kind),
        size: normalizeSize(node.params.size),
        status: "disconnected",
        message: "Expression unavailable",
      };
    }

    const kind = normalizeKind(node.kind);
    const size = normalizeSize(node.params.size);
    const xParam = node.params.x;
    const x = xParam || findFirstVariable(expressionNode.components) || undefined;
    const plotSettings = {
      decimalPlaces: context.decimalPlaces,
      scientificUpperThreshold: context.scientificUpperThreshold,
      scientificLowerThreshold: context.scientificLowerThreshold,
      scientificTrimTrailingZeros: context.scientificTrimTrailingZeros,
      groupThousands: context.groupThousands,
      dateDisplayFormat: context.dateDisplayFormat,
      dateLocale: context.dateLocale,
    };

    const isScrubbing =
      typeof document !== "undefined" && document.body?.classList.contains("number-scrubbing");
    const sampleCount = isScrubbing ? 24 : 60;

    const plotResult = computePlotData({
      expressionNode,
      xVariable: x || "",
      variableContext: context.variableContext,
      variableStore: context.variableStore,
      registry: defaultRegistry,
      settings: plotSettings,
      domainSpec: node.params.domain,
      viewSpec: node.params.view,
      sampleCount,
    });

    return {
      type: "plotView",
      line: node.line,
      originalRaw: node.raw,
      kind,
      x,
      size,
      expression: expressionNode.expression,
      targetLine: expressionNode.line,
      status: plotResult.status,
      message: plotResult.message,
      domain: plotResult.domain,
      view: plotResult.view,
      data: plotResult.data,
      currentX: plotResult.currentX,
      currentY: plotResult.currentY,
    };
  }
}
