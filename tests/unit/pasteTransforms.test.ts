import {
  isLikelySharedLiveExpressionSource,
  normalizePastedHTML,
  selectPastePayload,
  stripSharedLiveResultSuffixes,
} from "../../src/components/pasteTransforms";

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

describe("selectPastePayload", () => {
  test("prefers plain text when markdown collapses multiline input", () => {
    const markdown = "# line 1 line 2 line 3";
    const text = "line 1\nline 2\nline 3";

    expect(selectPastePayload(markdown, text)).toBe(text);
  });

  test("keeps markdown when it already preserves line breaks", () => {
    const markdown = "# line 1\nline 2";
    const text = "line 1\nline 2";

    expect(selectPastePayload(markdown, text)).toBe(markdown);
  });
});

describe("stripSharedLiveResultSuffixes", () => {
  test("strips trailing shared live-result suffixes from likely expression lines", () => {
    const pasted = "known = 5\nknown*3 (15)\n2+2=> 4";

    expect(stripSharedLiveResultSuffixes(pasted)).toBe("known = 5\nknown*3\n2+2=> 4");
  });

  test("strips assignment-line shared suffixes", () => {
    expect(stripSharedLiveResultSuffixes("total = 20*2 (40)")).toBe("total = 20*2");
  });

  test("keeps plain text annotations unchanged", () => {
    expect(stripSharedLiveResultSuffixes("meeting notes (4)")).toBe("meeting notes (4)");
  });

  test("keeps suffixes with non-rendered values unchanged", () => {
    expect(stripSharedLiveResultSuffixes("known*3 (approx)")).toBe("known*3 (approx)");
  });
});

describe("isLikelySharedLiveExpressionSource", () => {
  test("identifies computational lines", () => {
    expect(isLikelySharedLiveExpressionSource("known*3")).toBe(true);
    expect(isLikelySharedLiveExpressionSource("total = price*qty")).toBe(true);
  });

  test("ignores plain prose", () => {
    expect(isLikelySharedLiveExpressionSource("meeting notes")).toBe(false);
    expect(isLikelySharedLiveExpressionSource("# comment")).toBe(false);
  });
});
