import { getSession } from "@/lib/auth/session";
import { isStaffRole } from "@/lib/auth/permissions";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";

const navItems = [
  { label: "Drafts", href: "/staff/problems" },
  { label: "Proposals", href: "/staff/proposals" },
];

export default async function StaffLayout({ children }: PropsWithChildren) {
  const session = await getSession();
  if (!session || !isStaffRole(session.user.role)) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[#050505] text-foreground">
      <header className="border-b border-white/10 bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Staff Console</p>
            <h1 className="text-lg font-semibold">Problem Authoring</h1>
          </div>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
