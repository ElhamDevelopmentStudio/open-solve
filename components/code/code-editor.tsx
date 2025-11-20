"use client";

import CodeMirror from "@uiw/react-codemirror";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import type { LanguageSupport } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

type CodeEditorProps = {
  value: string;
  language: "cpp17" | "python3" | "java17" | "node20";
  onChange: (value: string) => void;
  onPaste?: (length: number) => void;
  readOnly?: boolean;
  minHeight?: number;
  ariaLabel?: string;
  appearance?: "light" | "dark";
  fontSize?: number;
  wrapLines?: boolean;
  showLineNumbers?: boolean;
  showMinimap?: boolean;
  className?: string;
};

const extensionFactory: Record<CodeEditorProps["language"], LanguageSupport> = {
  cpp17: cpp(),
  python3: python(),
  java17: java(),
  node20: javascript({ jsx: false, typescript: false }),
};

export function CodeEditor({
  value,
  onChange,
  language,
  onPaste,
  readOnly = false,
  minHeight = 360,
  ariaLabel,
  appearance = "dark",
  fontSize = 14,
  wrapLines = true,
  showLineNumbers = true,
  showMinimap = false,
  className,
}: CodeEditorProps) {
  const fontSizeExtension = useMemo(
    () =>
      EditorView.theme({
        ".cm-scroller": {
          fontSize: `${fontSize}px`,
          fontFamily: "var(--font-geist-mono)",
        },
      }),
    [fontSize],
  );
  const wrappingExtension = useMemo(
    () => (wrapLines ? [EditorView.lineWrapping] : []),
    [wrapLines],
  );
  const extensions = useMemo(
    () => [extensionFactory[language], fontSizeExtension, ...wrappingExtension],
    [language, fontSizeExtension, wrappingExtension],
  );
  const lightTheme = useMemo(
    () =>
      EditorView.theme(
        {
          "&": {
            backgroundColor: "var(--background)",
            color: "var(--foreground)",
          },
          ".cm-gutters": {
            backgroundColor: "var(--background)",
            borderRightColor: "var(--border)",
          },
        },
        { dark: false },
      ),
    [],
  );

  const minimapContent = useMemo(() => value.split("\n").slice(0, 400).join("\n"), [value]);

  return (
    <div
      className={cn("relative", className)}
      onPaste={(event) => {
        if (!onPaste) return;
        const text = event.clipboardData?.getData("text/plain") ?? "";
        onPaste(text.length);
      }}
    >
      {showMinimap ? (
        <div className="pointer-events-none absolute right-3 top-3 hidden h-[80%] w-16 overflow-hidden rounded-md border border-border/40 bg-background/80 p-1 text-[8px] leading-[1.15] text-muted-foreground/80 shadow-inner shadow-black/10 lg:block">
          <pre className="whitespace-pre-wrap opacity-80">{minimapContent}</pre>
        </div>
      ) : null}
      <CodeMirror
        value={value}
        height={`${minHeight}px`}
        theme={appearance === "dark" ? oneDark : lightTheme}
        extensions={extensions}
        basicSetup={{
          lineNumbers: showLineNumbers,
          highlightActiveLine: true,
          foldGutter: true,
          autocompletion: true,
        }}
        readOnly={readOnly}
        aria-label={ariaLabel}
        onChange={(next) => onChange(next)}
      />
    </div>
  );
}
