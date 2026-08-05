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

test("answer page displays question, choices, score header, and handles interaction", async ({
  page,
}) => {
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
  await expect(
    page.locator("text=TypeScriptのデフォルトの挙動ではないものはどれか？"),
  ).toBeVisible();

  // Check 4 choice buttons
  const choiceButtons = page.locator("main button");
  await expect(choiceButtons).toHaveCount(4);

  // Click a choice
  await choiceButtons.nth(1).click();

  // Check feedback and score update
  await expect(page.locator("header", { hasText: "正解 1 / 1" })).toBeVisible();
  await expect(page.locator("text=解説: TypeScriptは静的型付け言語です。")).toBeVisible({
    timeout: 15000,
  });
  await expect(page.locator("button", { hasText: "次の問題へ" })).toBeVisible();
});

test("Test A: incorrect answer shows 不正解 banner, wrong-choice mark, and correct-choice mark", async ({
  page,
}) => {
  const sampleQuestion = {
    id: 1,
    question: "次のうちどれが誤っているか？",
    choices: ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
    correctIndex: 1,
  };

  const sampleAnswerResult = {
    isCorrect: false,
    correctIndex: 1,
    explanation: "正解は選択肢Bです。",
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

  await expect(page.locator("header", { hasText: "正解 0 / 0" })).toBeVisible({ timeout: 15000 });

  const choiceButtons = page.locator("main button");
  await expect(choiceButtons).toHaveCount(4);

  // Click choice "選択肢A" (which is incorrect since correctIndex is 1, i.e., "選択肢B")
  await page.locator("button", { hasText: "選択肢A" }).click();

  // Assertions
  await expect(page.locator("text=不正解")).toBeVisible();
  await expect(page.locator("header", { hasText: "正解 0 / 1" })).toBeVisible();
  await expect(page.locator("text=解説: 正解は選択肢Bです。")).toBeVisible();

  // Correct choice ("選択肢B") should show ✓ mark, wrong choice ("選択肢A") should show ✗ mark
  await expect(page.locator("button", { hasText: "選択肢B" })).toContainText("✓");
  await expect(page.locator("button", { hasText: "選択肢A" })).toContainText("✗");
  await expect(page.locator("button", { hasText: "次の問題へ" })).toBeVisible();
});

test("Test B: feedback does NOT disappear (no auto-refetch after grading)", async ({ page }) => {
  const sampleQuestion = {
    id: 1,
    question: "リフレッシュテストの質問",
    choices: ["A", "B", "C", "D"],
    correctIndex: 0,
  };

  const sampleAnswerResult = {
    isCorrect: true,
    correctIndex: 0,
    explanation: "正解です",
  };

  let randomCallCount = 0;

  await page.route("/api/questions/random*", async (route) => {
    randomCallCount++;
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

  await expect(page.locator("text=リフレッシュテストの質問")).toBeVisible({ timeout: 15000 });
  expect(randomCallCount).toBe(1);

  const choiceButtons = page.locator("main button");
  await choiceButtons.nth(0).click();

  // Assert "正解！" banner is visible and question text is still the same
  await expect(page.locator("text=正解！")).toBeVisible();
  await expect(page.locator("text=リフレッシュテストの質問")).toBeVisible();

  // Wait a bit to ensure no auto-refetch happened
  await page.waitForTimeout(1000);
  expect(randomCallCount).toBe(1);

  await expect(page.locator("button", { hasText: "次の問題へ" })).toBeVisible();
});

test("Test C: next question only loads when 次の問題へ is clicked", async ({ page }) => {
  const question1 = {
    id: 1,
    question: "質問1",
    choices: ["A1", "B1", "C1", "D1"],
    correctIndex: 0,
  };

  const question2 = {
    id: 2,
    question: "質問2",
    choices: ["A2", "B2", "C2", "D2"],
    correctIndex: 0,
  };

  const sampleAnswerResult = {
    isCorrect: true,
    correctIndex: 0,
    explanation: "解説1",
  };

  let callCount = 0;
  await page.route("/api/questions/random*", async (route) => {
    callCount++;
    const q = callCount === 1 ? question1 : question2;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(q),
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

  await expect(page.locator("text=質問1")).toBeVisible({ timeout: 15000 });
  expect(callCount).toBe(1);

  const choiceButtons = page.locator("main button");
  await choiceButtons.nth(0).click();

  await expect(page.locator("text=正解！")).toBeVisible();
  await expect(page.locator("text=質問1")).toBeVisible();
  expect(callCount).toBe(1);

  // Click "次の問題へ"
  await page.locator("button", { hasText: "次の問題へ" }).click();

  // Question 2 should appear
  await expect(page.locator("text=質問2")).toBeVisible({ timeout: 15000 });
  expect(callCount).toBe(2);
});

test("Test D: submitting state shows busy button and disables others", async ({ page }) => {
  const sampleQuestion = {
    id: 1,
    question: "サブミッティングテストの質問",
    choices: ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
    correctIndex: 0,
  };

  await page.route("/api/questions/random*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(sampleQuestion),
    });
  });

  await page.route("/api/answers", async (route) => {
    await new Promise((r) => setTimeout(r, 500));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ isCorrect: true, correctIndex: 0, explanation: "解説です" }),
    });
  });

  await page.goto("/answer");

  await expect(page.locator("text=サブミッティングテストの質問")).toBeVisible({ timeout: 15000 });

  const choiceButtons = page.locator("main button");
  await expect(choiceButtons).toHaveCount(4);

  // Click choice 0
  await choiceButtons.nth(0).click();

  // Immediately assert (before the 500ms elapses)
  await expect(choiceButtons.nth(0)).toHaveAttribute("aria-busy", "true");
  await expect(choiceButtons.nth(1)).toBeDisabled();
  await expect(choiceButtons.nth(2)).toBeDisabled();
  await expect(choiceButtons.nth(3)).toBeDisabled();
  await expect(page.locator("text=サブミッティングテストの質問")).toBeVisible();

  // Wait for the response and assert the 正解！ banner appears
  await expect(page.locator("text=正解！")).toBeVisible({ timeout: 15000 });
});

test("Test E: 次の問題へ shows loading and prevents double-fetch", async ({ page }) => {
  const question1 = {
    id: 1,
    question: "質問1",
    choices: ["A1", "B1", "C1", "D1"],
    correctIndex: 0,
  };
  const question2 = {
    id: 2,
    question: "質問2",
    choices: ["A2", "B2", "C2", "D2"],
    correctIndex: 0,
  };
  const sampleAnswerResult = { isCorrect: true, correctIndex: 0, explanation: "解説1" };

  let randomCallCount = 0;
  await page.route("/api/questions/random*", async (route) => {
    randomCallCount++;
    const q = randomCallCount === 1 ? question1 : question2;
    await new Promise((r) => setTimeout(r, 400));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(q) });
  });
  await page.route("/api/answers", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(sampleAnswerResult),
    });
  });

  await page.goto("/answer");
  await expect(page.locator("text=質問1")).toBeVisible({ timeout: 15000 });
  expect(randomCallCount).toBe(1);

  await page.locator("main button").nth(0).click();
  await expect(page.locator("text=正解！")).toBeVisible();

  const nextBtn = page.locator("button", { hasText: "次の問題へ" });
  await nextBtn.click();

  // Button enters loading state while fetching the next question
  await expect(nextBtn).toHaveAttribute("aria-busy", "true");
  await expect(nextBtn).toBeDisabled();

  // A second click while disabled must not trigger another fetch
  await nextBtn.click({ force: true }).catch(() => {});

  await expect(page.locator("text=質問2")).toBeVisible({ timeout: 15000 });
  expect(randomCallCount).toBe(2);
});

test("Test F: 再試行 shows loading and prevents double-fetch", async ({ page }) => {
  const sampleQuestion = {
    id: 1,
    question: "再試行テストの質問",
    choices: ["A", "B", "C", "D"],
    correctIndex: 0,
  };

  let randomCallCount = 0;
  await page.route("/api/questions/random*", async (route) => {
    randomCallCount++;
    if (randomCallCount === 1) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Server error" }),
      });
    } else {
      await new Promise((r) => setTimeout(r, 400));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(sampleQuestion),
      });
    }
  });

  await page.goto("/answer");
  await expect(page.locator("button", { hasText: "再試行" })).toBeVisible({ timeout: 15000 });
  expect(randomCallCount).toBe(1);

  const retryBtn = page.locator("button", { hasText: "再試行" });
  await retryBtn.click();

  await expect(retryBtn).toHaveAttribute("aria-busy", "true");
  await expect(retryBtn).toBeDisabled();

  await retryBtn.click({ force: true }).catch(() => {});

  await expect(page.locator("text=再試行テストの質問")).toBeVisible({ timeout: 15000 });
  expect(randomCallCount).toBe(2);
});
