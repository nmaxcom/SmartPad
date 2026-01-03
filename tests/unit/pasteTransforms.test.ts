import { normalizePastedHTML } from "../../src/components/pasteTransforms";

describe("normalizePastedHTML", () => {
  test("converts pre blocks into paragraphs", () => {
    const html = "<pre>sqrt(36) + 2 =>\n10% of 100 =></pre>";
    const result = normalizePastedHTML(html);

    expect(result).not.toContain("<pre");
    expect(result).toContain("<p>sqrt(36) + 2 =&gt;</p>");
    expect(result).toContain("<p>10% of 100 =&gt;</p>");
  });

  test("converts pre/code blocks into paragraphs", () => {
    const html = '<pre><code class="language-markdown">1day to s=&gt;</code></pre>';
    const result = normalizePastedHTML(html);

    expect(result).not.toContain("<pre");
    expect(result).not.toContain("<code");
    expect(result).toContain("<p>1day to s=&gt;</p>");
  });

  test("leaves non-pre content intact", () => {
    const html = "<p>hello</p>";
    const result = normalizePastedHTML(html);

    expect(result).toBe(html);
  });
});
