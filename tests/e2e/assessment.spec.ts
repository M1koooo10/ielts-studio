import {DatabaseSync} from "node:sqlite";
import {test,expect} from "./account-fixture";

test.use({placed:false});
test("placement creates a plan and the next weekly assessment renews it",async({page})=>{
  await page.goto("/");
  await expect(page).toHaveURL(/placement$/);
  await page.getByRole("button",{name:"Начать диагностику"}).click();
  for(let section=0;section<2;section++){
    await expect(page.getByRole("heading",{name:section?"Reading":"Listening",exact:true})).toBeVisible();
    for(let i=0;i<10;i++){
      await page.getByRole("radio").first().check();
      if(i===0&&section===0){
        await expect(page.getByRole("status").filter({hasText:"Ответы сохранены."})).toBeVisible();
        await page.reload();
        await expect(page.getByRole("radio").first()).toBeChecked();
      }
      await page.getByRole("button",{name:i===9?/^Продолжить ·/:/Следующий вопрос/}).click();
    }
  }
  for(let i=0;i<2;i++){
    await expect(page.getByRole("heading",{name:"Writing · Task "+(i+1),exact:true})).toBeVisible();
    await page.getByRole("textbox").fill("This is a diagnostic response with a supporting example.");
    await page.getByRole("button",{name:/^Продолжить ·/}).click();
  }
  for(const count of [4,1,3]){
    await expect(page.getByRole("heading",{name:"Speaking · Part "+(count===4?1:count===1?2:3),exact:true})).toBeVisible();
    if(count===4){
      await page.evaluate(()=>{
        const context=new AudioContext(), tone=context.createOscillator(), destination=context.createMediaStreamDestination();
        tone.connect(destination);tone.start();
        Object.defineProperty(navigator.mediaDevices,"getUserMedia",{value:async()=>destination.stream});
      });
      await page.getByRole("button",{name:"Записать ответ"}).click();
      await expect(page.getByRole("status").filter({hasText:"Идёт запись."})).toBeVisible();
      await page.waitForTimeout(400);
      await page.getByRole("button",{name:"Остановить и сохранить"}).click();
      await expect(page.getByRole("status").filter({hasText:"Запись сохранена в профиле."})).toBeVisible();
      const recording=await page.request.get("/api/placement?step=4");
      expect(recording.status()).toBe(200);
      expect((await recording.body()).toString("ascii",0,4)).toBe("RIFF");
    }
    await page.getByText("Ответить текстом без микрофона").click();
    await page.getByRole("textbox").fill("I prefer to study at home because I can concentrate.");
    for(let i=1;i<count;i++)await page.getByRole("button",{name:"Следующий вопрос"}).click();
    await page.getByRole("button",{name:count===3?"Посмотреть результаты":/^Продолжить ·/}).click();
  }
  await expect(page.getByRole("heading",{name:"Your Estimated IELTS Level"})).toBeVisible();
  await page.getByRole("button",{name:"Оценить ответы с AI"}).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("подключите OpenAI");
  await page.getByRole("button",{name:"Start My Learning Journey"}).click();
  await expect(page.getByRole("heading",{name:"Обзор, Ученик"})).toBeVisible();
  await page.goto("/study-plan");
  const questions=page.locator("fieldset");
  await expect(page.getByRole("button",{name:"Завершить",exact:true})).toBeVisible();
  const db=new DatabaseSync(process.env.STUDIO_E2E_DB!);
  try {
    const last=db.prepare("SELECT user_id FROM user_assessments ORDER BY rowid DESC LIMIT 1").get()!;
    db.prepare("UPDATE user_assessments SET taken_on=date('now','-8 days') WHERE user_id=?").run(last.user_id);
  } finally {db.close();}
  await page.goto("/mock-tests");
  await page.getByRole("link",{name:"Пройти мини-тест"}).click();
  await expect(questions).toHaveCount(10);
  await expect(page.locator("audio")).toBeVisible();
  for(const question of await questions.all()){
    const option=question.getByRole("radio").first();
    if(await option.count()) await option.check();
    else await question.getByRole("textbox").fill("practice");
  }
  await page.getByRole("button",{name:"Завершить тест и получить план"}).click();
  await expect(page.getByRole("heading",{name:"История результатов"})).toBeVisible();
  await expect(questions).toHaveCount(0);
});
