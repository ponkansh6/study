import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("questions page displays heading", async ({ page }) => {
  await page.goto("/questions");
  await expect(page.locator("h1:has-text('問題一覧')")).toBeVisible();
});

test("questions page navigation from home works", async ({ page }) => {
  await page.goto("/");
  const link = page.locator("a[href='/questions']");
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL("/questions");
  await expect(page.locator("h1:has-text('問題一覧')")).toBeVisible();
});

test("questions page empty state or list display", async ({ page }) => {
  await page.goto("/questions");
  const isEmpty = await page.locator("text=問題がありません").isVisible();
  if (isEmpty) {
    await expect(page.locator("text=問題を作る")).toBeVisible();
    await page.locator("button", { hasText: "問題を作る" }).click();
    await expect(page).toHaveURL("/create");
  } else {
    await expect(page.locator("button", { hasText: /^削除$/ }).first()).toBeVisible();
  }
});

test("inline confirmation and cancel (non-destructive)", async ({ page }) => {
  await page.goto("/questions");
  const deleteBtn = page.locator("button", { hasText: /^削除$/ });
  const isEmpty = (await deleteBtn.count()) === 0;
  if (isEmpty) {
    test.skip(true, "No questions in DB to test deletion");
    return;
  }

  const firstBtn = deleteBtn.first();
  await firstBtn.click();
  await expect(page.locator("text=本当に削除しますか？")).toBeVisible();

  const cancelBtn = page.locator("button", { hasText: "キャンセル" });
  await cancelBtn.click();
  await expect(page.locator("text=本当に削除しますか？")).not.toBeVisible();
});

test("confirm and delete (destructive with mocked route)", async ({ page }) => {
  await page.goto("/questions");
  const deleteBtn = page.locator("button", { hasText: /^削除$/ });
  const isEmpty = (await deleteBtn.count()) === 0;
  if (isEmpty) {
    test.skip(true, "No questions in DB to test deletion");
    return;
  }

  await page.route("**/api/questions/*", async (route) => {
    if (route.request().method() === "DELETE") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    } else {
      await route.continue();
    }
  });

  const firstBtn = deleteBtn.first();
  await firstBtn.click();
  await expect(page.locator("text=本当に削除しますか？")).toBeVisible();

  const confirmDeleteBtn = page.locator("button", { hasText: "削除する" });
  await confirmDeleteBtn.click();

  await expect(page.locator("text=本当に削除しますか？")).not.toBeVisible();
});
