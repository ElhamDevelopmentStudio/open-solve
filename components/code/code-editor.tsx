"use client";

import CodeMirror from "@uiw/react-codemirror";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import type { LanguageSupport } from "@codemirror/language";
import { useMemo } from "react";

type CodeEditorProps = {
  value: string;
  language: "cpp17" | "python3" | "java17" | "node20";
  onChange: (value: string) => void;
  readOnly?: boolean;
  minHeight?: number;
  ariaLabel?: string;
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
  readOnly = false,
  minHeight = 360,
  ariaLabel,
}: CodeEditorProps) {
  const extensions = useMemo(() => [extensionFactory[language]], [language]);

  return (
    <CodeMirror
      value={value}
      height={`${minHeight}px`}
      theme={oneDark}
      extensions={extensions}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: true,
        foldGutter: true,
        autocompletion: true,
      }}
      readOnly={readOnly}
      aria-label={ariaLabel}
      onChange={(next) => onChange(next)}
    />
  );
}
