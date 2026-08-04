import { test, expect } from "@playwright/test";

test("create page displays textarea and submit button", async ({ page }) => {
  await page.goto("/create");

  await expect(page.locator("h1")).toHaveText("問題を作成");
  await expect(page.locator("textarea")).toBeVisible();
  await expect(page.locator("button", { hasText: "この内容から1問作る" })).toBeVisible();
  await expect(page.locator("button", { hasText: "この内容から1問作る" })).toBeDisabled();
});

test("create page form submission and post-creation navigation", async ({ page }) => {
  // Mock POST /api/questions to return a sample question
  await page.route("**/api/questions", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: 1,
          question: "テスト問題です。",
          choices: ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
          correctIndex: 0,
          explanation: "テストの解説です。",
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.goto("/create");
  await page.locator("textarea").fill("テスト用のナレッジです。");
  await expect(page.locator("button", { hasText: "この内容から1問作る" })).not.toBeDisabled();

  await page.locator("button", { hasText: "この内容から1問作る" }).click();

  // Check generated question display
  await expect(page.locator("h2", { hasText: "テスト問題です。" })).toBeVisible();
  await expect(page.locator("text=解説: テストの解説です。")).toBeVisible();

  // Check post-creation buttons
  await expect(page.locator("button", { hasText: "続けてもう1問作る" })).toBeVisible();
  await expect(page.locator("button", { hasText: "問題を解きに行く" })).toBeVisible();
  await expect(page.locator("button", { hasText: "ホームへ" })).toBeVisible();

  // Test "問題を解きに行く"
  await page.locator("button", { hasText: "問題を解きに行く" }).click();
  await expect(page).toHaveURL("/answer");
});

test("create page error handling when API returns error", async ({ page }) => {
  await page.route("**/api/questions", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Server error" }),
      });
    } else {
      await route.continue();
    }
  });

  await page.goto("/create");
  await page.locator("textarea").fill("エラーテスト用ナレッジ");
  await page.locator("button", { hasText: "この内容から1問作る" }).click();

  await expect(page.locator("text=生成に失敗しました")).toBeVisible();
});
