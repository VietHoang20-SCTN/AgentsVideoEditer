import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/server/api/response";
import { prisma } from "@/lib/db/prisma";
import { planningQueue } from "@/lib/queue/queues";
import { PlanningService } from "@/server/services/planning.service";
import { BackgroundJobService } from "@/server/services/background-job.service";
import { JobType, ProjectStatus } from "@/generated/prisma/client";
import { OpenAINotConfiguredError, getAIClientConfig } from "@/lib/ai";
import { withTiming } from "@/lib/api/with-timing";
import { withErrorHandler } from "@/lib/api/errors";

/** GET — retrieve latest edit plan */
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

  const latestPlan = await PlanningService.getLatestByProjectId(projectId);
  const activeJob = await BackgroundJobService.findActive(projectId, JobType.PLANNING);
  const latestJob = activeJob ?? await BackgroundJobService.getLatest(projectId, JobType.PLANNING);

  let planStatus: string = "not_started";
  if (activeJob?.status === "QUEUED") planStatus = "queued";
  else if (activeJob?.status === "RUNNING") planStatus = "running";
  else if (latestPlan) planStatus = "completed";
  else if (latestJob?.status === "FAILED") planStatus = "failed";

  return apiSuccess({
    projectId,
    planStatus,
    job: latestJob
      ? {
          id: latestJob.id,
          status: latestJob.status,
          progress: latestJob.progress,
          errorMessage: latestJob.errorMessage,
        }
      : null,
    plan: latestPlan
      ? {
          id: latestPlan.id,
          modelName: latestPlan.modelName,
          promptVersion: latestPlan.promptVersion,
          planJson: latestPlan.planJson,
          scriptText: latestPlan.scriptText,
          titleOptions: latestPlan.titleOptionsJson,
          descriptionOptions: latestPlan.descriptionOptionsJson,
          hashtagOptions: latestPlan.hashtagOptionsJson,
          createdAt: latestPlan.createdAt,
        }
      : null,
  });
}

/** POST — enqueue a new plan generation */
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

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  });
  if (!project) return apiError("Project not found", 404);

  // Must have analysis completed
  if (
    project.status !== ProjectStatus.ANALYZED &&
    project.status !== ProjectStatus.PLANNED &&
    project.status !== ProjectStatus.FAILED
  ) {
    return apiError(
      `Cannot generate plan when project status is ${project.status}. Analysis must be complete first.`,
      400
    );
  }

  // Check for active planning job
  const activeJob = await BackgroundJobService.findActive(projectId, JobType.PLANNING);
  if (activeJob) {
    return apiSuccess({
      status: "already_active",
      jobId: activeJob.id,
      message: "A planning job is already active for this project.",
    });
  }

  const deterministicJobId = `planning-${projectId}`;
  const queueJob = await planningQueue.add(
    "plan",
    { projectId },
    {
      jobId: deterministicJobId,
      attempts: 2,
      backoff: { type: "exponential", delay: 3000 },
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86400 },
    }
  );

  const bgJob = await BackgroundJobService.create(
    projectId,
    JobType.PLANNING,
    queueJob.id ?? deterministicJobId
  );

  return apiSuccess({
    status: "queued",
    jobId: bgJob.id,
    message: "Planning job enqueued",
  });
}

export const GET = withTiming(
  withErrorHandler(handleGET as Parameters<typeof withTiming>[0]),
  "plan-get"
);

export const POST = withTiming(
  withErrorHandler(handlePOST as Parameters<typeof withTiming>[0]),
  "plan-post"
);
