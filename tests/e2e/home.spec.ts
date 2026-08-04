import { test, expect } from "@playwright/test";

test("home page displays title and textarea", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("h1")).toHaveText("Study - Quiz Generator");
  await expect(page.locator("textarea#source-text")).toBeVisible();
  await expect(page.locator("button[type='submit']")).toBeVisible();
});
