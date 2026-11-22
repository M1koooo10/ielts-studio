import { test, expect } from "./account-fixture";

test("dashboard opens an offline session and navigates the desktop workspace", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Обзор, Ученик" }),
  ).toBeVisible();
  await expect(page.locator(".chart .recharts-line-curve")).toHaveCount(1);
  await page.screenshot({ path: test.info().outputPath("desktop.png") });

  await expect(
    page.getByRole("link", { name: "Перейти к практике" }),
  ).toBeVisible();
  await page.getByLabel("Период активности").selectOption("30");
  await expect(
    page.getByRole("img", { name: /Активность за 30 дней/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Listening Аудирование" }).click();
  await expect(
    page.getByRole("heading", { name: "Банк заданий" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Свернуть меню" }).click();
  await expect(
    page.getByRole("button", { name: "Развернуть меню" }),
  ).toBeVisible();
  for (const [route, title] of [
    ["study-plan", "Учебный план"],
    ["practice", "Практика"],
    ["practice/reading", "Reading"],
    ["practice/writing", "Writing"],
    ["practice/speaking", "Speaking"],
    ["mock-tests", "Пробные тесты"],
    ["grammar", "Grammar Lab"],
    ["ai-tutor", "AI Tutor"],
    ["vocabulary", "Словарь"],
    ["arcade", "Аркада"],
    ["analytics", "Аналитика"],
    ["mistakes", "Работа над ошибками"],
  ]) {
    expect((await page.goto("/" + route))?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { level: 1, name: title }),
    ).toBeVisible();
  }
  expect((await page.goto("/unknown-section"))?.status()).toBe(404);
});

test("mobile drawer opens, moves focus and navigates without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("navigation", { name: "Быстрая навигация" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({ path: test.info().outputPath("mobile.png") });
  await page.getByRole("button", { name: "Меню", exact: true }).click();
  const menu = page.getByRole("dialog");
  await expect(menu).toBeVisible();
  await menu.getByRole("link", { name: "Словарь" }).click();
  await expect(
    page.getByRole("heading", { name: "Словарь", exact: true }),
  ).toBeVisible();
  await expect(menu).toHaveCount(0);
});
