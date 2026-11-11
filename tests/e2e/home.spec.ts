import { test, expect } from "@playwright/test";

test("home page displays title and navigation buttons", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("h1")).toHaveText("Study");
  await expect(page.locator("text=問題を作る")).toBeVisible();
  await expect(page.locator("text=問題を解く")).toBeVisible();
  await expect(page.locator("h2:has-text('統計')")).toBeVisible();
  await expect(page.locator("text=問題数")).toBeVisible();
  await expect(page.locator("text=本日の解答数")).toBeVisible();
  await expect(page.locator("text=本日の正答率")).toBeVisible();
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

  // Deterministic check: either it's enabled (can click and navigate) or disabled (has pointer-events-none)
  const isEnabled = !(await answerButton.evaluate((el) =>
    el.classList.contains("pointer-events-none"),
  ));
  if (isEnabled) {
    await answerButton.click();
    await expect(page).toHaveURL(/\/answer/);
  } else {
    await expect(answerButton).toHaveClass(/pointer-events-none/);
  }
});
