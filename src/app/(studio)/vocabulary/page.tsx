import Link from "next/link";
import {connection} from "@/server/db/connection";
import {WordQuiz} from "@/features/practice/WordQuiz";

export const metadata = {title:"Словарь"};
const levels = ["A1","A2","B1","B2","C1","C2"];

export default async function VocabularyPage({searchParams}:{searchParams:Promise<{level?:string}>}) {
  const requested = (await searchParams).level;
  const level = levels.find(value=>value === requested) ?? "A1";
  const {client} = await connection();
  const result = await client.execute({sql:"SELECT word,translation,example FROM vocabulary_entries WHERE cefr=? ORDER BY word",args:[level]});
  const words = result.rows.map(row=>({word:String(row.word),translation:String(row.translation),example:String(row.example)}));
  return <>
    <header className="page-heading"><div><h1>Словарь</h1><p>Выберите уровень, изучите примеры и проверьте себя.</p></div></header>
    <nav className="bank-filters" aria-label="Уровень английского">{levels.map(item=><Link key={item}
      className={"studio-button "+(item===level?"btn-blue":"btn-outline")} aria-current={item===level?"page":undefined}
      href={"/vocabulary?level="+item}>{item}</Link>)}</nav>
    <section className="panel"><h2>Слова уровня {level}</h2>
      {words.map(entry=><div className="bank-row" key={entry.word}><span><b lang="en">{entry.word}</b> · {entry.translation}
        <small lang="en">{entry.example}</small></span></div>)}
    </section>
    <WordQuiz key={level} level={level} words={words}/>
  </>;
}
