import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/constants";

type Preset = {
  code: SupportedLanguage;
  label: string;
  defaultStub: string;
  cmLanguage: "cpp" | "python" | "java" | "javascript";
};

const LANGUAGE_PRESETS: Record<SupportedLanguage, Preset> = {
  cpp17: {
    code: "cpp17",
    label: "C++17",
    cmLanguage: "cpp",
    defaultStub: `#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);

  // Read input

  // TODO: write your solution

  return 0;
}
`,
  },
  python3: {
    code: "python3",
    label: "Python 3",
    cmLanguage: "python",
    defaultStub: `import sys


def solve():
    data = sys.stdin.read().strip().split()
    # TODO: parse input and implement solution
    print("TODO")


if __name__ == "__main__":
    solve()
`,
  },
  java17: {
    code: "java17",
    label: "Java 17",
    cmLanguage: "java",
    defaultStub: `import java.io.*;
import java.util.*;

public class Main {
    private static final FastScanner fs = new FastScanner(System.in);

    public static void main(String[] args) throws Exception {
        // TODO: parse input
        System.out.println("TODO");
    }

    static final class FastScanner {
        private final InputStream in;
        private final byte[] buffer = new byte[1 << 16];
        private int ptr = 0, len = 0;

        FastScanner(InputStream is) {
            this.in = is;
        }

        private int read() throws IOException {
            if (ptr >= len) {
                len = in.read(buffer);
                ptr = 0;
                if (len <= 0) {
                    return -1;
                }
            }
            return buffer[ptr++];
        }

        String next() throws IOException {
            StringBuilder sb = new StringBuilder();
            int c;
            while ((c = read()) != -1 && c <= ' ') {
            }
            while (c > ' ') {
                sb.append((char) c);
                c = read();
            }
            return sb.toString();
        }

        int nextInt() throws IOException {
            return Integer.parseInt(next());
        }
    }
}
`,
  },
  node20: {
    code: "node20",
    label: "Node 20",
    cmLanguage: "javascript",
    defaultStub: `import fs from "node:fs";

const input = fs.readFileSync(0, "utf8").trim().split(/\\s+/);
let idx = 0;

const next = () => input[idx++];

function main() {
  // TODO: parse input via next()
  console.log("TODO");
}

main();
`,
  },
};

export function getDefaultCodeStub(languageCode: string): string {
  const preset = LANGUAGE_PRESETS[languageCode as SupportedLanguage];
  if (preset) {
    return preset.defaultStub;
  }
  return `// Starter template for ${languageCode}\n`;
}

export function getLanguagePreset(languageCode: string): Preset | null {
  const fallback = LANGUAGE_PRESETS[languageCode as SupportedLanguage];
  return fallback ?? null;
}

export function getAllLanguagePresets(): Preset[] {
  return SUPPORTED_LANGUAGES.map((code) => LANGUAGE_PRESETS[code]);
}

export type LanguagePreset = Preset;
