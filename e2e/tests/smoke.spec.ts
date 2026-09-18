import { expect, test } from "@playwright/test";

test("smoke: login renderiza", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText(/iniciar sesi/i)).toBeVisible();
});
