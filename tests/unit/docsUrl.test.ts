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

  test("uses explicit absolute docs URL override", () => {
    expect(buildDocsUrl("/SmartPad/", "https://docs.smartpad.app")).toBe("https://docs.smartpad.app");
  });

  test("uses explicit root-relative docs URL override", () => {
    expect(buildDocsUrl("/SmartPad/", "/help")).toBe("/help");
  });
});
