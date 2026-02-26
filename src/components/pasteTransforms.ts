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
