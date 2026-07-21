import {
  isLikelySharedLiveExpressionSource,
  normalizePastedHTML,
  normalizePastedTable,
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

describe("normalizePastedTable", () => {
  test("turns spreadsheet TSV into canonical SmartPad text", () => {
    const result = normalizePastedTable(
      "",
      "item\tqty\tprice\nA\t12\t9 EUR\nB\t5\t14 EUR",
      "Orders"
    );
    expect(result).toEqual({
      canonical:
        "Orders:\n  item | qty | price\n  A | 12 | 9 EUR\n  B | 5 | 14 EUR",
      columns: 3,
      rows: 2,
    });
  });

  test("uses HTML headers and preserves cell text", () => {
    const result = normalizePastedTable(
      "<table><tr><th>City</th><th>Sales</th></tr><tr><td>New York</td><td>120 EUR</td></tr></table>",
      "City\tSales\nNew York\t120 EUR",
      "Campaigns"
    );
    expect(result?.canonical).toBe(
      "Campaigns:\n  City | Sales\n  New York | 120 EUR"
    );
  });

  test("creates headers for headerless numeric data", () => {
    const result = normalizePastedTable("", "1,2\n3,4", "Data");
    expect(result?.canonical).toBe(
      "Data:\n  column 1 | column 2\n  1 | 2\n  3 | 4"
    );
  });

  test("does not reinterpret ordinary comma prose as a table", () => {
    expect(normalizePastedTable("", "Hello, world", "Data")).toBeNull();
  });
});

describe("stripSharedLiveResultSuffixes", () => {
  test("strips trailing shared live-result suffixes from likely expression lines", () => {
    const pasted = "known = 5\nknown*3 (15)\n2+2=> 4";

    expect(stripSharedLiveResultSuffixes(pasted)).toBe("known = 5\nknown*3\n2+2=> 4");
  });

  test("keeps numeric assignment-line suffixes unchanged", () => {
    expect(stripSharedLiveResultSuffixes("total = 20*2 (40)")).toBe("total = 20*2 (40)");
  });

  test("strips duplicated assignment source suffixes from live copy text", () => {
    expect(stripSharedLiveResultSuffixes("ticket after promo = promo off ticket list (promo off ticket list)")).toBe(
      "ticket after promo = promo off ticket list"
    );
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
  });

  test("ignores assignment lines", () => {
    expect(isLikelySharedLiveExpressionSource("total = price*qty")).toBe(false);
  });

  test("ignores plain prose", () => {
    expect(isLikelySharedLiveExpressionSource("meeting notes")).toBe(false);
    expect(isLikelySharedLiveExpressionSource("# comment")).toBe(false);
  });
});
