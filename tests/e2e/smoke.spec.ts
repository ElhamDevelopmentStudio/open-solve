import { test, expect } from "@playwright/test";

const runE2E = process.env.RUN_E2E === "true";

const describeFn = runE2E ? test.describe : test.describe.skip;

describeFn("marketing smoke", () => {
  test("landing page renders", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /OpenSolve/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Get started/i })).toBeVisible();
  });
});
