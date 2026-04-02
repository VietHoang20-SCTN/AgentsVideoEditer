import { Worker, Job } from "bullmq";
import { redis } from "@/lib/queue/connection";
import { ProjectService } from "@/server/services/project.service";
import { PlanningService } from "@/server/services/planning.service";
import { BackgroundJobService } from "@/server/services/background-job.service";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { jobDuration } from "@/lib/metrics";

const log = logger.child({ module: "planning-worker" });

interface PlanningJobData {
  projectId: string;
}

async function processPlanning(job: Job<PlanningJobData>) {
  const { projectId } = job.data;
  const startTime = Date.now();
  const endTimer = jobDuration.startTimer({ queue: 'planning' });
  log.info("Job started", { jobId: job.id, projectId, queue: 'planning', attempt: job.attemptsMade + 1 });

  const bgJob = job.id ? await BackgroundJobService.findByQueueJobId(job.id) : null;
  const bgJobId = bgJob?.id ?? null;

  try {
    if (bgJobId) await BackgroundJobService.markRunning(bgJobId);

    // Worker is the sole owner of this transition
    await ProjectService.markPlanning(projectId);

    await job.updateProgress(10);
    if (bgJobId) await BackgroundJobService.updateProgress(bgJobId, 10);

    const editPlan = await PlanningService.generate(projectId);

    await job.updateProgress(90);
    if (bgJobId) await BackgroundJobService.updateProgress(bgJobId, 90);

    await ProjectService.markPlanned(projectId);
    await job.updateProgress(100);

    if (bgJobId) await BackgroundJobService.markCompleted(bgJobId);

    log.info("Job completed", { jobId: job.id, projectId, queue: 'planning', durationMs: Date.now() - startTime });
    endTimer({ status: 'success' });
    return { success: true, projectId, planId: editPlan.id };
  } catch (err) {
    log.error("Job failed", {
      jobId: job.id,
      projectId,
      queue: 'planning',
      err,
      attempt: job.attemptsMade,
    });

    if (bgJobId) {
      try {
        await BackgroundJobService.markFailed(bgJobId, (err as Error).message);
      } catch (cleanupErr) {
        log.warn('Non-critical error suppressed', { err: cleanupErr, module: 'planning-job' });
      }
    }

    try {
      await ProjectService.markFailed(projectId);
    } catch (cleanupErr) {
      log.warn('Non-critical error suppressed', { err: cleanupErr, module: 'planning-job' });
    }

    endTimer({ status: 'failure' });
    throw err;
  }
}

export function startPlanningWorker() {
  const worker = new Worker("planning", processPlanning, {
    connection: redis,
    concurrency: env.WORKER_PLANNING_CONCURRENCY,
    stalledInterval: 30_000,
    maxStalledCount: 2,
  });

  worker.on("completed", (job) => {
    log.info("Planning job completed", { jobId: job.id, projectId: job.data.projectId });
  });

  worker.on("failed", (job, err) => {
    log.error("Planning job failed", {
      jobId: job?.id,
      projectId: job?.data.projectId,
      error: err.message,
    });
  });

  worker.on("error", (err) => {
    log.error("BullMQ worker error", { err, module: "planning-worker" });
  });

  return worker;
}
