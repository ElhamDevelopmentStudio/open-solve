import { z } from "zod";
import { DIFFICULTIES, SUPPORTED_LANGUAGES } from "@/lib/constants";

export const testCaseSchema = z.object({
  input: z.string().min(1, "Input is required."),
  output: z.string().min(1, "Output is required."),
  isSample: z.boolean().default(false),
});

export const starterTemplateSchema = z.object({
  language: z.enum(SUPPORTED_LANGUAGES),
  code: z.string().default(""),
});

export const problemFormSchema = z.object({
  title: z.string().min(4).max(120),
  slug: z
    .string()
    .min(3)
    .regex(/^[a-z0-9-]+$/, "Use lowercase, numbers, and hyphens only."),
  difficulty: z.enum(DIFFICULTIES),
  tags: z.array(z.string()),
  statement: z.string().min(20),
  constraints: z.string().min(5),
  starterCode: z.array(starterTemplateSchema),
  testCases: z.array(testCaseSchema).min(1, "Provide at least one test case."),
});

export type ProblemFormValues = z.infer<typeof problemFormSchema>;
