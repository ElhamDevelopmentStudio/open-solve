"use client";

import { ArrowRight, Search } from "@/components/icons";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const commands = [
  { id: "problems", label: "Browse Problems", href: "/problems", shortcut: "P" },
  { id: "contests", label: "View Contests", href: "/contests", shortcut: "C" },
  { id: "signup", label: "Sign Up", href: "/sign-up", shortcut: "S" },
  { id: "signin", label: "Sign In", href: "/sign-in", shortcut: "I" },
  { id: "docs", label: "Documentation", href: "https://docs.opensolve.dev", shortcut: "D" },
  { id: "github", label: "View on GitHub", href: "https://github.com/ElhamDevelopmentStudio/open-solve", shortcut: "G" },
];

export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(0);
  const router = useRouter();

  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }

      if (!open) return;

      if (e.key === "Escape") {
        setOpen(false);
        setSearch("");
        setSelected(0);
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((prev) => (prev + 1) % filteredCommands.length);
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      }

      if (e.key === "Enter" && filteredCommands[selected]) {
        e.preventDefault();
        const cmd = filteredCommands[selected];
        if (cmd.href.startsWith("http")) {
          window.open(cmd.href, "_blank");
        } else {
          router.push(cmd.href);
        }
        setOpen(false);
        setSearch("");
        setSelected(0);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, filteredCommands, selected, router]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-100 bg-background/80 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="fixed left-1/2 top-[20%] z-101 w-full max-w-2xl -translate-x-1/2 px-4">
        <div className="overflow-hidden rounded-none border-2 border-primary bg-background shadow-2xl shadow-primary/20">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Search className="h-5 w-5 text-primary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type a command or search..."
              className="flex-1 bg-transparent font-mono text-sm text-foreground placeholder-muted-foreground outline-none"
              autoFocus
            />
            <kbd className="rounded-none border border-border px-2 py-1 font-mono text-xs text-muted-foreground">
              ESC
            </kbd>
          </div>

          <div className="max-h-96 overflow-y-auto p-2">
            {filteredCommands.length === 0 ? (
              <div className="px-4 py-8 text-center font-mono text-sm text-muted-foreground">
                No results found
              </div>
            ) : (
              filteredCommands.map((cmd, idx) => (
                <button
                  key={cmd.id}
                  className={`flex w-full items-center justify-between rounded-none px-4 py-3 text-left font-mono transition-colors ${
                    idx === selected
                      ? "bg-primary/20 text-primary"
                      : "text-foreground hover:bg-accent"
                  }`}
                  onClick={() => {
                    if (cmd.href.startsWith("http")) {
                      window.open(cmd.href, "_blank");
                    } else {
                      router.push(cmd.href);
                    }
                    setOpen(false);
                    setSearch("");
                    setSelected(0);
                  }}
                  onMouseEnter={() => setSelected(idx)}
                >
                  <span className="text-sm">{cmd.label}</span>
                  <div className="flex items-center gap-2">
                    <kbd className="rounded-none border border-border px-2 py-1 text-xs text-muted-foreground">
                      {cmd.shortcut}
                    </kbd>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-border px-4 py-2 text-center font-mono text-xs text-muted-foreground">
            Navigate with ↑↓ · Select with Enter · Close with ESC
          </div>
        </div>
      </div>
    </>
  );
};
