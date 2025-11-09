import type { PropsWithChildren } from "react";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: PropsWithChildren) {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-sm">
        {children}
      </div>
    </div>
  );
}
