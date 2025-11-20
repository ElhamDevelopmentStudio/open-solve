"use client";

import { Moon, Sun } from "@/components/icons";
import { useTheme } from "next-themes";

export const ThemeToggleLanding = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const currentTheme = theme === "system" ? resolvedTheme : theme;

  return (
    <button
      onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
      className="h-9 w-9 rounded-none border-2 border-primary/30 bg-transparent p-2 font-mono text-primary transition-colors hover:border-primary/50 hover:bg-primary/5"
      aria-label="Toggle theme"
      suppressHydrationWarning
    >
      <span className="sr-only">Toggle theme</span>
      {currentTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
};

