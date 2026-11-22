import {redirect} from "next/navigation";
import {getAuth} from "@/server/auth/current";
import {PhoneForm} from "@/features/auth/AccountForms";
import {AccountFrame} from "@/features/auth/AccountFrame";
export const metadata={title:"Вход по телефону"};
export default async function Welcome({searchParams}:{searchParams:Promise<{next?:string}>}){
  const overview=(await searchParams).next==="overview";
  const account=await getAuth();
  if(account)redirect(account.displayName?(overview?"/overview":"/"):(overview?"/complete-profile?next=overview":"/complete-profile"));
  return <AccountFrame><PhoneForm overview={overview}/></AccountFrame>;
}
