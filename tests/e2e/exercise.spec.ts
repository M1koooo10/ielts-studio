import {test,expect} from "./account-fixture";
test("a signed-in learner saves, resumes, submits, reviews and logs out",async({page})=>{
 await page.goto("/settings/library/a-cooler-station");await page.getByRole("button",{name:"Начать или продолжить"}).click();
 await expect(page).toHaveURL(/\/exercise\/\d+$/);const view=page.locator(".exercise-answers");
 await view.locator("select").nth(0).selectOption("TRUE");await view.locator("select").nth(1).selectOption("FALSE");await view.locator("input").fill("new benches");
 await page.getByRole("button",{name:"Сохранить",exact:true}).click();await expect(view.getByText("Черновик сохранён.")).toBeVisible();
 await page.reload();await expect(page.locator(".exercise-answers input")).toHaveValue("new benches");
 await page.getByRole("button",{name:"Завершить занятие"}).click();await expect(page.getByText("3 / 3")).toBeVisible();await page.reload();await expect(page.locator(".exercise-answers input")).toBeDisabled();
 await page.goto("/settings");await page.getByRole("button",{name:"Выйти из аккаунта"}).click();await expect(page).toHaveURL(/\/welcome$/);expect((await page.request.get("/api/session")).status()).toBe(401)
});
