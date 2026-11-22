import {redirect} from "next/navigation";
import {requireAuth} from "@/server/auth/current";
import { getSettings } from "@/server/db";
import { getSessionStatus } from "@/server/ai/status";
import { Shell } from "@/components/Shell";
import {connection} from "@/server/db/connection";

export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const account = await requireAuth(); if(!account.displayName)redirect("/complete-profile");
  const {client}=await connection();
  const placement=await client.execute({sql:"SELECT completed_at FROM placements WHERE user_id=?",args:[account.userId]});
  if(!placement.rows[0]?.completed_at) redirect("/placement");
  const [settings, status] = await Promise.all([
    getSettings(account.userId),
    getSessionStatus(),
  ]);
  return (
    <Shell status={status} name={settings.displayName}>
      {children}
    </Shell>
  );
}
