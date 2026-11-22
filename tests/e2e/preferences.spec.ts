import { expect, test } from "./account-fixture";

test("onboarding clears a rejected key and supports a local session", async ({
  page,
  context,
}) => {
  await page.goto("/onboarding");
  const key = page.getByLabel("API-ключ", { exact: true });
  await key.fill("short");
  await page.getByRole("button", { name: "Подключить и продолжить" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Проверьте",
  );
  await expect(key).toHaveValue("");
  expect(page.url()).not.toContain("short");
  await page.getByRole("button", { name: "Продолжить без AI" }).click();
  await expect(page).toHaveURL(/\/$/);
  const cookies = await context.cookies();
  expect(
    cookies.some(
      (cookie) =>
        cookie.httpOnly &&
        cookie.sameSite === "Strict" &&
        cookie.expires === -1,
    ),
  ).toBe(true);
  expect(await (await page.request.get("/api/session")).json()).toEqual({
    status: "offline",
  });
});

test("profile and appearance persist after a reload", async ({ page }) => {
  await page.goto("/onboarding?next=settings");
  await page.getByRole("button", { name: "Продолжить без AI" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  const name = page.getByLabel("Имя", { exact: true });
  const minutes = page.getByLabel("Минут в день");
  const original = {
    displayName: await name.inputValue(),
    dailyMinutes: Number(await minutes.inputValue()),
    theme: await page.locator("html").getAttribute("data-theme"),
  };
  try {
    await name.fill("Тестовый профиль");
    await minutes.fill("55");
    await page.getByText("Тёмная", { exact: true }).click();
    await page.getByRole("button", { name: "Сохранить настройки" }).click();
    await expect(page.getByText("Настройки сохранены.")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(name).toHaveValue("Тестовый профиль");
    await expect(minutes).toHaveValue("55");
    await expect(page.getByRole("radio", { name: "Тёмная" })).toBeChecked();
    await page.getByText("Светлая", { exact: true }).click();
    await page.getByRole("button", { name: "Сохранить настройки" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  } finally {
    const origin = new URL(page.url()).origin;
    const restore = await page.request.post("/api/settings", {
      headers: { origin },
      data: original,
    });
    expect(restore.status()).toBe(200);
  }
});

test("library filters materials and opens the original reading passage", async ({
  page,
}) => {
  await page.goto("/settings/library");
  const filters = page.getByRole("navigation", { name: "Материалы по навыку" });
  await filters.getByRole("link", { name: "Listening", exact: true }).click();
  await expect(
    filters.getByRole("link", { name: "Listening", exact: true }),
  ).toBeVisible();
  await filters.getByRole("link", { name: "Reading", exact: true }).click();
  await page.getByRole("link", { name: /A Cooler Station/ }).click();
  await expect(
    page.getByRole("heading", { name: "A Cooler Station" }),
  ).toBeVisible();
  await expect(
    page.getByText("The sensors collected readings every quarter of an hour."),
  ).toBeVisible();
});
