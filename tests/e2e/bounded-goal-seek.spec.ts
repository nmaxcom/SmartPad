import { expect, test } from "@playwright/test";
import {
  setEditorText,
  waitForEditorReady,
  waitForUIRenderComplete,
} from "./utils";

const baseModel = [
  "keep rate = 78%",
  "gross = 3000 EUR",
  "take home = gross * keep rate =>",
].join("\n");

test.describe("Bounded Goal Seek", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForEditorReady(page);
  });

  test("discovers editable limits inside the result menu and reports feasibility", async ({
    page,
  }) => {
    await setEditorText(page, baseModel);

    const variablePanel = page.getByTestId("variable-panel");
    await expect(
      variablePanel.getByRole("button", { name: /target|limit/i }),
    ).toHaveCount(0);

    const resultLine = page
      .locator(".ProseMirror p")
      .filter({ hasText: "take home = gross" })
      .first();
    const resultChip = resultLine.locator(".semantic-result-display").first();
    await resultChip.hover();
    await resultChip.locator(".semantic-result-menu").click();

    const menu = page.getByRole("menu", { name: /Actions for result/ });
    const boundedAction = menu.getByRole("menuitem", {
      name: "Find gross within limits…",
    });
    await expect(
      menu.getByRole("menuitem", { name: /within limits…$/ }),
    ).toHaveCount(1);
    await expect(boundedAction).toBeEnabled();
    await expect(boundedAction).toHaveAttribute(
      "title",
      "Insert an editable target line with starting limits around the current gross",
    );
    await boundedAction.click();
    await waitForUIRenderComplete(page);

    const insertedLine = page.locator(".ProseMirror p").nth(3);
    await expect(insertedLine).toContainText("make take home = 2340 EUR by gross");
    await expect(insertedLine).toContainText("1500 EUR <= gross <= 4500 EUR =>");
    await expect(insertedLine.locator(".semantic-result-display")).toContainText(
      /3,?000 EUR/,
    );

    await setEditorText(
      page,
      `${baseModel}\nmake take home = 4000 EUR by gross with 3000 EUR <= gross <= 6000 EUR =>`,
    );
    const feasibleLine = page.locator(".ProseMirror p").nth(3);
    await expect(feasibleLine.locator(".semantic-result-display")).toContainText(
      /5,?128\.21 EUR/,
    );
    await expect(page.locator(".semantic-error-result")).toHaveCount(0);

    await setEditorText(
      page,
      `${baseModel}\nmake take home = 4000 EUR by gross with gross <= 5000 EUR =>`,
    );
    const infeasibleLine = page.locator(".ProseMirror p").nth(3);
    await expect(infeasibleLine.locator(".semantic-error-result")).toContainText(
      "No feasible solution within limits",
    );
    await expect(infeasibleLine.locator(".semantic-error-result")).toContainText(
      /above the maximum 5,?000 EUR/,
    );
  });
});
