import {redirect} from "next/navigation";
import {requireAuth} from "@/server/auth/current";
import {ProfileForm} from "@/features/auth/AccountForms";
import {AccountFrame} from "@/features/auth/AccountFrame";
export default async function CompleteProfile({searchParams}:{searchParams:Promise<{next?:string}>}){
  const overview=(await searchParams).next==="overview";
  const account=await requireAuth();
  if(account.displayName)redirect(overview?"/overview":"/");
  return <AccountFrame><ProfileForm/></AccountFrame>;
}
