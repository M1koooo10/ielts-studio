import "@/features/practice/work.css";
import {getAuth} from "@/server/auth/current";
import type { Metadata } from "next";
import { getSettings } from "@/server/db";
import "./globals.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: {
    default: "IELTS Studio — рабочее пространство",
    template: "%s · IELTS Studio",
  },
  description: "Your Personal IELTS Learning Workspace.",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const account = await getAuth(); const theme = account ? (await getSettings(account.userId)).theme : "system";
  return (
    <html lang="ru" data-theme={theme}>
      <body>{children}</body>
    </html>
  );
}
