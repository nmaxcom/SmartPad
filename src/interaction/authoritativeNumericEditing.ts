import type { EditorView } from "prosemirror-view";
import { isVariableAssignmentNode } from "../parsing/ast";
import { parseLine } from "../parsing/astParser";
import {
  NumberValue,
  PercentageValue,
  type DisplayOptions,
  type SemanticValue,
} from "../types";

export interface AssignmentValueRange {
  from: number;
  to: number;
  rawValue: string;
  lineNumber: number;
}

export const findAssignmentValueOffsets = (
  line: string,
  variableName: string,
  lineNumber = 1,
): { from: number; to: number; rawValue: string } | null => {
  const node = parseLine(line, lineNumber);
  if (!isVariableAssignmentNode(node) || node.variableName !== variableName) {
    return null;
  }
  const equalsIndex = line.indexOf("=");
  if (equalsIndex < 0) return null;
  const rawStart = line.indexOf(node.rawValue, equalsIndex + 1);
  if (rawStart < 0) return null;
  return {
    from: rawStart,
    to: rawStart + node.rawValue.length,
    rawValue: node.rawValue,
  };
};
export const findVariableAssignmentValueRange = (
  view: EditorView,
  variableName: string,
): AssignmentValueRange | null => {
  let lineNumber = 0;
  let match: AssignmentValueRange | null = null;
  view.state.doc.descendants((node, pos) => {
    if (match || !node.isTextblock) return !match;
    lineNumber += 1;
    const offsets = findAssignmentValueOffsets(
      node.textContent,
      variableName,
      lineNumber,
    );
    if (!offsets) return true;
    match = {
      from: pos + 1 + offsets.from,
      to: pos + 1 + offsets.to,
      rawValue: offsets.rawValue,
      lineNumber,
    };
    return false;
  });
  return match;
};

export const replaceVariableAssignmentValue = (
  view: EditorView,
  variableName: string,
  nextRawValue: string,
): boolean => {
  const range = findVariableAssignmentValueRange(view, variableName);
  if (!range || !nextRawValue.trim()) return false;
  if (range.rawValue === nextRawValue) return true;
  const tr = view.state.tr.insertText(nextRawValue, range.from, range.to);
  tr.setMeta("smartpadDirectManipulation", { variableName, nextRawValue });
  view.dispatch(tr);
  return true;
};

export const formatSemanticNumericValue = (
  value: SemanticValue,
  nextNumericValue: number,
  displayOptions: DisplayOptions,
): string | null => {
  if (!value.isNumeric() || !Number.isFinite(nextNumericValue)) return null;
  try {
    let nextValue: SemanticValue;
    if (value instanceof PercentageValue) {
      nextValue = new PercentageValue(nextNumericValue * 100);
    } else if (value.getType() === "number") {
      nextValue = NumberValue.from(nextNumericValue);
    } else {
      const baseValue = value.getNumericValue();
      if (!Number.isFinite(baseValue) || Math.abs(baseValue) <= Number.EPSILON) {
        return null;
      }
      nextValue = value.multiply(NumberValue.from(nextNumericValue / baseValue));
    }
    return nextValue.toString({ ...displayOptions, groupThousands: false });
  } catch {
    return null;
  }
};
