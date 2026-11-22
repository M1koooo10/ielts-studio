import content from "./content.json";

export const stages = [
  {skill:"Listening",title:"Listening", minutes:9, intro:"Прослушайте две записи и выберите ответы. Запись можно ставить на паузу и слушать повторно."},
  {skill:"Reading",title:"Reading", minutes:10, intro:"Прочитайте два текста. В первом различайте опровержение и отсутствие информации."},
  {skill:"Writing",title:"Writing · Task 1", minutes:5, intro:"Сравните показатели в таблице. Ориентир — 70–90 слов."},
  {skill:"Writing",title:"Writing · Task 2", minutes:7, intro:"Изложите свою позицию и подкрепите её примерами. Ориентир — 120–160 слов."},
  {skill:"Speaking",title:"Speaking · Part 1", minutes:2, intro:"Начните запись и отвечайте по очереди на четыре вопроса о себе."},
  {skill:"Speaking",title:"Speaking · Part 2", minutes:3, intro:"Одна минута на подготовку и до двух минут на устный ответ."},
  {skill:"Speaking",title:"Speaking · Part 3", minutes:2, intro:"Обоснуйте свои ответы на три вопроса. Можно записать всю часть одним файлом."},
] as const;
export const writingPrompts = [
  "The table shows the percentage of commuters using three types of transport in a city in 2010 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
  "Some people believe that technology has made education more accessible, while others argue that it has reduced the quality of learning. To what extent do you agree or disagree? Give reasons for your answer and include relevant examples.",
];
export const transport = [["Car",55,38],["Public transport",30,42],["Bicycle",15,20]];
export const speakingPrompts = [
  ["Do you work or are you a student?","What do you enjoy doing in your free time?","Do you prefer studying alone or with other people? Why?","How often do you use technology to learn something new?"],
  ["Describe a skill you would like to learn. Say what the skill is, why you want to learn it, how you would learn it and how it might benefit you in the future."],
  ["Why do some people find it more difficult to learn new skills as they get older?","Do you think online education will eventually replace traditional classrooms?","Should governments invest more in lifelong learning programmes?"],
];
export function stageQuestions(step:number) {
  return content.questions.slice(step*10,step*10+10);
}
export function countItems(step:number) {
  if(step<2) return 10;
  return step<4 ? 1 : speakingPrompts[step-4].length;
}
export const half = (value:number)=>Math.round(value*2)/2;
export const cefr = (band:number)=>band<3?"A1":band<4?"A2":band<5.5?"B1":band<7?"B2":band<8.5?"C1":"C2";
export function secondsLeft(step:number,opened:number,now:number) {
  return Math.max(0,Math.ceil((opened+stages[step].minutes*60000-now)/1000));
}
export type Draft = Record<string,string>;
export type PlacementState = {step:number;cursor:number;opened:number;revision:number;answers:Draft;recordings:number[];completed:boolean};
