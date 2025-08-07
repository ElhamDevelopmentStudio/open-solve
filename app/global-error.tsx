"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-center text-sm text-muted-foreground">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-foreground">Something went wrong</h1>
          <p>Our team has been notified. You can retry the last action or head back to safety.</p>
          {error.digest ? (
            <p className="text-xs text-muted-foreground/70">Error reference: {error.digest}</p>
          ) : null}
        </div>
        <button
          className="rounded-md border border-border px-4 py-2 text-foreground transition hover:bg-muted"
          type="button"
          onClick={() => reset()}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
