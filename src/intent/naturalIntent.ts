import { parseLine } from "../parsing/astParser";

export type NaturalIntentKind = "plot" | "solve" | "convert" | "set";

export interface NaturalIntentContext {
  targetName?: string;
  variableNames: string[];
}

export interface NaturalIntentProposal {
  kind: NaturalIntentKind;
  syntax: string;
  summary: string;
  variables: string[];
}

const normalizeForMatch = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[¿?¡!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const containsName = (normalizedText: string, name: string): boolean => {
  const normalizedName = normalizeForMatch(name);
  return new RegExp(`(^|[^\\p{L}\\p{N}_])${escapeRegExp(normalizedName)}(?=$|[^\\p{L}\\p{N}_])`, "u").test(
    normalizedText,
  );
};
const namesMentionedIn = (
  text: string,
  variableNames: string[],
): string[] => {
  const normalizedText = normalizeForMatch(text);
  return [...variableNames]
    .sort((left, right) => right.length - left.length)
    .filter((name) => containsName(normalizedText, name));
};

const firstNameMentionedIn = (
  text: string,
  variableNames: string[],
): string | null => namesMentionedIn(text, variableNames)[0] || null;

const isValidSmartPadSyntax = (syntax: string): boolean => {
  const node = parseLine(syntax, 1);
  return node.type !== "plainText" && node.type !== "error";
};

const buildProposal = (
  proposal: NaturalIntentProposal,
): NaturalIntentProposal | null =>
  isValidSmartPadSyntax(proposal.syntax) ? proposal : null;

const cleanRequestedValue = (value: string): string =>
  value
    .replace(/^(?:a|at|en|to)\s+/i, "")
    .replace(/\s+(?:please|por favor)$/i, "")
    .trim();

const findRelationSplit = (
  query: string,
): { before: string; after: string } | null => {
  const normalized = normalizeForMatch(query);
  const relation = /\s+(?:against|versus|vs\.?|by|segun|respecto a|en funcion de|frente a)\s+/u.exec(
    normalized,
  );
  if (!relation || relation.index === undefined) return null;
  return {
    before: normalized.slice(0, relation.index),
    after: normalized.slice(relation.index + relation[0].length),
  };
};

const interpretPlot = (
  query: string,
  context: NaturalIntentContext,
): NaturalIntentProposal | null => {
  const normalized = normalizeForMatch(query);
  if (!/(?:^|\s)(?:plot|graph|chart|grafica|graficar|representa|dibuja|muestra)(?:\s|$)/u.test(normalized)) {
    return null;
  }

  const relation = findRelationSplit(query);
  const mentioned = namesMentionedIn(query, context.variableNames);
  const y = relation
    ? firstNameMentionedIn(relation.before, context.variableNames)
    : mentioned[0] || context.targetName || null;
  const x = relation
    ? firstNameMentionedIn(relation.after, context.variableNames)
    : mentioned.find((name) => name !== y) ||
      context.variableNames.find((name) => name !== y) ||
      null;
  if (!x || !y || x === y) return null;

  return buildProposal({
    kind: "plot",
    syntax: `@view plot x=${x} y=${y} size=md`,
    summary: `Plot ${y} as ${x} changes`,
    variables: [x, y],
  });
};

const interpretSolve = (
  query: string,
  context: NaturalIntentContext,
): NaturalIntentProposal | null => {
  const normalized = normalizeForMatch(query);
  if (!/(?:need|find|solve|calculate|what .* gives|necesito|encuentra|resuelve|calcula|que .* da)/u.test(normalized)) {
    return null;
  }

  const equality = /([^=]+)=\s*(.+)$/u.exec(query);
  if (!equality) return null;
  const target =
    firstNameMentionedIn(equality[1], context.variableNames) ||
    context.targetName ||
    null;
  const mentioned = namesMentionedIn(query, context.variableNames);
  const input = mentioned.find((name) => name !== target) || null;
  const targetValue = cleanRequestedValue(equality[2]);
  if (!target || !input || !targetValue) return null;

  return buildProposal({
    kind: "solve",
    syntax: `make ${target} = ${targetValue} by ${input} =>`,
    summary: `Find the ${input} needed for ${target} = ${targetValue}`,
    variables: [target, input],
  });
};

const interpretConvert = (
  query: string,
  context: NaturalIntentContext,
): NaturalIntentProposal | null => {
  const normalized = normalizeForMatch(query);
  const command = /(?:^|\s)(?:convert|convierte|convertir)(?:\s|$)/u.exec(normalized);
  if (!command) return null;
  const variable = firstNameMentionedIn(query, context.variableNames);
  if (!variable) return null;
  const unitMatch = /\s+(?:to|a|en)\s+([A-Za-z€$£¥][A-Za-z0-9€$£¥/^·_-]*)\s*$/u.exec(
    query.trim(),
  );
  const targetUnit = unitMatch?.[1]?.trim();
  if (!targetUnit) return null;

  return buildProposal({
    kind: "convert",
    syntax: `${variable} to ${targetUnit} =>`,
    summary: `Convert ${variable} to ${targetUnit}`,
    variables: [variable],
  });
};

const interpretSet = (
  query: string,
  context: NaturalIntentContext,
): NaturalIntentProposal | null => {
  const normalized = normalizeForMatch(query);
  if (!/(?:^|\s)(?:set|change|adjust|pon|cambia|ajusta)(?:\s|$)/u.test(normalized)) {
    return null;
  }
  const variable = firstNameMentionedIn(query, context.variableNames);
  if (!variable) return null;
  const normalizedVariable = normalizeForMatch(variable);
  const variableIndex = normalized.indexOf(normalizedVariable);
  if (variableIndex < 0) return null;
  const rawTail = query.slice(variableIndex + variable.length);
  const value = cleanRequestedValue(rawTail.replace(/^\s*(?:=|to|a|en)?\s*/i, ""));
  if (!value || !/[-+]?\d/u.test(value)) return null;

  return buildProposal({
    kind: "set",
    syntax: `${variable} = ${value}`,
    summary: `Set ${variable} to ${value}`,
    variables: [variable],
  });
};

/**
 * Deterministic language-to-syntax compiler.
 *
 * The output is always ordinary, visible SmartPad syntax. An eventual model can
 * populate the same structured intents, but syntax generation and validation
 * remain local and deterministic.
 */
export const interpretNaturalIntent = (
  query: string,
  context: NaturalIntentContext,
): NaturalIntentProposal | null => {
  const trimmed = query.trim();
  if (!trimmed || context.variableNames.length === 0) return null;
  return (
    interpretPlot(trimmed, context) ||
    interpretSolve(trimmed, context) ||
    interpretConvert(trimmed, context) ||
    interpretSet(trimmed, context)
  );
};
