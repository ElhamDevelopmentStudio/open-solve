import * as React from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type ConfirmDialogVariant = "default" | "warning" | "destructive";

type ConfirmDialogProps = {
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  loading?: boolean;
  variant?: ConfirmDialogVariant;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
};

const variantClasses: Record<ConfirmDialogVariant, { accent: string; action: string }> = {
  default: {
    accent: "border-border bg-background",
    action: "border-border bg-primary text-primary-foreground hover:bg-primary/90",
  },
  warning: {
    accent: "border-warning/40 bg-warning/10",
    action:
      "border-warning bg-warning text-warning-foreground hover:bg-warning/90 hover:border-warning/80",
  },
  destructive: {
    accent: "border-destructive/40 bg-destructive/10",
    action:
      "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:border-destructive/80",
  },
};

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  loading,
  variant = "default",
  open,
  onOpenChange,
  trigger,
}: ConfirmDialogProps) {
  const contentTone = variantClasses[variant];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null}
      <AlertDialogContent
        className={cn(
          "rounded-none border-2 font-mono",
          contentTone.accent,
          "max-w-lg bg-background text-foreground",
        )}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-black">{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription className="text-sm text-muted-foreground">
              {description}
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="rounded-none border-2 border-border bg-background px-4 py-2 font-mono text-sm font-bold uppercase hover:bg-accent">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "rounded-none px-4 py-2 font-mono text-sm font-bold uppercase",
              contentTone.action,
            )}
          >
            {loading ? "Working..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
