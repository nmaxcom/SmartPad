import { calculateAutocompleteMenuPosition } from "../../src/components/autocomplete/AutocompleteExtension";

describe("autocomplete menu positioning", () => {
  test("places the menu below a caret when it fits", () => {
    expect(
      calculateAutocompleteMenuPosition({
        anchor: { top: 100, bottom: 124, left: 80 },
        menu: { width: 320, height: 248 },
        viewportWidth: 900,
        viewportHeight: 700,
      }),
    ).toEqual({ left: 80, top: 132, placement: "below" });
  });

  test("places the menu above a low caret", () => {
    expect(
      calculateAutocompleteMenuPosition({
        anchor: { top: 620, bottom: 644, left: 80 },
        menu: { width: 320, height: 248 },
        viewportWidth: 900,
        viewportHeight: 700,
      }),
    ).toEqual({ left: 80, top: 364, placement: "above" });
  });

  test("keeps the menu anchored when the caret moves during scrolling", () => {
    const before = calculateAutocompleteMenuPosition({
      anchor: { top: 300, bottom: 324, left: 80 },
      menu: { width: 320, height: 180 },
      viewportWidth: 900,
      viewportHeight: 700,
    });
    const after = calculateAutocompleteMenuPosition({
      anchor: { top: 240, bottom: 264, left: 80 },
      menu: { width: 320, height: 180 },
      viewportWidth: 900,
      viewportHeight: 700,
    });

    expect(after.top - before.top).toBe(-60);
  });
});
