/**
 * @file This file defines the Tiptap extension responsible for semantic highlighting.
 * It works by parsing each line of the document into an AST (Abstract Syntax Tree)
 * and then applying syntax highlighting based on the tokens extracted from the AST.
 * This approach ensures that highlighting is accurate and context-aware.
 */
import { Extension, Mark } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { Node as ProseMirrorNode } from "prosemirror-model";
import { Variable } from "../state/types";
import { UnitValue } from "../types";
import { parseLine } from "../parsing/astParser";
import { isLikelyLiveExpression } from "../eval/liveResultPreview";
import type { ASTNode } from "../parsing/ast";
import {
  isPlainTextNode,
  isCommentNode,
  isVariableAssignmentNode,
  isExpressionNode,
  isCombinedAssignmentNode,
  isErrorNode,
  isFunctionDefinitionNode,
} from "../parsing/ast";

const LIVE_HIGHLIGHT_KEYWORD_REGEX = /\b(to|in|of|on|off|as|is|per)\b/i;
const PURE_NUMBER_REGEX = /^[-+]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

const shouldHighlightPlainTextAsExpression = (
  text: string,
  variableContext: Map<string, Variable>
): boolean => {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("#") || trimmed.startsWith("//") || trimmed.startsWith("@")) {
    return false;
  }
  if (trimmed.includes("=>") || trimmed.includes("=")) {
    return false;
  }

  const hasStrongSignal =
    /[+\-*/^%()]/.test(trimmed) ||
    LIVE_HIGHLIGHT_KEYWORD_REGEX.test(trimmed) ||
    /[$€£¥₹₿]/.test(trimmed) ||
    /\b[a-zA-Z_][a-zA-Z0-9_]*\s*\(/.test(trimmed) ||
    PURE_NUMBER_REGEX.test(trimmed);

  const normalizedTrimmed = trimmed.replace(/\s+/g, " ");
  const isKnownVariableQuery =
    variableContext.has(trimmed) || variableContext.has(normalizedTrimmed);
  const isSingleIdentifierQuery = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed);

  if (isKnownVariableQuery || isSingleIdentifierQuery) {
    return true;
  }

  if (!hasStrongSignal) {
    return false;
  }

  return isLikelyLiveExpression(trimmed, variableContext, new Map());
};

const getTokenizableLineText = (node: ProseMirrorNode): string => {
  let text = "";
  node.descendants((child) => {
    if (child.type?.name === "resultToken") {
      return false;
    }
    if (child.type?.name === "referenceToken") {
      // Reference atoms occupy a single position in ProseMirror; mirror that
      // in token text to keep highlight offsets aligned with rendered content.
      text += "§";
      return false;
    }
    if (child.isText) {
      text += child.text || "";
    }
    return undefined;
  });
  return text;
};

// Token types that can be identified in mathematical expressions
export type TokenType =
  | "variable"
  | "operator"
  | "number"
  | "scrubbableNumber"
  | "function"
  | "result"
  | "error"
  | "trigger"
  | "constant"
  | "keyword"
  | "currency"
  | "unit"
  | "comment";

export interface Token {
  type: TokenType;
  start: number;
  end: number;
  text: string;
  className?: string;
}

// Custom marks for each token type
export const VariableMark = Mark.create({
  name: "variable",
  parseHTML() {
    return [{ tag: "span.semantic-variable" }];
  },
  renderHTML() {
    return ["span", { class: "semantic-variable" }, 0];
  },
});

export const OperatorMark = Mark.create({
  name: "operator",
  parseHTML() {
    return [{ tag: "span.semantic-operator" }];
  },
  renderHTML() {
    return ["span", { class: "semantic-operator" }, 0];
  },
});

export const NumberMark = Mark.create({
  name: "number",
  parseHTML() {
    return [{ tag: "span.semantic-number" }];
  },
  renderHTML() {
    return ["span", { class: "semantic-number" }, 0];
  },
});

export const FunctionMark = Mark.create({
  name: "function",
  parseHTML() {
    return [{ tag: "span.semantic-function" }];
  },
  renderHTML() {
    return ["span", { class: "semantic-function" }, 0];
  },
});

export const ResultMark = Mark.create({
  name: "result",
  parseHTML() {
    return [{ tag: "span.semantic-result" }];
  },
  renderHTML() {
    return ["span", { class: "semantic-result" }, 0];
  },
});

export const ErrorMark = Mark.create({
  name: "error",
  parseHTML() {
    return [{ tag: "span.semantic-error" }];
  },
  renderHTML() {
    return ["span", { class: "semantic-error" }, 0];
  },
});

export const ScrubbableNumberMark = Mark.create({
  name: "scrubbableNumber",
  parseHTML() {
    return [{ tag: "span.semantic-scrubbableNumber" }];
  },
  renderHTML() {
    return ["span", { class: "semantic-scrubbableNumber" }, 0];
  },
});

export const TriggerMark = Mark.create({
  name: "trigger",
  parseHTML() {
    return [{ tag: "span.semantic-trigger" }];
  },
  renderHTML() {
    return ["span", { class: "semantic-trigger" }, 0];
  },
});

export const CommentMark = Mark.create({
  name: "comment",
  parseHTML() {
    return [{ tag: "span.semantic-comment" }];
  },
  renderHTML() {
    return ["span", { class: "semantic-comment" }, 0];
  },
});

// Main semantic highlighting extension
// This Tiptap extension creates a ProseMirror plugin that decorates the document
// with CSS classes based on the token type.
export const SemanticHighlightExtension = Extension.create({
  name: "semanticHighlight",

  addProseMirrorPlugins() {
    const getVariableContext = () => {
        const context = this.options.getVariableContext?.() || new Map<string, Variable>();
        // Ensure we have a proper Map
        return context instanceof Map ? context : new Map(Object.entries(context));
      };
    const evaluateNode = this.options.evaluateNode || (() => null);

    const buildDecorations = (doc: ProseMirrorNode): DecorationSet => {
      const decorations: Decoration[] = [];

      doc.forEach((node: ProseMirrorNode, offset: number) => {
        if (node.type.name !== "paragraph") {
          return;
        }

        const text = getTokenizableLineText(node);
        // Reference atoms are represented as a single placeholder rune for offset alignment.
        // Parse using a numeric stand-in so normal expression tokenization still works and
        // does not degrade to full-line "error" highlighting on valid reference expressions.
        const parseText = text.includes("§") ? text.replace(/§/g, "1") : text;
        const lineNumber = Math.floor(offset / 100); // Approximate line number
        const astNode = parseLine(parseText, lineNumber); // Parse text into AST
        const variableContext = getVariableContext();
        let tokens = extractTokensFromASTNode(astNode, variableContext);
        if (
          tokens.length === 0 &&
          isPlainTextNode(astNode) &&
          shouldHighlightPlainTextAsExpression(text, variableContext)
        ) {
          tokens = tokenizeExpression(text, 0, variableContext);
        }
        const resultRanges: Array<{ from: number; to: number }> = [];
        const referenceRanges: Array<{ from: number; to: number }> = [];

        node.descendants((child, pos) => {
          if (child.type?.name === "resultToken") {
            const from = offset + pos + 1;
            const to = from + child.nodeSize - 1;
            resultRanges.push({ from, to });
            return false;
          }
          if (child.type?.name === "referenceToken") {
            const from = offset + pos + 1;
            const to = from + child.nodeSize;
            referenceRanges.push({ from, to });
            return false;
          }
          return true;
        });

        tokens.forEach((token) => {
          const from = offset + token.start + 1; // +1 for paragraph node
          const to = offset + token.end + 1;
          const isInResult = resultRanges.some((range) => from < range.to && to > range.from);
          const isInReference = referenceRanges.some((range) => from < range.to && to > range.from);
          if (isInResult || isInReference) {
            return;
          }

          const decoration = Decoration.inline(from, to, {
            class: token.className
              ? `semantic-${token.type} ${token.className}`
              : `semantic-${token.type}`,
          });
          decorations.push(decoration);
        });
      });

      return DecorationSet.create(doc, decorations);
    };

    return [
      new Plugin({
        key: new PluginKey("semanticHighlight"),

        state: {
          init(_, state) {
            return buildDecorations(state.doc);
          },

          apply(tr, oldState) {
            if (!tr.docChanged) {
              return oldState.map(tr.mapping, tr.doc);
            }
            return buildDecorations(tr.doc);
          },
        },

        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});

/**
 * Extracts a flat list of semantic tokens from a given AST node.
 * This function is the core of the syntax highlighting logic. It traverses the AST
 * and generates tokens for variables, operators, numbers, etc., with their
 * corresponding positions in the text.
 * @param astNode The AST node to process.
 * @param variableContext A map of known variables to help with identification.
 * @returns An array of tokens.
 */
function extractTokensFromASTNode(
  astNode: ASTNode,
  variableContext: Map<string, Variable>
): Token[] {
  const tokens: Token[] = [];
  const text = astNode.raw;

  if (!text.trim()) return tokens;

  const leadingWhitespace = text.match(/^\s*/)?.[0].length ?? 0;

  // Handle different AST node types with structured data (no more complex parsing!)
  
  // Comments: lines starting with //
  if (isCommentNode(astNode)) {
    tokens.push({
      type: "comment",
      start: 0,
      end: text.length,
      text: text,
    });
    return tokens;
  }
  
  if (isVariableAssignmentNode(astNode)) {
    // Variable assignment: x = 10
    const varName = astNode.variableName;
    const varStart = leadingWhitespace;
    const varEnd = varStart + varName.length;

    tokens.push({
      type: "variable",
      start: varStart,
      end: varEnd,
      text: varName,
    });

    // Find equals sign
    const equalsIndex = text.indexOf("=", varEnd);
    if (equalsIndex !== -1) {
      tokens.push({
        type: "operator",
        start: equalsIndex,
        end: equalsIndex + 1,
        text: "=",
      });

      // Handle the value part
      const valueStart = equalsIndex + 1;
      const valueText = text.substring(valueStart).trim();
      const valueStartPos = text.indexOf(valueText, valueStart);

      const isSimpleNumber = /^-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(
        valueText.trim()
      );

      if (astNode.parsedValue?.isNumeric() && isSimpleNumber) {
        tokens.push({
          type: "scrubbableNumber",
          start: valueStartPos,
          end: valueStartPos + valueText.length,
          text: valueText,
        });
      } else {
        // It's an expression or includes units/currency/percent - tokenize it
        const exprTokens = tokenizeExpression(valueText, valueStartPos, variableContext);
        tokens.push(...exprTokens);
      }
    }
  } else if (isExpressionNode(astNode)) {
    // Expression evaluation: 2 + 3 => or unit expressions: 100 ft to m
    const arrowIndex = text.indexOf("=>");
    if (arrowIndex !== -1) {
      // Traditional expression with =>
      // Tokenize expression before =>
      const exprText = text.substring(0, arrowIndex);
      const exprTokens = tokenizeExpression(exprText, 0, variableContext);
      tokens.push(...exprTokens);

      // Add => trigger
      tokens.push({
        type: "trigger",
        start: arrowIndex,
        end: arrowIndex + 2,
        text: "=>",
      });

      // Results are rendered separately, so don't tokenize text after =>
    } else {
      // Unit expression without => (e.g., "100 ft to m", "PI")
      const exprTokens = tokenizeExpression(text, 0, variableContext);
      tokens.push(...exprTokens);
    }
  } else if (isCombinedAssignmentNode(astNode)) {
    // Combined assignment: x = 2 + 3 =>
    const varName = astNode.variableName;
    const varStart = leadingWhitespace;
    const varEnd = varStart + varName.length;

    tokens.push({
      type: "variable",
      start: varStart,
      end: varEnd,
      text: varName,
    });

    // Find equals sign
    const equalsIndex = text.indexOf("=", varEnd);
    if (equalsIndex !== -1) {
      tokens.push({
        type: "operator",
        start: equalsIndex,
        end: equalsIndex + 1,
        text: "=",
      });

      // Find arrow
      const arrowIndex = text.indexOf("=>", equalsIndex);
      if (arrowIndex !== -1) {
        // Tokenize expression between = and =>
        const exprStart = equalsIndex + 1;
        const exprText = text.substring(exprStart, arrowIndex);
        const exprTokens = tokenizeExpression(exprText, exprStart, variableContext);
        tokens.push(...exprTokens);

        // Add => trigger
        tokens.push({
          type: "trigger",
          start: arrowIndex,
          end: arrowIndex + 2,
          text: "=>",
        });

        // Results are rendered separately, so don't tokenize text after =>
      }
    }
  } else if (isErrorNode(astNode)) {
    // Error node - highlight the entire thing as error
    tokens.push({
      type: "error",
      start: 0,
      end: text.length,
      text: text,
    });
  } else if (isFunctionDefinitionNode(astNode)) {
    const nameStart = leadingWhitespace;
    const nameEnd = nameStart + astNode.functionName.length;
    tokens.push({
      type: "function",
      start: nameStart,
      end: nameEnd,
      text: astNode.functionName,
    });

    const equalsIndex = text.indexOf("=");
    if (equalsIndex !== -1) {
      tokens.push({
        type: "operator",
        start: equalsIndex,
        end: equalsIndex + 1,
        text: "=",
      });
    }

    const openIndex = text.indexOf("(");
    const closeIndex = text.indexOf(")", openIndex + 1);
    if (openIndex !== -1 && closeIndex !== -1) {
      const paramsText = text.substring(openIndex + 1, closeIndex);
      let searchFrom = openIndex + 1;
      paramsText.split(",").forEach((param) => {
        const name = param.split("=")[0].trim();
        if (!name) return;
        const index = text.indexOf(name, searchFrom);
        if (index !== -1) {
          tokens.push({
            type: "variable",
            start: index,
            end: index + name.length,
            text: name,
          });
          searchFrom = index + name.length;
        }
      });
    }
  }
  // For PlainTextNode, return no tokens (no highlighting)

  return tokens;
}

// Tokenize a mathematical expression (still useful for detailed expression parsing)
export function tokenizeExpression(
  expr: string,
  baseOffset: number,
  variableContext: Map<string, Variable>
): Token[] {
  const tokens: Token[] = [];
  let lastTokenType: TokenType | null = null;
  let lastTokenText = "";

  const pushToken = (token: Token) => {
    tokens.push(token);
    lastTokenType = token.type;
    lastTokenText = token.text;
  };

  // Regular expressions for different token types
  const numberRegex = /^-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?:[eE][+-]?\d+)?/;
  const functionRegex = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/;
  const operatorRegex = /^[\+\-\*\/\^\%]/;
  const parenRegex = /^[\(\)]/;
  const bracketRegex = /^[\[\]]/;
  const rangeOperatorRegex = /^\.\./;
  const triggerRegex = /^=>/;
  const unitRegex = /^[a-zA-Z°µμΩ][a-zA-Z0-9°µμΩ\/\^\-\*\·]*/;
  const currencySymbolRegex = /^[\$€£¥₹₿]/;
  const currencyCodeRegex = /^(CHF|CAD|AUD)\b/;
  const keywordRegex = /^(to|in|of|on|off|as|is|per)\b/;
  const constantRegex = /^(PI|E)\b/;

  // Get all variable names sorted by length (longest first for greedy matching)
  const variableNames = Array.from(variableContext.keys()).sort((a, b) => b.length - a.length);

  let pos = 0;
  while (pos < expr.length) {
    // Skip whitespace
    if (/\s/.test(expr[pos])) {
      pos++;
      continue;
    }

    let matched = false;

    const dateMatch = matchDateLiteralTokens(expr, pos, baseOffset);
    if (dateMatch) {
      tokens.push(...dateMatch.tokens);
      pos += dateMatch.length;
      matched = true;
    }

    if (matched) {
      continue;
    }

    // Check for functions
    const funcMatch = expr.substring(pos).match(functionRegex);
    if (funcMatch) {
      const funcName = funcMatch[1];
      tokens.push({
        type: "function",
        start: baseOffset + pos,
        end: baseOffset + pos + funcName.length,
        text: funcName,
      });
      pos += funcName.length;
      // Skip whitespace between function name and parenthesis
      while (pos < expr.length && /\s/.test(expr[pos])) {
        pos++;
      }
      // Add the opening parenthesis as an operator
      if (pos < expr.length && expr[pos] === "(") {
        tokens.push({
          type: "operator",
          start: baseOffset + pos,
          end: baseOffset + pos + 1,
          text: "(",
        });
        pos++;
      }
      matched = true;
    }

    // Check for variables (longest match first)
    if (!matched) {
      for (const varName of variableNames) {
        if (expr.substring(pos).startsWith(varName)) {
          const lastToken = tokens[tokens.length - 1];
          if (lastToken?.type === "scrubbableNumber" && UnitValue.isUnitString(`1${varName}`)) {
            continue;
          }
          // Check if it's a word boundary (not part of a larger word)
          const afterChar = expr[pos + varName.length];
          if (!afterChar || /[\s\+\-\*\/\^\%\(\)\[\]\.,]/.test(afterChar)) {
            pushToken({
              type: "variable",
              start: baseOffset + pos,
              end: baseOffset + pos + varName.length,
              text: varName,
            });
            pos += varName.length;
            matched = true;
            break;
          }
        }
      }
    }

    // Check for numbers
    if (!matched) {
      const numMatch = expr.substring(pos).match(numberRegex);
      if (numMatch) {
        pushToken({
          type: "scrubbableNumber",
          start: baseOffset + pos,
          end: baseOffset + pos + numMatch[0].length,
          text: numMatch[0],
        });
        pos += numMatch[0].length;
        matched = true;
      }
    }

    // Check for currency symbols
    if (!matched) {
      const currencyMatch = expr.substring(pos).match(currencySymbolRegex);
      if (currencyMatch) {
        pushToken({
          type: "currency",
          start: baseOffset + pos,
          end: baseOffset + pos + currencyMatch[0].length,
          text: currencyMatch[0],
        });
        pos += currencyMatch[0].length;
        matched = true;
      }
    }

    // Check for mathematical constants (PI, E)
    if (!matched) {
      const constantMatch = expr.substring(pos).match(constantRegex);
      if (constantMatch) {
        pushToken({
          type: "constant",
          start: baseOffset + pos,
          end: baseOffset + pos + constantMatch[0].length,
          text: constantMatch[0],
        });
        pos += constantMatch[0].length;
        matched = true;
      }
    }

    // Check for keywords (unit conversion and percentage operators)
    if (!matched) {
      const keywordMatch = expr.substring(pos).match(keywordRegex);
      if (keywordMatch) {
        pushToken({
          type: "keyword",
          start: baseOffset + pos,
          end: baseOffset + pos + keywordMatch[0].length,
          text: keywordMatch[0],
        });
        pos += keywordMatch[0].length;
        matched = true;
      }
    }

    // Check for units (after numbers and variables, before operators)
    if (!matched) {
      const lastToken = tokens[tokens.length - 1];
      const prevToken = tokens[tokens.length - 2];
      const shouldParseUnit =
        lastToken?.type === "scrubbableNumber" ||
        (lastToken?.type === "keyword" &&
          (lastToken.text === "to" || lastToken.text === "in" || lastToken.text === "per")) ||
        (lastToken?.type === "operator" &&
          lastToken.text === "/" &&
          prevToken?.type === "scrubbableNumber");
      if (shouldParseUnit) {
        const currencyCodeMatch = expr.substring(pos).match(currencyCodeRegex);
        if (currencyCodeMatch) {
          pushToken({
            type: "currency",
            start: baseOffset + pos,
            end: baseOffset + pos + currencyCodeMatch[0].length,
            text: currencyCodeMatch[0],
          });
          pos += currencyCodeMatch[0].length;
          matched = true;
        }

        const unitMatch = !matched ? expr.substring(pos).match(unitRegex) : null;
        if (unitMatch) {
          // Make sure it's not a variable name
          const unitText = unitMatch[0];
          const unitIsKnown = UnitValue.isUnitString(`1${unitText}`);
          const preferUnit = unitIsKnown && lastToken?.type === "scrubbableNumber";
          if (preferUnit || !variableContext.has(unitText)) {
            pushToken({
              type: "unit",
              start: baseOffset + pos,
              end: baseOffset + pos + unitText.length,
              text: unitText,
            });
            pos += unitText.length;
            matched = true;
          }
        }
      }
    }

    // Check for trigger (=>) - must come before operator check
    if (!matched) {
      const triggerMatch = expr.substring(pos).match(triggerRegex);
      if (triggerMatch) {
        tokens.push({
          type: "trigger",
          start: baseOffset + pos,
          end: baseOffset + pos + 2,
          text: "=>",
        });
        pos += 2;
        matched = true;
      }
    }

    // Check for operators and parentheses
    if (!matched) {
      const rangeMatch = expr.substring(pos).match(rangeOperatorRegex);
      if (rangeMatch) {
        pushToken({
          type: "operator",
          start: baseOffset + pos,
          end: baseOffset + pos + 2,
          text: "..",
        });
        pos += 2;
        matched = true;
      } else if (
        operatorRegex.test(expr[pos]) ||
        parenRegex.test(expr[pos]) ||
        bracketRegex.test(expr[pos])
      ) {
        pushToken({
          type: "operator",
          start: baseOffset + pos,
          end: baseOffset + pos + 1,
          text: expr[pos],
        });
        pos++;
        matched = true;
      }
    }

    // Fallback: treat unknown identifiers as variables
    if (!matched && /[a-zA-Z_]/.test(expr[pos])) {
      const start = pos;
      let value = "";
      while (pos < expr.length) {
        const char = expr[pos];
        if (/[a-zA-Z0-9_]/.test(char)) {
          value += char;
          pos++;
          continue;
        }
        if (/\s/.test(char)) {
          let lookahead = pos;
          while (lookahead < expr.length && /\s/.test(expr[lookahead])) {
            lookahead++;
          }
          if (lookahead < expr.length && /[a-zA-Z0-9_]/.test(expr[lookahead])) {
            value += " ";
            pos = lookahead;
            continue;
          }
        }
        break;
      }
      const normalizedValue = value.replace(/\s+/g, " ").trim();
      if (normalizedValue) {
        pushToken({
          type: "variable",
          start: baseOffset + start,
          end: baseOffset + pos,
          text: normalizedValue,
        });
        matched = true;
      }
    }

    // If nothing matched, skip this character
    if (!matched) {
      pos++;
    }
  }

  return tokens;
}

function matchDateLiteralTokens(
  expr: string,
  pos: number,
  baseOffset: number
): { tokens: Token[]; length: number } | null {
  const slice = expr.slice(pos);
  const tokens: Token[] = [];

  const pushDateNumber = (start: number, length: number) => {
    tokens.push({
      type: "scrubbableNumber",
      start: baseOffset + start,
      end: baseOffset + start + length,
      text: expr.slice(start, start + length),
      className: "semantic-date-part",
    });
  };

  const pushSeparator = (start: number, length: number) => {
    tokens.push({
      type: "operator",
      start: baseOffset + start,
      end: baseOffset + start + length,
      text: expr.slice(start, start + length),
      className: "semantic-date-separator",
    });
  };

  const isoMatch = slice.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?/);
  if (isoMatch) {
    const yearStart = pos;
    pushDateNumber(yearStart, 4);
    pushSeparator(yearStart + 4, 1);
    pushDateNumber(yearStart + 5, 2);
    pushSeparator(yearStart + 7, 1);
    pushDateNumber(yearStart + 8, 2);
    let length = 10;
    if (isoMatch[4] && isoMatch[5]) {
      const timeStart = pos + length;
      if (expr[timeStart] === " ") {
        pushSeparator(timeStart, 1);
        length += 1;
      }
      pushDateNumber(pos + length, 2);
      pushSeparator(pos + length + 2, 1);
      pushDateNumber(pos + length + 3, 2);
      length += 5;
    }
    return { tokens, length };
  }

  const numericMatch = slice.match(/^(\d{1,2})([\/.-])(\d{1,2})\2(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (numericMatch) {
    const firstLength = numericMatch[1].length;
    const sep = numericMatch[2].length;
    const secondLength = numericMatch[3].length;
    const yearLength = numericMatch[4].length;
    const firstStart = pos;
    pushDateNumber(firstStart, firstLength);
    pushSeparator(firstStart + firstLength, sep);
    pushDateNumber(firstStart + firstLength + sep, secondLength);
    pushSeparator(firstStart + firstLength + sep + secondLength, sep);
    pushDateNumber(firstStart + firstLength + sep + secondLength + sep, yearLength);

    let length = firstLength + sep + secondLength + sep + yearLength;
    if (numericMatch[5] && numericMatch[6]) {
      const timeStart = pos + length;
      if (expr[timeStart] === " ") {
        pushSeparator(timeStart, 1);
        length += 1;
      }
      pushDateNumber(pos + length, 2);
      pushSeparator(pos + length + 2, 1);
      pushDateNumber(pos + length + 3, 2);
      length += 5;
    }

    return { tokens, length };
  }

  return null;
}
