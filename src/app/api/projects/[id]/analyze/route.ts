import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/server/api/response";
import { prisma } from "@/lib/db/prisma";
import { analysisQueue } from "@/lib/queue/queues";
import { BackgroundJobService } from "@/server/services/background-job.service";
import { JobType, ProjectStatus } from "@/generated/prisma/client";
import { redis } from "@/lib/queue/connection";
import { rateLimit } from "@/lib/rate-limit";
import { OpenAINotConfiguredError, getAIClientConfig } from "@/lib/ai";
import { getRequestLogger } from "@/lib/logger";
import { withTiming } from "@/lib/api/with-timing";
import { withErrorHandler } from "@/lib/api/errors";

async function handlePOST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  // Fail-fast: check AI key with user-context (DB key > env var fallback)
  const userSettings = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { aiApiKey: true, aiBaseUrl: true },
  });
  try {
    getAIClientConfig(userSettings ?? undefined);
  } catch (err) {
    const e = err as { statusCode?: number; message?: string };
    if (e?.statusCode === 501 || err instanceof OpenAINotConfiguredError) {
      return apiError(e.message ?? "AI API key not configured", 501);
    }
    throw err;
  }

  const { id: projectId } = await params;

  // Request-ID tracing
  const requestId = req.headers.get("x-request-id") ?? "unknown";
  const log = getRequestLogger(requestId);
  log.info("Starting analysis", { projectId });

  // --- Rate limiting: 10 analyze requests per minute per user ---
  const rl = await rateLimit(redis, `ratelimit:${session.user.id}:analyze`, 10, 60);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfter: rl.resetAt },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.resetAt - Date.now() / 1000)) },
      }
    );
  }

  // Verify project ownership
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
    include: { mediaAssets: { where: { type: "SOURCE_VIDEO" }, take: 1 } },
  });

  if (!project) return apiError("Project not found", 404);

  // Only allow analysis from valid states
  if (
    project.status !== ProjectStatus.UPLOADED &&
    project.status !== ProjectStatus.ANALYZED &&
    project.status !== ProjectStatus.FAILED
  ) {
    return apiError(
      `Cannot start analysis when project status is ${project.status}`,
      400
    );
  }

  const sourceVideo = project.mediaAssets[0];
  if (!sourceVideo) {
    return apiError("No source video found. Please upload a video first.", 400);
  }

  // Check for active (QUEUED/RUNNING) analysis job — prevent duplicates
  const activeJob = await BackgroundJobService.findActive(
    projectId,
    JobType.ANALYSIS
  );
  if (activeJob) {
    return apiSuccess({
      status: "already_active",
      jobId: activeJob.id,
      message: "An analysis job is already active for this project.",
    });
  }

  // Enqueue with deterministic job id to prevent BullMQ-level duplicates
  const deterministicJobId = `analysis-${projectId}`;
  log.info("Enqueueing analysis job", { projectId, deterministicJobId });
  let queueJob;
  try {
    queueJob = await analysisQueue.add(
      "analyze",
      { projectId, mediaAssetId: sourceVideo.id },
      {
        jobId: deterministicJobId,
        attempts: 2,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
      }
    );
  } catch (err) {
    const e = err as { message?: string; stack?: string };
    log.error("Failed to enqueue analysis job", { error: e?.message, stack: e?.stack });
    return apiError(`Failed to enqueue job: ${e?.message}`, 500);
  }
  log.info("Queue job created", { queueJobId: queueJob.id });

  // Persist job record in DB — project status stays unchanged until worker picks it up
  let bgJob;
  try {
    bgJob = await BackgroundJobService.create(
      projectId,
      JobType.ANALYSIS,
      queueJob.id ?? deterministicJobId
    );
  } catch (err) {
    const e = err as { message?: string; stack?: string };
    log.error("Failed to create BackgroundJob record", { error: e?.message, stack: e?.stack });
    return apiError(`Failed to create job record: ${e?.message}`, 500);
  }

  log.info("Analysis job enqueued", { projectId, jobId: bgJob.id });

  return apiSuccess({
    status: "queued",
    jobId: bgJob.id,
    queueJobId: queueJob.id,
    message: "Analysis job enqueued",
  });
}

export const POST = withTiming(
  withErrorHandler(handlePOST as Parameters<typeof withTiming>[0]),
  "analyze"
);
