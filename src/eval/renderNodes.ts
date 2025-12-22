/**
 * Render Node Definitions for SmartPad
 *
 * These interfaces represent the evaluated output of AST nodes after processing.
 * They define what should be rendered in the editor for each type of content.
 */

export interface BaseRenderNode {
  readonly type: string;
  readonly line: number;
  readonly originalRaw: string;
  // Optional positional anchors for deterministic decoration placement
  // from/to: absolute ProseMirror positions of the trigger (e.g., '=>')
  readonly from?: number;
  readonly to?: number;
  // exprFrom/exprTo: absolute positions of the expression before the trigger
  readonly exprFrom?: number;
  readonly exprTo?: number;
}

/**
 * Represents plain text content that should be rendered as-is
 */
export interface TextRenderNode extends BaseRenderNode {
  readonly type: "text";
  readonly content: string;
}

/**
 * Represents an error that should be displayed to the user
 */
export interface ErrorRenderNode extends BaseRenderNode {
  readonly type: "error";
  readonly error: string;
  readonly errorType: "parse" | "syntax" | "semantic" | "runtime";
  readonly displayText: string;
}

/**
 * Represents a mathematical expression result
 */
export interface MathResultRenderNode extends BaseRenderNode {
  readonly type: "mathResult";
  readonly expression: string;
  readonly result: string | number;
  readonly displayText: string;
}

/**
 * Represents a variable assignment result
 */
export interface VariableRenderNode extends BaseRenderNode {
  readonly type: "variable";
  readonly variableName: string;
  readonly value: string | number;
  readonly displayText: string;
}

/**
 * Represents a combined assignment and evaluation result
 */
export interface CombinedRenderNode extends BaseRenderNode {
  readonly type: "combined";
  readonly variableName: string;
  readonly expression: string;
  readonly result: string | number;
  readonly displayText: string;
}

/**
 * Future extension point for interactive widgets
 */
export interface SliderRenderNode extends BaseRenderNode {
  readonly type: "slider";
  readonly min: number;
  readonly max: number;
  readonly value: number;
  readonly variableName?: string;
  readonly displayText: string;
}

/**
 * Future extension point for charts and plots
 */
export interface ChartRenderNode extends BaseRenderNode {
  readonly type: "chart";
  readonly chartType: "line" | "bar" | "scatter";
  readonly data: any[];
  readonly displayText: string;
}

/**
 * Union type for all possible render nodes
 */
export type RenderNode =
  | TextRenderNode
  | ErrorRenderNode
  | MathResultRenderNode
  | VariableRenderNode
  | CombinedRenderNode
  | SliderRenderNode
  | ChartRenderNode;

/**
 * Type guard functions for render nodes
 */
export function isTextRenderNode(node: RenderNode): node is TextRenderNode {
  return node.type === "text";
}

export function isErrorRenderNode(node: RenderNode): node is ErrorRenderNode {
  return node.type === "error";
}

export function isMathResultRenderNode(node: RenderNode): node is MathResultRenderNode {
  return node.type === "mathResult";
}

export function isVariableRenderNode(node: RenderNode): node is VariableRenderNode {
  return node.type === "variable";
}

export function isCombinedRenderNode(node: RenderNode): node is CombinedRenderNode {
  return node.type === "combined";
}

export function isSliderRenderNode(node: RenderNode): node is SliderRenderNode {
  return node.type === "slider";
}

export function isChartRenderNode(node: RenderNode): node is ChartRenderNode {
  return node.type === "chart";
}
