const {
  deriveShortTitle,
  extractTitle,
  humanizeFileStem,
  pickExamples,
} = require("../../scripts/generate-web-docs.js");

describe("generate-web-docs helpers", () => {
  test("falls back to humanized file stem when no headings exist", () => {
    const title = extractTitle("plain body text", "FileManagement.spec.md");
    expect(title).toBe("File Management");
  });

  test("uses humanized stem when no top-level heading exists", () => {
    const content = ["No title paragraph", "", "## 1. Objective", "Details"].join("\n");
    const title = extractTitle(content, "duration.spec.md");
    expect(title).toBe("Duration");
  });

  test("removes smartpad prefix and leading punctuation from short title", () => {
    expect(deriveShortTitle("Smartpad — Interactive Dependency Views (Plotting & Exploration)")).toBe(
      "Interactive Dependency Views (Plotting & Exploration)"
    );
  });

  test("picks positive and edge-case examples from code blocks", () => {
    const examples = pickExamples(["a = 1\na => 1", "x => ⚠️ bad input"]);
    expect(examples.positive).toContain("a => 1");
    expect(examples.edgeCase).toContain("⚠️");
  });

  test("humanizes camel-case stems", () => {
    expect(humanizeFileStem("ResultChipsAndValueGraph")).toBe("Result Chips And Value Graph");
  });
});
