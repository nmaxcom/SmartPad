export function normalizePastedHTML(html: string): string {
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const preBlocks = doc.querySelectorAll("pre");
    preBlocks.forEach((pre) => {
      const text = pre.textContent || "";
      const lines = text.replace(/\r\n?/g, "\n").split("\n");
      const fragment = doc.createDocumentFragment();
      lines.forEach((line) => {
        const p = doc.createElement("p");
        p.textContent = line;
        fragment.appendChild(p);
      });
      pre.replaceWith(fragment);
    });
    return doc.body.innerHTML;
  } catch {
    return html;
  }
}
