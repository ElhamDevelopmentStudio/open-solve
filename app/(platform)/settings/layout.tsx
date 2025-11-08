import { DynamicSidebar } from "@/components/layout/dynamic-sidebar";
import { settingsNav } from "@/config/settings-navigation";
import type { PropsWithChildren } from "react";

export default function SettingsLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] gap-6">
      <DynamicSidebar items={settingsNav} className="sticky top-0 h-[calc(100vh-3.5rem)]" />
      <main className="flex-1 pb-12">{children}</main>
    </div>
  );
}

