import { env } from "@/lib/env";

export const JUDGE_EXCHANGES = {
  submissions: "judge.submissions",
  rejudge: "judge.rejudge",
  manual: "judge.manual",
  dlx: "judge.DLX",
} as const;

export const JUDGE_QUEUES = {
  submissions: "judge.submissions.q",
  rejudge: "judge.rejudge.q",
  manual: "judge.manual.q",
  retry1m: "judge.retry.1m.q",
  retry5m: "judge.retry.5m.q",
  retry30m: "judge.retry.30m.q",
} as const;

export const RETRY_SEQUENCE: Array<keyof typeof JUDGE_QUEUES> = [
  "retry1m",
  "retry5m",
  "retry30m",
];

export type SandboxProfileConfig = {
  image: string;
  memoryMb: number;
  cpuShares: number;
  env?: Record<string, string>;
};

export const SANDBOX_PROFILES: Record<string, SandboxProfileConfig> = {
  cpp: { image: "gcc:13", memoryMb: 1024, cpuShares: 2 },
  python: { image: "python:3.11-slim", memoryMb: 768, cpuShares: 2 },
  java: { image: "eclipse-temurin:21-jdk", memoryMb: 1024, cpuShares: 2 },
  node: { image: "node:20-slim", memoryMb: 768, cpuShares: 2 },
  default: { image: "node:20-slim", memoryMb: 512, cpuShares: 1 },
};

export const JUDGE_WORKSPACE_ROOT =
  env.JUDGE_SANDBOX_WORKDIR ?? "/tmp/opensolve-judge/workspaces";
