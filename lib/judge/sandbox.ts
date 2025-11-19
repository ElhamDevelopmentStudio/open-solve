import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";
import type { Language, TestCaseKind } from "@prisma/client";
import { SANDBOX_PROFILES, JUDGE_WORKSPACE_ROOT } from "@/lib/judge/config";
import type {
  JudgeCaseResult,
  JudgeSummary,
  JudgeSimulationTestCase,
} from "@/lib/submissions/types";
import { simulateJudgeRun } from "@/lib/submissions/simulator";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

export type JudgeExecutionTest = {
  ordinal: number;
  kind: TestCaseKind;
  input: string;
  output: string;
  timeLimitMs: number;
  memoryLimitMb: number;
};

export type SandboxExecutionInput = {
  submissionId: string;
  problemId: string;
  language: Pick<
    Language,
    "code" | "compileCmd" | "runCmd" | "timeMultiplier" | "fileExtension" | "sandboxProfile"
  >;
  sourceCode: string;
  tests: JudgeExecutionTest[];
};

export type SandboxExecutionResult = {
  summary: JudgeSummary;
  cases: JudgeCaseResult[];
  console: string[];
  failureMode?: "COMPILE" | "RUNTIME" | "TIME" | "MEMORY";
};

type CommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  timedOut: boolean;
};

const DRIVER = (env.JUDGE_SANDBOX_DRIVER ?? "docker").toLowerCase();

export const executeInSandbox = async ({
  submissionId,
  problemId,
  language,
  sourceCode,
  tests,
}: SandboxExecutionInput): Promise<SandboxExecutionResult> => {
  const runSimulation = () => {
    const simulation = simulateJudgeRun({
      problemId,
      languageCode: language.code,
      sourceCode,
      stdin: "",
      testCases: tests.map((test) => ({
        ordinal: test.ordinal,
        input: test.input,
        output: test.output,
        kind: test.kind,
      })) as JudgeSimulationTestCase[],
      mode: "full",
    });
    return {
      summary: simulation.summary,
      cases: simulation.cases,
      console: simulation.console,
      failureMode: simulation.failureMode,
    };
  };

  if (DRIVER === "mock") {
    return runSimulation();
  }

  const preferredRoot = path.resolve(JUDGE_WORKSPACE_ROOT ?? tmpdir());
  let workspaceRoot = preferredRoot;
  try {
    await mkdir(workspaceRoot, { recursive: true });
  } catch (error) {
    logger.warn(
      { error, workspaceRoot },
      "failed to prepare judge workspace root, falling back to tmpdir",
    );
    workspaceRoot = path.resolve(tmpdir());
    await mkdir(workspaceRoot, { recursive: true }).catch((fallbackError) => {
      logger.error({ fallbackError }, "failed to initialize fallback judge workspace root");
      throw fallbackError;
    });
  }
  const workspace = await mkdtemp(path.join(workspaceRoot, `${submissionId}-`));
  const cleanup = async () => {
    await rm(workspace, { recursive: true, force: true }).catch(() => {});
  };

  const consoleLog: string[] = [];
  const profile =
    SANDBOX_PROFILES[language.sandboxProfile ?? "default"] ?? SANDBOX_PROFILES.default;
  const sourceFilename = `Main.${language.fileExtension ?? "txt"}`;
  const sourcePath = path.join(workspace, sourceFilename);
  await writeFile(sourcePath, sourceCode, "utf8");

  try {
    if (language.compileCmd && language.compileCmd.trim().length > 0) {
      const compileResult = await execDocker({
        image: profile.image,
        workspace,
        command: language.compileCmd,
        memoryMb: profile.memoryMb,
        cpuShares: profile.cpuShares,
      });
      consoleLog.push(`[compile] ${compileResult.stdout}`.trim());
      if (compileResult.stderr.trim()) {
        consoleLog.push(`[compile:err] ${compileResult.stderr}`.trim());
      }
      if (compileResult.exitCode !== 0) {
        return {
          summary: buildSummary("CE", 0, 0, compileResult.durationMs, tests.length),
          cases: [],
          console: consoleLog,
          failureMode: "COMPILE",
        };
      }
    }

    const caseResults: JudgeCaseResult[] = [];
    let failedCase: JudgeCaseResult | null = null;
    for (const test of tests) {
      const limitMs = Math.ceil(test.timeLimitMs * (language.timeMultiplier ?? 1));
      const execResult = await execDocker({
        image: profile.image,
        workspace,
        command: language.runCmd,
        memoryMb: Math.min(profile.memoryMb, test.memoryLimitMb),
        cpuShares: profile.cpuShares,
        stdin: test.input,
        timeoutMs: limitMs + 250,
      });

      let verdict: JudgeCaseResult["verdictCode"] = "AC";
      let stderr = execResult.stderr.trim() ? execResult.stderr.trim() : null;
      if (execResult.timedOut || execResult.exitCode === 124) {
        verdict = "TLE";
      } else if (execResult.exitCode === 137) {
        verdict = "MLE";
      } else if (execResult.exitCode !== 0) {
        verdict = "RE";
      } else {
        const normalizedExpected = normalizeOutput(test.output);
        const normalizedActual = normalizeOutput(execResult.stdout);
        verdict = normalizedExpected === normalizedActual ? "AC" : "WA";
        if (verdict === "WA" && !stderr) {
          stderr = "Output mismatch";
        }
      }

      const caseResult: JudgeCaseResult = {
        ordinal: test.ordinal,
        verdictCode: verdict,
        status: verdict === "AC" ? "PASSED" : verdict === "RE" ? "ERROR" : "FAILED",
        runtimeMs: execResult.durationMs,
        memoryKb: Math.min(profile.memoryMb, test.memoryLimitMb) * 1024,
        inputPreview: test.kind === "SAMPLE" ? test.input.slice(0, 240) : null,
        expectedOutput: test.kind === "SAMPLE" ? test.output.slice(0, 240) : null,
        actualOutput: test.kind === "SAMPLE" ? execResult.stdout.slice(0, 240) : null,
        stderr,
        hidden: test.kind === "HIDDEN",
      };
      caseResults.push(caseResult);
      if (!failedCase && verdict !== "AC") {
        failedCase = caseResult;
      }
      if (verdict !== "AC") {
        break;
      }
    }

    const summaryVerdict = failedCase?.verdictCode ?? "AC";
    const totalRuntime = caseResults.reduce((sum, item) => sum + (item.runtimeMs ?? 0), 0);
    const summary = buildSummary(
      summaryVerdict,
      caseResults.filter((c) => c.verdictCode === "AC").length,
      caseResults.filter((c) => c.verdictCode !== "AC").length,
      totalRuntime,
      tests.length,
    );

    return {
      summary,
      cases: caseResults,
      console: consoleLog,
      failureMode: failedCase?.verdictCode === "TLE" ? "TIME" : undefined,
    };
  } catch (error) {
    const errno = (error as NodeJS.ErrnoException)?.code;
    if (errno === "ENOENT") {
      logger.warn("Docker runtime unavailable — falling back to simulator");
      return runSimulation();
    }
    logger.error({ error }, "sandbox execution failed");
    throw error;
  } finally {
    await cleanup();
  }
};

const execDocker = async ({
  image,
  workspace,
  command,
  memoryMb,
  cpuShares,
  stdin,
  timeoutMs,
}: {
  image: string;
  workspace: string;
  command: string;
  memoryMb: number;
  cpuShares: number;
  stdin?: string;
  timeoutMs?: number;
}): Promise<CommandResult> => {
  const dockerArgs = [
    "run",
    "-i",
    "--rm",
    "--network",
    "none",
    "--cpus",
    cpuShares.toString(),
    "--memory",
    `${memoryMb}m`,
    "--pids-limit",
    "128",
    "--security-opt",
    "no-new-privileges",
    "-v",
    `${workspace}:/workspace`,
    "-w",
    "/workspace",
    image,
    "bash",
    "-lc",
    `set -euo pipefail; ${timeoutMs ? `timeout ${Math.ceil(timeoutMs / 1000)}s ` : ""}${command}`,
  ];

  return new Promise<CommandResult>((resolve, reject) => {
    const child = spawn("docker", dockerArgs, { stdio: "pipe" });
    let stdout = "";
    let stderr = "";
    const start = performance.now();

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    if (stdin !== undefined) {
      let payload = stdin;
      if (!payload.endsWith("\n")) {
        payload += "\n";
      }
      if (!payload.endsWith("\n\n")) {
        payload += "\n";
      }
      child.stdin.write(payload);
    }
    child.stdin.end();

    child.once("error", (error) => {
      reject(error);
    });

    child.once("close", (code, signal) => {
      const durationMs = Math.round(performance.now() - start);
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: typeof code === "number" ? code : signal === "SIGKILL" ? 137 : 1,
        durationMs,
        timedOut: !!timeoutMs && durationMs >= timeoutMs,
      });
    });
  });
};

const buildSummary = (
  verdictCode: JudgeSummary["verdictCode"],
  passed: number,
  failed: number,
  runtimeMs: number,
  total: number,
): JudgeSummary => ({
  verdictCode,
  passed,
  failed,
  errored: verdictCode === "RE" || verdictCode === "CE" ? 1 : 0,
  total,
  runtimeMs,
  memoryKb: 0,
  startedAt: new Date(),
  finishedAt: new Date(),
});

const normalizeOutput = (value: string) => value.replace(/\s+$/g, "").trim();
