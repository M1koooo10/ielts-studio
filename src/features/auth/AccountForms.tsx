"use client";
import { useMemo, useState, type FormEvent } from "react";
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";
import { ArrowRight, CheckCircle2, LoaderCircle, LogOut, Smartphone } from "lucide-react";

type AuthResult = { challengeId?:string; phoneMasked?:string; retryAfter?:number; expiresAt?:number; needsProfile?:boolean; error?:string };
async function post(action:string,data:object):Promise<{ok:boolean;body:AuthResult}> {
  const response=await fetch("/api/auth/"+action,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data),cache:"no-store"});
  return {ok:response.ok,body:await response.json()};
}
export function PhoneForm({overview=false}:{overview?:boolean}) {
  const [country, setCountry] = useState<CountryCode>("KZ");
  const [register, setRegister] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const countries = useMemo(() => {
    const names = new Intl.DisplayNames(["ru"], {type:"region"});
    return getCountries().map(iso => ({iso, label:names.of(iso) ?? iso}))
      .sort((a,b) => a.label.localeCompare(b.label,"ru"));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const phone = form.elements.namedItem("phone") as HTMLInputElement;
    const password = form.querySelector<HTMLInputElement>('input[type="password"]');
    const parsed = parsePhoneNumberFromString(phone.value, {defaultCountry:country,extract:false});
    if (!parsed?.isValid() || parsed.ext || !password) {
      setError("Проверьте номер телефона.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const {ok,body} = await post(register ? "register" : "login", {phone:parsed.number,password:password.value});
      if (!ok) {
        setError(body.error ?? "Не удалось войти.");
        return;
      }
      window.location.replace(body.needsProfile ? (overview ? "/complete-profile?next=overview" : "/complete-profile") : (overview ? "/overview" : "/"));
    } catch {
      setError("Не удалось связаться с сервером.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="account-form">
    <span className="auth-symbol"><Smartphone size={24}/></span>
    <h1>{register ? "Создать аккаунт" : "Вход в IELTS Studio"}</h1>
    <p className="auth-intro">Введи номер телефона и пароль.</p>
    <form method="post" onSubmit={submit}>
      <label>Страна<select value={country} onChange={e=>setCountry(e.target.value as CountryCode)}>
        {countries.map(c=><option key={c.iso} value={c.iso}>{c.label} (+{getCountryCallingCode(c.iso)})</option>)}
      </select></label>
      <label>Номер телефона<div className="phone-field"><span>+{getCountryCallingCode(country)}</span>
        <input name="phone" type="tel" autoComplete="tel-national" required maxLength={36}/>
      </div></label>
      <label>Пароль<input key={String(register)} type="password" autoComplete={register?"new-password":"current-password"} required minLength={8} maxLength={128}/></label>
      <button className="auth-primary" disabled={busy}>{busy?"Подождите…":register?"Зарегистрироваться":"Войти"}{busy?<LoaderCircle size={17}/>:<ArrowRight size={17}/>}</button>
    </form>
    <button className="auth-link" type="button" disabled={busy} onClick={()=>{setRegister(!register);setError("")}}>{register?"Уже есть аккаунт? Войти":"Создать аккаунт"}</button>
    {error&&<p role="alert" className="auth-error">{error}</p>}
  </div>;
}

export function ProfileForm(){
  const [name,setName]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  async function submit(event:FormEvent){event.preventDefault();setBusy(true);setError("");try{const {ok,body}=await post("profile",{displayName:name.trim()});if(!ok){setError(body.error??"Не удалось сохранить имя.");return}window.location.replace("/onboarding");}catch{setError("Не удалось связаться с сервером.")}finally{setBusy(false)}}
  return <div className="account-form"><span className="auth-symbol"><CheckCircle2/></span><h1>Как к вам обращаться?</h1><p className="auth-intro">Укажите имя для учебного кабинета.</p><form onSubmit={submit}><label>Ваше имя<input required maxLength={60} autoComplete="given-name" value={name} onChange={e=>setName(e.target.value)}/></label><button className="auth-primary" disabled={busy||!name.trim()}>Продолжить <ArrowRight size={17}/></button></form>{error&&<p role="alert">{error}</p>}</div>;
}
export function LogoutButton(){
  const [error,setError]=useState(false);const [busy,setBusy]=useState(false);
  return <><button className="sf-button" disabled={busy} onClick={async()=>{setBusy(true);setError(false);try{const r=await post("logout",{});if(!r.ok)throw Error();window.location.replace("/welcome")}catch{setError(true);setBusy(false)}}}><LogOut size={16}/>Выйти из аккаунта</button>{error&&<p role="alert">Не удалось выйти. Повторите попытку.</p>}</>;
}
