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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
