import { test, expect } from "@playwright/test";

test("answer page empty state when no questions available", async ({ page }) => {
  await page.route("/api/questions/random*", async (route) => {
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: "No questions found" }),
    });
  });

  await page.goto("/answer");
  // Real DOM check after fetch finishes
  await expect(page.locator("text=問題がまだありません。")).toBeVisible({ timeout: 15000 });
  await expect(page.locator("text=問題作成へ")).toBeVisible();
});

test("answer page displays question, choices, score header, and handles interaction", async ({ page }) => {
  const sampleQuestion = {
    id: 1,
    question: "TypeScriptのデフォルトの挙動ではないものはどれか？",
    choices: ["静的型付け", "動的型付け", "型推論", "オプショナルチェイニング"],
    correctIndex: 1,
  };

  const sampleAnswerResult = {
    isCorrect: true,
    correctIndex: 1,
    explanation: "TypeScriptは静的型付け言語です。",
  };

  await page.route("/api/questions/random*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(sampleQuestion),
    });
  });

  await page.route("/api/answers", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(sampleAnswerResult),
    });
  });

  await page.goto("/answer");

  // Check score header and question
  await expect(page.locator("header", { hasText: "正解 0 / 0" })).toBeVisible({ timeout: 15000 });
  await expect(page.locator("text=TypeScriptのデフォルトの挙動ではないものはどれか？")).toBeVisible();

  // Check 4 choice buttons
  const choiceButtons = page.locator("main button");
  await expect(choiceButtons).toHaveCount(4);

  // Click a choice
  await choiceButtons.nth(1).click();

  // Check feedback and score update
  await expect(page.locator("header", { hasText: "正解 1 / 1" })).toBeVisible();
  await expect(page.locator("text=解説: TypeScriptは静的型付け言語です。")).toBeVisible({ timeout: 15000 });
  await expect(page.locator("button", { hasText: "次の問題へ" })).toBeVisible();
});
