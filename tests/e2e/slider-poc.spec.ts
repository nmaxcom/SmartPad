// Slider POC (disabled)
// Product decision: not pursuing slider widgets at this time.
// Keeping a minimal, skipped suite to document the decision without failing CI.

import { test } from "@playwright/test";

test.describe("Slider POC (disabled)", () => {
  test("skipped: feature not pursued currently", async () => {
    test.skip(true, "Slider POC removed per product decision");
  });
});
