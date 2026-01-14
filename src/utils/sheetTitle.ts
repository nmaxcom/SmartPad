export const DEFAULT_SHEET_TITLE = "Untitled";

export function deriveTitleFromContent(content: string): string {
  if (!content) return DEFAULT_SHEET_TITLE;

  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const headingMatch = trimmed.match(/^#\s+(.+)$/);
    if (headingMatch) {
      return headingMatch[1].trim() || DEFAULT_SHEET_TITLE;
    }
    return trimmed.slice(0, 20);
  }

  return DEFAULT_SHEET_TITLE;
}

export function applyTitleToContent(content: string, title: string): string {
  const normalizedTitle = title.trim() || DEFAULT_SHEET_TITLE;
  const normalized = content.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");

  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/^#\s+(.+)$/);
    if (match) {
      lines[i] = `# ${normalizedTitle}`;
      return lines.join("\n");
    }
  }

  if (!normalized.trim()) {
    return `# ${normalizedTitle}`;
  }

  return `# ${normalizedTitle}\n${normalized}`;
}
