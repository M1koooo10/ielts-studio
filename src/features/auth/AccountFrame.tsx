import Link from "next/link";
import { BookOpen, GraduationCap, LockKeyhole } from "lucide-react";
import "./account.css";

export function AccountFrame({children}:{children:React.ReactNode}){
  return <main className="account-screen">
    <header className="account-top"><Link href="/welcome" className="brand"><span className="brand-mark"><BookOpen size={23}/></span><span className="brand-name">IELTS <b>Studio</b></span></Link><span className="account-format"><GraduationCap size={18}/> Academic</span></header>
    <div className="account-layout"><section className="account-cover">
      <div className="account-cover-inner"><h2>Ваша студия<br/>английского</h2><p>Готовьтесь к IELTS Academic и возвращайтесь к своим занятиям с любого сеанса.</p></div>
      <div className="cover-landmark" role="presentation"/><span className="cover-label" lang="en">IELTS Academic · London</span>
    </section><section className="account-form-area">{children}</section></div>
    <footer className="account-footer"><LockKeyhole size={15}/> Персональный учебный кабинет</footer>
  </main>;
}
