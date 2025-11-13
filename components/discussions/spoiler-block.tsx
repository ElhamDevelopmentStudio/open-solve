"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type SpoilerBlockProps = {
  children: React.ReactNode;
  initiallyHidden?: boolean;
  className?: string;
};

export function SpoilerBlock({ children, initiallyHidden = true, className }: SpoilerBlockProps) {
  const [revealed, setRevealed] = useState(!initiallyHidden);
  if (revealed) {
    return <div className={className}>{children}</div>;
  }
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-dashed border-amber-400/40 bg-amber-50/40 p-6 text-center text-sm text-amber-600 dark:bg-amber-500/5 dark:text-amber-200",
        className,
      )}
    >
      <p className="mb-3 flex items-center justify-center gap-2 text-xs uppercase tracking-wide">
        <EyeOff className="h-4 w-4" /> Spoiler hidden
      </p>
      <Button size="sm" variant="outline" onClick={() => setRevealed(true)}>
        Reveal
      </Button>
    </div>
  );
}
