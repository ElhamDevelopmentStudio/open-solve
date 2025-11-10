import type { Prisma } from "@prisma/client";

export type ProblemSample = { input: string; output: string; explanation?: string };

export function parseProblemSamples(samples: Prisma.JsonValue | null | undefined): ProblemSample[] {
  if (!samples || !Array.isArray(samples)) {
    return [];
  }

  return samples
    .map((raw) => {
      if (typeof raw !== "object" || raw === null) return null;
      const value = raw as Record<string, unknown>;
      const input = typeof value.input === "string" ? (value.input as string) : "";
      const output = typeof value.output === "string" ? (value.output as string) : "";
      const explanation =
        typeof value.explanation === "string" ? (value.explanation as string) : undefined;
      if (!input && !output) return null;
      return { input, output, explanation };
    })
    .filter(Boolean) as ProblemSample[];
}
