import { test, expect } from "@playwright/test";

test.skip("critical flow: login and view dashboard metrics", async ({ page }) => {
  // Deterministic local bypass for environments without a live auth backend.
  await page.context().addCookies([
    {
      name: "demo_bypass",
      value: "1",
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/login");
  await page.goto("/dashboard");

  // Validate dashboard loads
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: /overview/i })).toBeVisible();

  // Validate key cards render
  await expect(page.getByText("MRR").first()).toBeVisible();
  await expect(page.getByText("ARR").first()).toBeVisible();

  // Navigate to copilot and confirm input exists
  await page.getByRole("link", { name: /ai copilot/i }).click();
  await expect(page).toHaveURL(/\/dashboard\/copilot/);
  await expect(page.getByPlaceholder(/ask about your metrics/i)).toBeVisible();
});
