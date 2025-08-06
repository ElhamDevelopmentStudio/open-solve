import type { PropsWithChildren } from "react";

export default function MarketingLayout({ children }: PropsWithChildren) {
  return <div className="flex min-h-screen flex-col">{children}</div>;
}
