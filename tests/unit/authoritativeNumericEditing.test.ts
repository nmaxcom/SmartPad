import { findAssignmentValueOffsets } from "../../src/interaction/authoritativeNumericEditing";

describe("authoritative numeric editing", () => {
  test("targets only the value of a direct variable assignment", () => {
    expect(findAssignmentValueOffsets("price = 50 EUR", "price")).toEqual({
      from: 8,
      to: 14,
      rawValue: "50 EUR",
    });
  });

  test("does not rewrite derived or unrelated lines", () => {
    expect(
      findAssignmentValueOffsets("profit = revenue - costs =>", "profit"),
    ).toBeNull();
    expect(findAssignmentValueOffsets("cost = 50 EUR", "price")).toBeNull();
  });
});
