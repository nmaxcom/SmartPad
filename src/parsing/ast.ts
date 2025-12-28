/**
 * AST Node Definitions for SmartPad
 *
 * These immutable interfaces represent the parsed structure of each line in the SmartPad editor.
 * They serve as the intermediate representation between raw text and evaluated content.
 * 
 * Updated to support semantic types - values are parsed into SemanticValue instances
 * during parsing, eliminating the need for type guessing during evaluation.
 */

import { SemanticValue, SemanticValueType } from '../types';

export interface BaseASTNode {
  readonly type: string;
  readonly line: number;
  readonly raw: string;
  /**
   * Parsed semantic value for this node (if applicable)
   * This eliminates the need for type detection during evaluation
   */
  readonly parsedValue?: SemanticValue;
}

/**
 * Represents a plain text line with no special functionality
 */
export interface PlainTextNode extends BaseASTNode {
  readonly type: "plainText";
  readonly content: string;
}

/**
 * Represents a comment line starting with //
 */
export interface CommentNode extends BaseASTNode {
  readonly type: "comment";
  readonly content: string;
}

/**
 * Represents a variable assignment: `variableName = value`
 * Value is now parsed as a SemanticValue during parsing phase
 */
export interface VariableAssignmentNode extends BaseASTNode {
  readonly type: "variableAssignment";
  readonly variableName: string;
  /**
   * Raw value string for backwards compatibility and error reporting
   */
  readonly rawValue: string;
  /**
   * Parsed semantic value - replaces the old string | number value
   * Always present for variable assignments
   */
  readonly parsedValue: SemanticValue;
}

/**
 * Represents a semantic component in an expression tree
 */
export interface ExpressionComponent {
  readonly type: "literal" | "variable" | "operator" | "function" | "parentheses";
  readonly value: string;
  readonly parsedValue?: SemanticValue;
  readonly children?: ExpressionComponent[];
}

/**
 * Represents an expression that should be evaluated: `expression =>`
 * Now includes a semantic component tree for type-aware evaluation
 */
export interface ExpressionNode extends BaseASTNode {
  readonly type: "expression";
  readonly expression: string;
  /**
   * Parsed expression tree for type-aware evaluation
   * This eliminates the need for string parsing during evaluation
   */
  readonly components: ExpressionComponent[];
  /**
   * Expected type of the expression result (if known)
   * Used for early type validation
   */
  readonly expectedType?: SemanticValueType;
}

/**
 * Represents a combined variable assignment and evaluation: `variableName = expression =>`
 * Now includes semantic component trees for type-aware evaluation
 */
export interface CombinedAssignmentNode extends BaseASTNode {
  readonly type: "combinedAssignment";
  readonly variableName: string;
  readonly expression: string;
  /**
   * Parsed expression tree for type-aware evaluation
   * This eliminates the need for string parsing during evaluation
   */
  readonly components: ExpressionComponent[];
  /**
   * Expected type of the expression result (if known)
   * Used for early type validation
   */
  readonly expectedType?: SemanticValueType;
}

/**
 * Represents a line that contains a parsing error
 */
export interface ErrorNode extends BaseASTNode {
  readonly type: "error";
  readonly error: string;
  readonly errorType: "parse" | "syntax" | "semantic";
}

/**
 * Union type for all possible AST nodes
 */
export type ASTNode =
  | PlainTextNode
  | CommentNode
  | VariableAssignmentNode
  | ExpressionNode
  | CombinedAssignmentNode
  | ErrorNode;

/**
 * Type guard functions for AST nodes
 */
export function isPlainTextNode(node: ASTNode): node is PlainTextNode {
  return node.type === "plainText";
}

export function isCommentNode(node: ASTNode): node is CommentNode {
  return node.type === "comment";
}

export function isVariableAssignmentNode(node: ASTNode): node is VariableAssignmentNode {
  return node.type === "variableAssignment";
}

export function isExpressionNode(node: ASTNode): node is ExpressionNode {
  return node.type === "expression";
}

export function isCombinedAssignmentNode(node: ASTNode): node is CombinedAssignmentNode {
  return node.type === "combinedAssignment";
}

export function isErrorNode(node: ASTNode): node is ErrorNode {
  return node.type === "error";
}
