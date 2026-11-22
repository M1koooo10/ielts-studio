import {test,expect} from "./account-fixture";

test("studies C2 words and completes the matching vocabulary test",async({page})=>{
  await page.goto("/vocabulary");
  await expect(page.getByRole("heading",{name:"Слова уровня A1"})).toBeVisible();
  await page.getByRole("link",{name:"C2",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Тест по словам · C2"})).toBeVisible();
  await expect(page.getByText("equivocal",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Начать тест"}).click();
  const quiz=page.locator("section").filter({has:page.getByRole("heading",{name:"Тест по словам · C2"})});
  for(let i=0;i<5;i++){
    await quiz.getByRole("button").first().click();
    await page.getByRole("button",{name:i===4?"Показать результат":"Следующее слово"}).click();
  }
  await expect(page.getByRole("status").filter({hasText:"Правильных ответов: 1 из 5"})).toBeVisible();
  await page.goto("/settings/library/a-cooler-station");
  await expect(page.getByText(/Reading · B1/)).toBeVisible();
});
