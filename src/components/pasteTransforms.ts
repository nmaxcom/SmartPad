import { parseLine } from "../parsing/astParser";
import { SemanticParsers } from "../types";

const SHARED_LIVE_RESULT_SUFFIX_RE = /^(.*?)(\s+\(([^()\n]+)\)\s*)$/;

export function normalizePastedHTML(html: string): string {
  try {
    if (!html) {
      return html;
    }

    const doc = new DOMParser().parseFromString(html, "text/html");
    const hasCode = doc.querySelector("pre, code");
    if (hasCode) {
      const text = doc.body.textContent || "";
      const lines = text.replace(/\r\n?/g, "\n").split("\n");
      return lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
    }

    return doc.body.innerHTML;
  } catch {
    return html;
  }
}

export function selectPastePayload(markdown: string, text: string): string {
  const normalizedMarkdown = normalizeClipboardText(markdown);
  const normalizedText = normalizeClipboardText(text);

  if (!normalizedMarkdown) {
    return normalizedText;
  }
  if (!normalizedText) {
    return normalizedMarkdown;
  }

  const markdownLineCount = countLogicalLines(normalizedMarkdown);
  const textLineCount = countLogicalLines(normalizedText);
  const markdownLooksFlattened = markdownLineCount <= 1 && textLineCount > 1;

  if (markdownLooksFlattened) {
    return normalizedText;
  }

  return normalizedMarkdown;
}

export function stripSharedLiveResultSuffixes(payload: string): string {
  const normalized = normalizeClipboardText(payload);
  if (!normalized) {
    return normalized;
  }

  return normalized
    .split("\n")
    .map((line) => stripSharedLiveResultSuffixFromLine(line))
    .join("\n");
}

export function isLikelySharedLiveExpressionSource(line: string): boolean {
  const trimmed = (line || "").trim();
  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("@") || trimmed.includes("=>")) {
    return false;
  }

  const hasDigit = /\d/.test(trimmed);
  const hasOperator = /[=+\-*/^]|\.{2}/.test(trimmed);
  const hasFunctionCall = /\b[a-zA-Z_][a-zA-Z0-9_ ]*\(/.test(trimmed);
  const hasMathKeyword = /\b(to|in|on|off|of|as)\b/i.test(trimmed) && hasDigit;

  if (!hasOperator && !hasFunctionCall && !hasMathKeyword) {
    return false;
  }

  const candidate = parseLine(`${trimmed} =>`, 1);
  return candidate.type !== "error" && candidate.type !== "comment" && candidate.type !== "plainText";
}

function stripSharedLiveResultSuffixFromLine(line: string): string {
  const match = line.match(SHARED_LIVE_RESULT_SUFFIX_RE);
  if (!match) {
    return line;
  }

  const expressionPart = match[1] || "";
  const marker = (match[3] || "").trim();
  const trimmedExpression = expressionPart.trimEnd();

  if (!trimmedExpression || !marker) {
    return line;
  }
  if (!isLikelySharedLiveExpressionSource(trimmedExpression)) {
    return line;
  }
  if (!looksLikeRenderedValue(marker)) {
    return line;
  }

  return trimmedExpression;
}

function normalizeClipboardText(value: string): string {
  return (value || "").replace(/\r\n?/g, "\n");
}

function countLogicalLines(value: string): number {
  if (!value) {
    return 0;
  }
  return value.split("\n").length;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function looksLikeRenderedValue(value: string): boolean {
  if (!value || value.length > 80 || value.startsWith("⚠")) {
    return false;
  }
  if (!/\d/.test(value)) {
    return false;
  }

  if (SemanticParsers.parse(value)) {
    return true;
  }

  const numericLike = value.replace(/,/g, "");
  return /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(numericLike);
}
