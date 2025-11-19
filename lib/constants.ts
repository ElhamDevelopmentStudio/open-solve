export const SUPPORTED_LANGUAGES = ["cpp17", "python3", "java17", "node20"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;

export const DEFAULT_PAGINATION_LIMIT = 20;
