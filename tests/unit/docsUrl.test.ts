import { buildDocsUrl } from "../../src/components/Layout/docsUrl";

describe("buildDocsUrl", () => {
  test("returns docs index for root base", () => {
    expect(buildDocsUrl("/")).toBe("/docs/index.html");
  });

  test("handles base with trailing slash", () => {
    expect(buildDocsUrl("/SmartPad/")).toBe("/SmartPad/docs/index.html");
  });

  test("handles base without trailing slash", () => {
    expect(buildDocsUrl("/SmartPad")).toBe("/SmartPad/docs/index.html");
  });

  test("falls back to root for empty base", () => {
    expect(buildDocsUrl("")).toBe("/docs/index.html");
  });
});
