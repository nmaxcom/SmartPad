import { parseLine } from "../parsing/astParser";
import { SemanticParsers, SemanticValueTypes } from "../types";

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

export interface TabularPasteResult {
  canonical: string;
  columns: number;
  rows: number;
}

const parseDelimitedLine = (line: string, delimiter: string): string[] => {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
};

const extractHtmlTable = (html: string): { rows: string[][]; hasHeader: boolean } | null => {
  if (!html || !/<table\b/i.test(html)) return null;
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const table = doc.querySelector("table");
    if (!table) return null;
    const rows = Array.from(table.querySelectorAll("tr"))
      .map((row) =>
        Array.from(row.querySelectorAll(":scope > th, :scope > td")).map((cell) =>
          (cell.textContent || "").replace(/\s+/g, " ").trim()
        )
      )
      .filter((row) => row.length > 0);
    return {
      rows,
      hasHeader: !!table.querySelector("tr:first-child th"),
    };
  } catch {
    return null;
  }
};

const extractTextTable = (text: string): string[][] | null => {
  const lines = normalizeClipboardText(text)
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);
  if (lines.length < 2) return null;
  const delimiter = lines.some((line) => line.includes("\t"))
    ? "\t"
    : lines.every((line) => line.includes(","))
      ? ","
      : lines.every((line) => line.includes("|"))
        ? "|"
        : null;
  if (!delimiter) return null;
  const rows = lines.map((line) => parseDelimitedLine(line, delimiter));
  const width = rows[0]?.length || 0;
  if (width < 2 || rows.some((row) => row.length !== width)) return null;
  return rows;
};

const isCalculatedCell = (value: string): boolean => {
  const parsed = SemanticParsers.parse(value);
  return !!parsed && !SemanticValueTypes.isSymbolic(parsed);
};

const inferHeader = (rows: string[][]): boolean => {
  if (rows.length < 2) return false;
  const first = rows[0];
  const second = rows[1];
  const firstLooksTextual = first.every((cell) => !isCalculatedCell(cell));
  const laterCalculated = second.filter((cell) => isCalculatedCell(cell)).length;
  return firstLooksTextual && laterCalculated >= Math.max(1, Math.floor(second.length / 2));
};

const normalizeCell = (value: string): string =>
  value
    .replace(/\r?\n/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .trim();

export function normalizePastedTable(
  html: string,
  text: string,
  tableName = "Pasted data"
): TabularPasteResult | null {
  const htmlTable = extractHtmlTable(html);
  const rows = htmlTable?.rows || extractTextTable(text);
  if (!rows || rows.length < 2) return null;
  const width = rows[0]?.length || 0;
  if (width < 2 || width > 40 || rows.some((row) => row.length !== width)) return null;

  const hasHeader = htmlTable?.hasHeader || inferHeader(rows);
  const headers = hasHeader
    ? rows[0].map((cell, index) => normalizeCell(cell) || `column ${index + 1}`)
    : rows[0].map((_cell, index) => `column ${index + 1}`);
  const dataRows = hasHeader ? rows.slice(1) : rows;
  if (dataRows.length > 500) return null;

  const duplicateHeaders = new Set<string>();
  const uniqueHeaders = headers.map((header) => {
    const base = header.replace(/\s+/g, " ").trim();
    let candidate = base;
    let suffix = 2;
    while (duplicateHeaders.has(candidate.toLowerCase())) {
      candidate = `${base} ${suffix}`;
      suffix += 1;
    }
    duplicateHeaders.add(candidate.toLowerCase());
    return candidate;
  });

  const canonical = [
    `${tableName}:`,
    `  ${uniqueHeaders.join(" | ")}`,
    ...dataRows.map((row) => `  ${row.map(normalizeCell).join(" | ")}`),
  ].join("\n");
  return { canonical, columns: width, rows: dataRows.length };
}

export function isLikelySharedLiveExpressionSource(line: string): boolean {
  const trimmed = (line || "").trim();
  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("@") || trimmed.includes("=>")) {
    return false;
  }

  const candidate = parseLine(`${trimmed} =>`, 1);
  if (candidate.type === "variableAssignment" || candidate.type === "combinedAssignment") {
    return false;
  }

  const hasDigit = /\d/.test(trimmed);
  const hasOperator = /[=+\-*/^]|\.{2}/.test(trimmed);
  const hasFunctionCall = /\b[a-zA-Z_][a-zA-Z0-9_ ]*\(/.test(trimmed);
  const hasMathKeyword = /\b(to|in|on|off|of|as)\b/i.test(trimmed) && hasDigit;

  if (!hasOperator && !hasFunctionCall && !hasMathKeyword) {
    return false;
  }

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
  const assignmentMatch = trimmedExpression.match(/^(.+?)\s=\s(.+)$/);
  if (assignmentMatch && assignmentMatch[2]?.trim() === marker) {
    return trimmedExpression;
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
