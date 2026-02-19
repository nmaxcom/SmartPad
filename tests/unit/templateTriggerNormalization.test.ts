import { normalizeTemplateTriggers } from "../../src/components/VariablePanel/templateTriggerNormalization";

describe("normalizeTemplateTriggers", () => {
  test("removes optional trigger lines and inline expected outputs", () => {
    const content = "3*4 => 12\n4lb to kg => 1.81 kg";
    expect(normalizeTemplateTriggers("live-result-playground", content)).toBe("3*4\n4lb to kg");
  });

  test("keeps explicit trigger lines needed for error surfacing", () => {
    const content = "sum(mix) => ⚠️ Cannot sum incompatible units";
    expect(normalizeTemplateTriggers("list-spec", content)).toBe(
      "sum(mix) => ⚠️ Cannot sum incompatible units"
    );
  });

  test("keeps explicit solve trigger lines", () => {
    const content = "solve x + 2 = 5 =>";
    expect(normalizeTemplateTriggers("live-result-playground", content)).toBe("solve x + 2 = 5 =>");
  });

  test("keeps template-specific required trigger lines", () => {
    const liveContent = "unknownVar + 1 =>\n3*4 =>";
    expect(normalizeTemplateTriggers("live-result-playground", liveContent)).toBe(
      "unknownVar + 1 =>\n3*4"
    );

    const resultChipContent = "subtotal = 120 =>\ntax = subtotal * 0.15 =>";
    expect(normalizeTemplateTriggers("result-chip-graph", resultChipContent)).toBe(
      "subtotal = 120 =>\ntax = subtotal * 0.15"
    );
  });

  test("leaves comments unchanged", () => {
    const content = "# no => for this section\n# 01/02/2023..05/02/2023 step 1 day =>";
    expect(normalizeTemplateTriggers("regression-pass", content)).toBe(content);
  });
});
