export const SUPPORTED_LANGUAGES = [
  "CPP",
  "JAVA",
  "PYTHON",
  "JAVASCRIPT",
  "TYPESCRIPT",
  "GO",
  "RUST",
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;

export const DEFAULT_PAGINATION_LIMIT = 20;
