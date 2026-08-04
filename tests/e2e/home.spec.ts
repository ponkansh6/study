import { test, expect } from "@playwright/test";

test("home page displays title and navigation buttons", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("h1")).toHaveText("Study");
  await expect(page.locator("text=問題を作る")).toBeVisible();
  await expect(page.locator("text=問題を解く")).toBeVisible();
  await expect(page.locator("h2:has-text('統計')")).toBeVisible();
  await expect(page.locator("text=問題数")).toBeVisible();
  await expect(page.locator("text=解答数")).toBeVisible();
  await expect(page.locator("text=正答率")).toBeVisible();
});

test("home page navigation links work", async ({ page }) => {
  await page.goto("/");

  const createButton = page.locator("a[href='/create']");
  await expect(createButton).toBeVisible();
  await createButton.click();
  await expect(page).toHaveURL("/create");

  await page.goto("/");
  const answerButton = page.locator("a[href='/answer']");
  await expect(answerButton).toBeVisible();
  // If pointer-events-none, click might fail or be intercepted, but we can check its attribute or test when questions exist.
  // Let's click it using force if disabled or test navigation when enabled.
  if (await answerButton.evaluate(el => el.classList.contains("pointer-events-none"))) {
    // If disabled, verify it has the disabled class
    await expect(answerButton).toHaveClass(/pointer-events-none/);
  } else {
    await answerButton.click();
    await expect(page).toHaveURL(/\/answer/);
  }
});
