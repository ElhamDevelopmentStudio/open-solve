import type {
  JudgeCaseResult,
  JudgeSimulationResult,
  JudgeSimulationTestCase,
  JudgeSummary,
  JudgeVerdictCode,
  SampleRunResult,
} from "@/lib/submissions/types";

const DEFAULT_TIME_BUDGET = 2_000;
const DEFAULT_MEMORY_BUDGET = 128 * 1024;

type SimulationMode = "sample" | "full";

type SimulationInput = {
  problemId: string;
  languageCode: string;
  sourceCode: string;
  stdin?: string;
  testCases: JudgeSimulationTestCase[];
  mode?: SimulationMode;
};

const VERDICT_LABELS: Record<JudgeVerdictCode, string> = {
  AC: "Accepted",
  WA: "Wrong Answer",
  TLE: "Time Limit Exceeded",
  MLE: "Memory Limit Exceeded",
  RE: "Runtime Error",
  CE: "Compile Error",
  MANUAL_PENDING: "Manual Pending",
  MANUAL_ACCEPTED: "Manual Accepted",
  MANUAL_REJECTED: "Manual Rejected",
  MANUAL_PARTIAL: "Manual Partial",
};

const KEYWORD_HINTS = [
  "while",
  "for",
  "if",
  "stack",
  "queue",
  "map",
  "set",
  "dp",
  "binary_search",
];

const ERROR_KEYWORDS: Array<{ regex: RegExp; verdict: JudgeVerdictCode; failure: JudgeSimulationResult["failureMode"] }> = [
  { regex: /while\s*\(\s*true\s*\)|for\s*\(\s*;;\s*\)/i, verdict: "TLE", failure: "TIME" },
  { regex: /malloc\(|new\s+Array\(|\bbigint\b.*range/iu, verdict: "MLE", failure: "MEMORY" },
  { regex: /panic!|throw new|raise\s+\w+/i, verdict: "RE", failure: "RUNTIME" },
  { regex: /TODO|FIXME|pass\s*(#.*)?$|raise NotImplementedError/imu, verdict: "CE", failure: "COMPILE" },
];

const POSITIVE_KEYWORDS = [/two\s*sum/i, /dfs|bfs/i, /prefix/i, /optimize/i];

export function hashString(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

function randomId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function analyzeSource(sourceCode: string) {
  const normalized = sourceCode.toLowerCase();
  let forcedVerdict: JudgeVerdictCode | null = null;
  let failureMode: JudgeSimulationResult["failureMode"];

  for (const matcher of ERROR_KEYWORDS) {
    if (matcher.regex.test(sourceCode)) {
      forcedVerdict = matcher.verdict;
      failureMode = matcher.failure;
      break;
    }
  }

  const keywordHits = KEYWORD_HINTS.reduce(
    (count, keyword) => (normalized.includes(keyword.toLowerCase()) ? count + 1 : count),
    0,
  );
  const containsPositive = POSITIVE_KEYWORDS.some((regex) => regex.test(sourceCode));
  const lines = sourceCode.split("\n").length;
  const characters = sourceCode.length;
  const hasComments = /\/\//.test(sourceCode) || /#/.test(sourceCode);

  const structureScore = clamp(characters / 800, 0, 0.5);
  const keywordScore = clamp(keywordHits / 10, 0, 0.2);
  const commentsScore = hasComments ? 0.05 : 0;
  const positiveScore = containsPositive ? 0.1 : 0;
  const baseline = 0.15;
  const lengthScore = clamp(lines / 120, 0, 0.2);
  const penalty = /todo|pass/.test(normalized) ? 0.15 : 0;
  const quality = clamp(baseline + structureScore + keywordScore + commentsScore + positiveScore + lengthScore - penalty, 0.05, 0.98);

  return {
    forcedVerdict,
    failureMode,
    quality,
    warnings: buildWarnings(sourceCode, quality),
  };
}

function buildWarnings(source: string, quality: number) {
  const warnings: string[] = [];
  if (/todo|pass|fixme/i.test(source)) {
    warnings.push("Compiler spotted TODO markers — expect failures.");
  }
  if (/console\.log|print\(/i.test(source)) {
    warnings.push("Verbose logging detected. Output trimmed for judge.");
  }
  if (quality > 0.75) {
    warnings.push("Structure looks solid. Hidden tests will verify edge cases.");
  } else if (quality < 0.3) {
    warnings.push("Solution appears incomplete. Consider re-checking constraints.");
  }
  return warnings;
}

function verdictFromQuality(
  quality: number,
  seed: number,
  forcedVerdict?: JudgeVerdictCode | null,
): JudgeVerdictCode {
  if (forcedVerdict) {
    return forcedVerdict;
  }
  const normalized = (seed % 10_000) / 10_000;
  if (normalized < quality * 0.7) {
    return "AC";
  }
  if (normalized < 0.85) {
    return "WA";
  }
  if (normalized < 0.92) {
    return "RE";
  }
  if (normalized < 0.97) {
    return "TLE";
  }
  return "MLE";
}

function buildCaseResult(params: {
  testCase: JudgeSimulationTestCase;
  verdict: JudgeVerdictCode;
  quality: number;
  seed: number;
  discloseIO: boolean;
}): JudgeCaseResult {
  const { testCase, verdict, quality, seed, discloseIO } = params;
  const runtimeMs = Math.round(
    clamp((seed % DEFAULT_TIME_BUDGET) * (1 - quality / 2), 8, DEFAULT_TIME_BUDGET * 2),
  );
  const memoryKb = Math.round(
    clamp(((seed >> 5) % DEFAULT_MEMORY_BUDGET) * (1 - quality / 1.5), 256, DEFAULT_MEMORY_BUDGET * 2),
  );
  const hidden = testCase.kind === "HIDDEN" && !discloseIO;
  const status =
    verdict === "AC" ? "PASSED" : verdict === "CE" || verdict === "RE" ? "ERROR" : "FAILED";
  let actualOutput: string | null = null;
  let stderr: string | null = null;

  if (!hidden) {
    if (verdict === "AC") {
      actualOutput = testCase.output;
    } else if (verdict === "WA") {
      actualOutput = mutateOutput(testCase.output, seed);
    } else {
      actualOutput = "";
    }
  }

  if (verdict === "RE") {
    stderr = "RuntimeException: simulated crash on edge case";
  } else if (verdict === "TLE") {
    stderr = "Exceeded time limit. Consider optimizing loops.";
  } else if (verdict === "MLE") {
    stderr = "Memory usage exceeded guard rails.";
  } else if (verdict === "CE") {
    stderr = "Compilation failed — fix syntax before submitting.";
  }

  return {
    ordinal: testCase.ordinal,
    verdictCode: verdict,
    status,
    runtimeMs,
    memoryKb,
    inputPreview: hidden ? null : truncate(testCase.input, 240),
    expectedOutput: hidden ? null : truncate(testCase.output, 240),
    actualOutput: hidden ? null : actualOutput ? truncate(actualOutput, 240) : null,
    stderr,
    hidden,
  };
}

function mutateOutput(output: string, seed: number) {
  if (!output.trim()) return " ";
  const variation = (seed % 3) + 1;
  if (variation === 1) {
    return output
      .split(/\s+/)
      .reverse()
      .join(" ");
  }
  if (variation === 2) {
    return `${output.trim()} ${seed % 9}`;
  }
  return output
    .split("")
    .map((char, index) => (index % 2 === 0 ? char : char.toUpperCase()))
    .join("");
}

function truncate(value: string, limit: number) {
  if (value.length <= limit) {
    return value;
  }
  return `${value.slice(0, limit)}…`;
}

export function simulateJudgeRun({
  problemId,
  languageCode,
  sourceCode,
  stdin,
  testCases,
  mode = "full",
}: SimulationInput): JudgeSimulationResult & { runId: string } {
  const analysis = analyzeSource(sourceCode);
  const discloseIO = mode === "sample";
  const startedAt = new Date();
  const runId = randomId(mode === "sample" ? "sample" : "submission");
  const cases: JudgeCaseResult[] = [];
  let passed = 0;
  let failed = 0;
  let errored = 0;
  let runtimeAccumulator = 0;
  let memoryAccumulator = 0;
  const relevantTests =
    mode === "sample"
      ? testCases.filter((test) => test.kind === "SAMPLE").slice(0, 5)
      : testCases;
  const effectiveTests = relevantTests.length > 0 ? relevantTests : testCases;

  for (const testCase of effectiveTests) {
    const seed = hashString(
      `${problemId}:${languageCode}:${testCase.ordinal}:${sourceCode}:${stdin ?? ""}`,
    );
    const verdict = verdictFromQuality(analysis.quality, seed, analysis.forcedVerdict);
    const caseResult = buildCaseResult({
      testCase,
      verdict,
      quality: analysis.quality,
      seed,
      discloseIO,
    });
    runtimeAccumulator += caseResult.runtimeMs;
    memoryAccumulator += caseResult.memoryKb;
    if (caseResult.status === "PASSED") {
      passed += 1;
    } else if (caseResult.status === "FAILED") {
      failed += 1;
    } else {
      errored += 1;
    }
    cases.push(caseResult);
  }

  const verdictPriority: JudgeVerdictCode[] = ["CE", "RE", "TLE", "MLE", "WA", "AC"];
  const firstNonAC =
    cases
      .map((caseResult) => caseResult.verdictCode)
      .find((verdict) => verdict !== "AC") ?? "AC";
  const sortedVerdict = verdictPriority.find((code) =>
    cases.some((result) => result.verdictCode === code),
  );
  const verdictCode = sortedVerdict ?? firstNonAC;
  const finishedAt = new Date(Date.now() + Math.min(runtimeAccumulator, 3_000));
  const summary: JudgeSummary = {
    verdictCode,
    passed,
    failed,
    errored,
    total: cases.length,
    runtimeMs: runtimeAccumulator,
    memoryKb: Math.round(memoryAccumulator / Math.max(1, cases.length)),
    startedAt,
    finishedAt,
  };

  const consoleMessages = [
    `> Compiling ${languageCode.toUpperCase()} source…`,
    analysis.forcedVerdict === "CE" ? "Compilation failed." : "Compilation finished.",
    ...analysis.warnings,
    verdictCode === "AC"
      ? "All visible tests passed. Hidden cases verified server-side."
      : `Judge verdict: ${VERDICT_LABELS[verdictCode]}`,
  ];

  if (stdin?.trim()) {
    consoleMessages.push(`Custom stdin forwarded (${stdin.trim().split(/\s+/).length} tokens).`);
  }

  return {
    runId,
    summary,
    console: consoleMessages,
    cases,
    failureMode: analysis.failureMode,
  };
}

export function simulateSampleRun(input: SimulationInput): SampleRunResult {
  const result = simulateJudgeRun({ ...input, mode: "sample" });
  return {
    runId: result.runId,
    problemId: input.problemId,
    languageCode: input.languageCode,
    stdin: input.stdin,
    summary: result.summary,
    console: result.console,
    cases: result.cases,
  };
}
