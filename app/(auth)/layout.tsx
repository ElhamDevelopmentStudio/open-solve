import type { PropsWithChildren } from "react";

export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-sm">
        {children}
      </div>
    </div>
  );
}
