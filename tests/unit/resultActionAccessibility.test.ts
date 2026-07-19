import {
  buildGoalSeekActionLabel,
  buildReferenceChipAriaLabel,
  buildResultChipAriaLabel,
  resolveResultMenuFocusIndex,
} from "../../src/components/resultActionAccessibility";

describe("result action accessibility", () => {
  test("describes result and reference keyboard actions in human language", () => {
    expect(buildResultChipAriaLabel("2,500 EUR")).toBe(
      "Result: 2,500 EUR. Press Enter for actions; drag to reuse.",
    );
    expect(buildReferenceChipAriaLabel("2,500 EUR")).toBe(
      "Reference: 2,500 EUR. Press Enter to go to its source.",
    );
    expect(buildGoalSeekActionLabel("ticket price")).toBe(
      "Find ticket price for a target…",
    );
  });

  test("moves through enabled menu items with wrapping and endpoints", () => {
    expect(resolveResultMenuFocusIndex("ArrowDown", 0, 4)).toBe(1);
    expect(resolveResultMenuFocusIndex("ArrowDown", 3, 4)).toBe(0);
    expect(resolveResultMenuFocusIndex("ArrowUp", 0, 4)).toBe(3);
    expect(resolveResultMenuFocusIndex("ArrowUp", -1, 4)).toBe(3);
    expect(resolveResultMenuFocusIndex("Home", 2, 4)).toBe(0);
    expect(resolveResultMenuFocusIndex("End", 1, 4)).toBe(3);
    expect(resolveResultMenuFocusIndex("ArrowDown", 0, 0)).toBeNull();
  });
});
