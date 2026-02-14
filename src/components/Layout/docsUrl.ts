export function buildDocsUrl(baseUrl: string): string {
  const safeBase = baseUrl && baseUrl.trim() ? baseUrl.trim() : "/";
  const normalizedBase = safeBase.endsWith("/") ? safeBase : `${safeBase}/`;
  return `${normalizedBase}docs/index.html`;
}
