"use client";

import { useEffect, useContext, type ReactNode } from "react";
import { SidebarHeaderContext } from "@/components/layout/sidebar-shell";

type SidebarPageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export default function SidebarPageHeader({ title, description, actions }: SidebarPageHeaderProps) {
  const context = useContext(SidebarHeaderContext);

  useEffect(() => {
    context?.setHeader(
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>,
    );
    return () => context?.setHeader(null);
  }, [actions, context, description, title]);

  return null;
}
