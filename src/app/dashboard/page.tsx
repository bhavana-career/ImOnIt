import React from "react";
import { redirect } from "next/navigation";
import { getActiveUser } from "@/lib/session";
import Header from "@/components/Header";
import DashboardClient from "@/components/DashboardClient";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeAccount = typeof params.account === "string" ? params.account : "";

  let user = null;
  let expiredMessage = "";

  try {
    user = await getActiveUser(activeAccount);
  } catch (err: any) {
    if (err.message && err.message.includes("Session expired")) {
      expiredMessage = err.message;
    }
  }

  if (expiredMessage) {
    redirect(`/auth?error=${encodeURIComponent(expiredMessage)}`);
  }

  if (!user) {
    redirect("/");
  }

  const welcomeMessage = typeof params.message === "string" ? params.message : "";

  return (
    <div className="min-h-screen flex flex-col relative bg-background text-foreground">
      <Header activeAccount={activeAccount} />
      <DashboardClient user={user} initialMessage={welcomeMessage} activeAccount={activeAccount} />
    </div>
  );
}
