import type { FunctionDefinitionNode } from "../../parsing/ast";
import type { Variable } from "../../state/types";
import { searchUnits } from "../../syntax/registry";

export type AutocompleteKind = "variable" | "function" | "unit" | "directive";

export type AutocompleteContext =
  | { type: "expression"; query: string; replaceFrom: number; replaceTo: number }
  | { type: "conversionTarget"; query: string; replaceFrom: number; replaceTo: number }
  | { type: "viewParam"; key: string; query: string; replaceFrom: number; replaceTo: number }
  | { type: "directive"; query: string; replaceFrom: number; replaceTo: number }
  | { type: "none"; query: string; replaceFrom: number; replaceTo: number };

export interface AutocompleteItem {
  kind: AutocompleteKind;
  label: string;
  insertText: string;
  detail: string;
  score: number;
  replaceFrom: number;
  replaceTo: number;
}

export interface AutocompleteInput {
  lineText: string;
  cursorOffset: number;
  variables: Map<string, Variable>;
  functions: Map<string, FunctionDefinitionNode>;
  maxItems?: number;
}

const STRONG_SEPARATOR_REGEX = /[+\-*\/^(),=<>\[\]]/g;
const DIRECTIVES = [
  { label: "@view plot", detail: "Plot view", insertText: "@view plot " },
  { label: "@view hist", detail: "Histogram view", insertText: "@view hist " },
  { label: "@view scatter", detail: "Scatter view", insertText: "@view scatter " },
];

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function getValueType(variable: Variable): string {
  const value = variable.value as any;
  if (value && typeof value.getType === "function") {
    return String(value.getType());
  }
  return "value";
}

function getVariableDetail(variable: Variable): string {
  const type = getValueType(variable);
  const raw = String(variable.rawValue || "").trim();
  return raw ? `${raw} · ${type}` : type;
}

function isVariableEligibleForViewKey(variable: Variable, key: string): boolean {
  const type = getValueType(variable);
  if (key === "values") {
    return type === "list";
  }
  if (key === "x" || key === "y") {
    return ["number", "percentage", "currency", "unit", "duration"].includes(type);
  }
  return true;
}

function acronym(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toLowerCase();
}

function fuzzyScore(label: string, query: string): number {
  const normalizedLabel = normalizeText(label);
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return 1;
  }
  if (normalizedLabel === normalizedQuery) {
    return 1000;
  }
  if (normalizedLabel.startsWith(normalizedQuery)) {
    return 900 - normalizedLabel.length;
  }

  const labelTokens = normalizedLabel.split(/\s+/);
  const queryTokens = normalizedQuery.split(/\s+/);
  const allTokensMatch = queryTokens.every((queryToken) =>
    labelTokens.some((labelToken) => labelToken.startsWith(queryToken))
  );
  if (allTokensMatch) {
    return 760 - labelTokens.length * 4;
  }

  if (acronym(normalizedLabel).startsWith(normalizedQuery.replace(/\s+/g, ""))) {
    return 620 - normalizedLabel.length;
  }

  if (normalizedLabel.includes(normalizedQuery)) {
    return 480 - normalizedLabel.indexOf(normalizedQuery);
  }

  return 0;
}

function findLastStrongSeparator(text: string): number {
  let last = -1;
  let match: RegExpExecArray | null;
  STRONG_SEPARATOR_REGEX.lastIndex = 0;
  while ((match = STRONG_SEPARATOR_REGEX.exec(text))) {
    last = match.index;
  }
  return last;
}

function buildSegmentContext(
  type: AutocompleteContext["type"],
  beforeCursor: string,
  segmentStart: number,
  extra?: { key?: string }
): AutocompleteContext {
  const segment = beforeCursor.slice(segmentStart);
  const leadingWhitespace = segment.match(/^\s*/)?.[0].length || 0;
  const replaceFrom = segmentStart + leadingWhitespace;
  const query = beforeCursor.slice(replaceFrom);

  if (type === "viewParam") {
    return {
      type,
      key: extra?.key || "",
      query,
      replaceFrom,
      replaceTo: beforeCursor.length,
    };
  }

  return {
    type,
    query,
    replaceFrom,
    replaceTo: beforeCursor.length,
  } as AutocompleteContext;
}

export function getAutocompleteContext(
  lineText: string,
  cursorOffset: number
): AutocompleteContext {
  const clampedOffset = Math.max(0, Math.min(cursorOffset, lineText.length));
  const beforeCursor = lineText.slice(0, clampedOffset);
  const afterCursor = lineText.slice(clampedOffset);
  const trimmedBefore = beforeCursor.trimStart();

  if (!trimmedBefore || trimmedBefore.startsWith("#") || trimmedBefore.startsWith("//")) {
    return { type: "none", query: "", replaceFrom: clampedOffset, replaceTo: clampedOffset };
  }

  if (!trimmedBefore.startsWith("@view") && !beforeCursor.includes("=") && afterCursor.includes("=")) {
    return { type: "none", query: "", replaceFrom: clampedOffset, replaceTo: clampedOffset };
  }

  const directiveMatch = beforeCursor.match(/(^|\s)@([A-Za-z]*)$/);
  if (directiveMatch) {
    const atIndex = beforeCursor.lastIndexOf("@");
    return {
      type: "directive",
      query: beforeCursor.slice(atIndex),
      replaceFrom: atIndex,
      replaceTo: clampedOffset,
    };
  }

  if (trimmedBefore.startsWith("@view")) {
    const keyMatch = beforeCursor.match(/(\w+)\s*=\s*([^=]*)$/);
    if (keyMatch && keyMatch.index !== undefined) {
      const key = keyMatch[1];
      const valueStart = keyMatch.index + keyMatch[0].lastIndexOf("=") + 1;
      return buildSegmentContext("viewParam", beforeCursor, valueStart, { key });
    }
    return { type: "none", query: "", replaceFrom: clampedOffset, replaceTo: clampedOffset };
  }

  const conversionMatch = beforeCursor.match(/(?:^|[\s(])(?:to|in)\s+([A-Za-z°µμΩ$€£¥₹₿\/^*-]*)$/i);
  if (conversionMatch && conversionMatch.index !== undefined) {
    const query = conversionMatch[1] || "";
    return {
      type: "conversionTarget",
      query,
      replaceFrom: clampedOffset - query.length,
      replaceTo: clampedOffset,
    };
  }

  const separatorIndex = findLastStrongSeparator(beforeCursor);
  const segmentStart = separatorIndex >= 0 ? separatorIndex + 1 : 0;
  return buildSegmentContext("expression", beforeCursor, segmentStart);
}

function variableItems(
  variables: Map<string, Variable>,
  context: AutocompleteContext,
  boost = 0
): AutocompleteItem[] {
  if (context.type === "none" || context.type === "directive" || context.type === "conversionTarget") {
    return [];
  }
  const key = context.type === "viewParam" ? context.key : "";
  return Array.from(variables.values())
    .filter((variable) => !key || isVariableEligibleForViewKey(variable, key))
    .map((variable) => ({
      kind: "variable" as const,
      label: variable.name,
      insertText: variable.name,
      detail: getVariableDetail(variable),
      score: fuzzyScore(variable.name, context.query) + boost,
      replaceFrom: context.replaceFrom,
      replaceTo: context.replaceTo,
    }))
    .filter((item) => item.score > boost);
}

function functionItems(
  functions: Map<string, FunctionDefinitionNode>,
  context: AutocompleteContext
): AutocompleteItem[] {
  if (context.type !== "expression" && context.type !== "viewParam") {
    return [];
  }
  if (context.type === "viewParam" && context.key !== "y") {
    return [];
  }
  return Array.from(functions.values())
    .map((fn) => {
      const signature = `${fn.functionName}(${fn.params.map((param) => param.name).join(", ")})`;
      return {
        kind: "function" as const,
        label: signature,
        insertText: `${fn.functionName}(`,
        detail: "function",
        score: fuzzyScore(fn.functionName, context.query) + 25,
        replaceFrom: context.replaceFrom,
        replaceTo: context.replaceTo,
      };
    })
    .filter((item) => item.score > 25);
}

function unitItems(context: AutocompleteContext): AutocompleteItem[] {
  if (context.type !== "conversionTarget") {
    return [];
  }
  return searchUnits(context.query || "")
    .slice(0, 24)
    .map((unit) => ({
      kind: "unit" as const,
      label: unit.symbol,
      insertText: unit.symbol,
      detail: `${unit.name} · ${unit.category}`,
      score: fuzzyScore(`${unit.symbol} ${unit.name} ${unit.aliases.join(" ")}`, context.query) + 10,
      replaceFrom: context.replaceFrom,
      replaceTo: context.replaceTo,
    }))
    .filter((item) => item.score > 10);
}

function directiveItems(context: AutocompleteContext): AutocompleteItem[] {
  if (context.type !== "directive") {
    return [];
  }
  return DIRECTIVES.map((directive) => ({
    kind: "directive" as const,
    label: directive.label,
    insertText: directive.insertText,
    detail: directive.detail,
    score: fuzzyScore(directive.label, context.query),
    replaceFrom: context.replaceFrom,
    replaceTo: context.replaceTo,
  })).filter((item) => item.score > 0);
}

export function getAutocompleteSuggestions(input: AutocompleteInput): AutocompleteItem[] {
  const context = getAutocompleteContext(input.lineText, input.cursorOffset);
  if (context.type === "none") {
    return [];
  }

  const items = [
    ...variableItems(input.variables, context),
    ...functionItems(input.functions, context),
    ...unitItems(context),
    ...directiveItems(context),
  ];

  return items
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, input.maxItems || 8);
}
