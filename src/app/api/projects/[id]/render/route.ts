import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/server/api/response";
import { prisma } from "@/lib/db/prisma";
import { renderQueue } from "@/lib/queue/queues";
import { RenderService } from "@/server/services/render.service";
import { PlanningService } from "@/server/services/planning.service";
import { BackgroundJobService } from "@/server/services/background-job.service";
import { JobType, ProjectStatus } from "@/generated/prisma/client";
import { redis } from "@/lib/queue/connection";
import { rateLimit } from "@/lib/rate-limit";
import { withTiming } from "@/lib/api/with-timing";
import { withErrorHandler } from "@/lib/api/errors";

/** GET — retrieve latest render job + output */
async function handleGET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const { id: projectId } = await params;

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  });
  if (!project) return apiError("Project not found", 404);

  const latestRender = await RenderService.getLatestByProjectId(projectId);
  const activeJob = await BackgroundJobService.findActive(projectId, JobType.RENDER);
  const latestBgJob = activeJob ?? await BackgroundJobService.getLatest(projectId, JobType.RENDER);

  let renderStatus: string = "not_started";
  if (activeJob?.status === "QUEUED") renderStatus = "queued";
  else if (activeJob?.status === "RUNNING") renderStatus = "running";
  else if (latestRender?.status === "COMPLETED") renderStatus = "completed";
  else if (latestRender?.status === "FAILED" || latestBgJob?.status === "FAILED") renderStatus = "failed";

  return apiSuccess({
    projectId,
    renderStatus,
    job: latestBgJob
      ? {
          id: latestBgJob.id,
          status: latestBgJob.status,
          progress: latestBgJob.progress,
          errorMessage: latestBgJob.errorMessage,
        }
      : null,
    render: latestRender
      ? {
          id: latestRender.id,
          status: latestRender.status,
          errorMessage: latestRender.errorMessage,
          startedAt: latestRender.startedAt,
          finishedAt: latestRender.finishedAt,
          output: latestRender.outputMediaAsset
            ? {
                id: latestRender.outputMediaAsset.id,
                fileName: latestRender.outputMediaAsset.fileName,
                storageKey: latestRender.outputMediaAsset.storageKey,
                sizeBytes: latestRender.outputMediaAsset.sizeBytes,
                width: latestRender.outputMediaAsset.width,
                height: latestRender.outputMediaAsset.height,
              }
            : null,
        }
      : null,
  });
}

/** POST — start a new render */
async function handlePOST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const { id: projectId } = await params;

  // --- Rate limiting: 10 render requests per minute per user ---
  const rl = await rateLimit(redis, `ratelimit:${session.user.id}:render`, 10, 60);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfter: rl.resetAt },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.resetAt - Date.now() / 1000)) },
      }
    );
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  });
  if (!project) return apiError("Project not found", 404);

  if (
    project.status !== ProjectStatus.PLANNED &&
    project.status !== ProjectStatus.RENDERED &&
    project.status !== ProjectStatus.FAILED
  ) {
    return apiError(
      `Cannot start render when project status is ${project.status}. A plan must be generated first.`,
      400
    );
  }

  // Ensure plan exists
  const latestPlan = await PlanningService.getLatestByProjectId(projectId);
  if (!latestPlan) {
    return apiError("No edit plan found. Generate a plan first.", 400);
  }

  // Check for active render job
  const activeJob = await BackgroundJobService.findActive(projectId, JobType.RENDER);
  if (activeJob) {
    return apiSuccess({
      status: "already_active",
      jobId: activeJob.id,
      message: "A render job is already active for this project.",
    });
  }

  // Create RenderJob record
  const renderJob = await RenderService.create(projectId, latestPlan.promptVersion);

  // Enqueue — Fix #6: retry with exponential backoff
  const deterministicJobId = `render-${projectId}`;
  const queueJob = await renderQueue.add(
    "render",
    { projectId, renderJobId: renderJob.id },
    {
      jobId: deterministicJobId,
      attempts: 2,
      backoff: { type: "exponential", delay: 10000 },
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86400 },
    }
  );

  // Track in background jobs
  await BackgroundJobService.create(
    projectId,
    JobType.RENDER,
    queueJob.id ?? deterministicJobId
  );

  return apiSuccess({
    status: "queued",
    renderJobId: renderJob.id,
    message: "Render job enqueued",
  });
}

export const GET = withTiming(
  withErrorHandler(handleGET as Parameters<typeof withTiming>[0]),
  "render-get"
);

export const POST = withTiming(
  withErrorHandler(handlePOST as Parameters<typeof withTiming>[0]),
  "render-post"
);
