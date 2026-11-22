import {redirect} from "next/navigation";
import {getAuth} from "@/server/auth/current";
import {getSessionStatus} from "@/server/ai/status";
import {Shell} from "@/components/Shell";
import DashboardPage from "../(studio)/page";

export default async function Overview(){
  const account=await getAuth();
  if(!account)redirect("/welcome?next=overview");
  if(!account.displayName)redirect("/complete-profile?next=overview");
  return <Shell name={account.displayName} status={await getSessionStatus()}><DashboardPage/></Shell>;
}
