function isHttpUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

export function buildDocsUrl(baseUrl: string, explicitDocsUrl?: string): string {
  const explicit = explicitDocsUrl?.trim();
  if (explicit) {
    if (isHttpUrl(explicit) || explicit.startsWith("/")) {
      return explicit;
    }
    return `/${explicit.replace(/^\/+/, "")}`;
  }

  const safeBase = baseUrl && baseUrl.trim() ? baseUrl.trim() : "/";
  const normalizedBase = safeBase.endsWith("/") ? safeBase : `${safeBase}/`;
  return `${normalizedBase}docs/index.html`;
}
