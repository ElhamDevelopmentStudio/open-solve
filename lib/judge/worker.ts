import { hostname } from "node:os";
import type amqplib from "amqplib";
import { prisma } from "@/lib/prisma";
import { Prisma, SubmissionStatus } from "@prisma/client";
import { createConsumerChannel } from "@/lib/judge/queue";
import { JUDGE_QUEUES } from "@/lib/judge/config";
import { isJudgeSubmissionMessage, type JudgeSubmissionMessage } from "@/lib/judge/messages";
import { logger } from "@/lib/logger";
import { executeInSandbox } from "@/lib/judge/sandbox";
import { resolveSubmissionSource, resolveTestcaseIO } from "@/lib/judge/testcases";
import { publishManualReviewMessage } from "@/lib/judge/dispatcher";
import { env } from "@/lib/env";
import type { JudgeSummary } from "@/lib/submissions/types";
import { notifySubmissionUpdate } from "@/lib/realtime/notifications";

export class JudgeWorker {
  private nodeId = process.env.JUDGE_NODE_ID ?? hostname();

  async start() {
    const channel = await createConsumerChannel();
    if (!channel) {
      logger.warn("Judge worker disabled — RabbitMQ not configured");
      return;
    }
    const prefetch = env.JUDGE_RABBIT_PREFETCH ?? 2;
    await channel.prefetch(prefetch);
    logger.info({ prefetch }, "Judge worker online");
    await channel.consume(JUDGE_QUEUES.submissions, (msg) => this.handle(channel, msg));
    await channel.consume(JUDGE_QUEUES.rejudge, (msg) => this.handle(channel, msg));
  }

  private async handle(channel: amqplib.Channel, msg: amqplib.ConsumeMessage | null) {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString()) as JudgeSubmissionMessage;
      if (!isJudgeSubmissionMessage(payload)) {
        throw new Error("Invalid judge payload");
      }
      await this.processSubmission(payload);
      channel.ack(msg);
    } catch (error) {
      const submissionId =
        msg.properties.messageId ?? (() => {
          try {
            return JSON.parse(msg.content.toString()).submissionId;
          } catch {
            return undefined;
          }
        })();
      logger.error({ error, submissionId }, "judge worker failed to process submission");
      if (submissionId) {
        await prisma.submission
          .update({
            where: { id: submissionId },
            data: { status: SubmissionStatus.RETRYING },
          })
          .then(() => notifySubmissionUpdate(submissionId).catch(() => {}))
          .catch(() => {});
      }
      channel.nack(msg, false, false);
    }
  }

  private async processSubmission(payload: JudgeSubmissionMessage) {
    const submission = await prisma.submission.findFirst({
      where: {
        id: payload.submissionId,
      },
      include: {
        language: true,
        problem: { select: { id: true, judgeMode: true } },
        problemVersion: {
          select: {
            id: true,
            testCases: {
              orderBy: { ordinal: "asc" },
              select: {
                ordinal: true,
                kind: true,
                inputBlobRef: true,
                outputBlobRef: true,
                inputData: true,
                outputData: true,
                timeLimitMs: true,
                memoryLimitMb: true,
              },
            },
          },
        },
      },
    });

    if (!submission || !submission.problemVersion) {
      logger.warn({ submissionId: payload.submissionId }, "submission missing for judge");
      return;
    }
    if (
      submission.status === SubmissionStatus.SUCCEEDED ||
      submission.status === SubmissionStatus.FAILED ||
      submission.status === SubmissionStatus.MANUAL_PENDING
    ) {
      return;
    }

    const metadata = (submission.metadata ?? {}) as Prisma.JsonObject;
    const sourceCode = await resolveSubmissionSource({
      sourceCode: typeof metadata.sourceCode === "string" ? (metadata.sourceCode as string) : null,
      sourceRef: submission.sourceCodeRef,
    });
    if (!sourceCode) {
      throw new Error("source code missing");
    }

    await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: SubmissionStatus.RUNNING,
        startedAt: new Date(),
        judgeNodeId: this.nodeId,
      },
    });
    await notifySubmissionUpdate(submission.id);

    const tests = [];
    for (const test of submission.problemVersion.testCases) {
      const resolved = await resolveTestcaseIO({
        inputBlobRef: test.inputBlobRef,
        outputBlobRef: test.outputBlobRef,
        inputData: test.inputData,
        outputData: test.outputData,
      });
      tests.push({
        ordinal: test.ordinal,
        kind: test.kind,
        input: resolved.input,
        output: resolved.output,
        timeLimitMs: test.timeLimitMs,
        memoryLimitMb: test.memoryLimitMb,
      });
    }

    const result = await executeInSandbox({
      submissionId: submission.id,
      problemId: submission.problemId,
      language: submission.language,
      sourceCode,
      tests,
    });

    const mergedMetadata: Prisma.JsonObject & { autoSummary?: JudgeSummary } = {
      ...metadata,
      console: result.console,
      cases: result.cases,
    };

    if (submission.requiresManualReview) {
      mergedMetadata.autoSummary = result.summary;
    }

    const finalVerdict = submission.requiresManualReview
      ? "MANUAL_PENDING"
      : result.summary.verdictCode;
    const status = submission.requiresManualReview
      ? SubmissionStatus.MANUAL_PENDING
      : finalVerdict === "AC"
        ? SubmissionStatus.SUCCEEDED
        : SubmissionStatus.FAILED;

    await prisma.$transaction([
      prisma.submission.update({
        where: { id: submission.id },
        data: {
          status,
          verdictCode: finalVerdict,
          finishedAt: result.summary.finishedAt,
          timeUsedMs: result.summary.runtimeMs,
          memoryUsedKb: result.summary.memoryKb,
          metadata: mergedMetadata,
        },
      }),
      prisma.submissionCaseResult.deleteMany({ where: { submissionId: submission.id } }),
      prisma.submissionCaseResult.createMany({
        data: result.cases.map((caseResult) => ({
          submissionId: submission.id,
          testOrdinal: caseResult.ordinal,
          verdictCode: caseResult.verdictCode,
          timeMs: caseResult.runtimeMs,
          memoryKb: caseResult.memoryKb,
          stderrRef: caseResult.stderr,
        })),
      }),
    ]);
    await notifySubmissionUpdate(submission.id);

    if (submission.requiresManualReview) {
      await publishManualReviewMessage({
        submissionId: submission.id,
        problemId: submission.problemId,
        userId: submission.userId,
        reason: submission.problem.judgeMode === "HYBRID" ? "HYBRID" : "MANUAL_ONLY",
      });
    }
  }
}
