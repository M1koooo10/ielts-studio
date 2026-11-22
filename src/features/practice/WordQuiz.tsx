"use client";
import {useState} from "react";

type Word = {word:string;translation:string;example:string};
export function WordQuiz({level,words}:{level:string;words:Word[]}) {
  const [questions,setQuestions] = useState<Word[]>([]);
  const [step,setStep] = useState(0);
  const [score,setScore] = useState(0);
  const [choice,setChoice] = useState("");
  const question = questions[step];
  function start() {
    const shuffled = words.slice();
    for(let i=shuffled.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [shuffled[i],shuffled[j]] = [shuffled[j],shuffled[i]];
    }
    setQuestions(shuffled.slice(0,5)); setStep(0); setScore(0); setChoice("");
  }
  return <section className="panel dashboard-section"><h2>Тест по словам · {level}</h2>
    {question ? <>
      <p>{step+1} из {questions.length} · Выберите перевод слова <b lang="en">{question.word}</b></p>
      <div className="bank-filters">{questions.map(({translation})=>translation).sort().map(option=>
        <button className="studio-button btn-outline" key={option} disabled={!!choice} onClick={()=>{
          setChoice(option); if(option===question.translation) setScore(score+1);
        }}>{option}</button>)}</div>
      {choice && <><p role="status">{choice===question.translation?"Верно!":"Правильный перевод — "+question.translation} · {question.example}</p>
        <button className="text-link" onClick={()=>{setStep(step+1); setChoice("");}}>{step+1===questions.length?"Показать результат":"Следующее слово"}</button></>}
    </> : <>{questions.length>0 && <p role="status">Правильных ответов: {score} из {questions.length}</p>}
      <button className="studio-button btn-blue" onClick={start}>{questions.length?"Повторить тест":"Начать тест"}</button></>}
  </section>;
}
