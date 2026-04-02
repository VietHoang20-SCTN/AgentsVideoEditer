import { Worker, Job } from "bullmq";
import { redis } from "@/lib/queue/connection";
import { prisma } from "@/lib/db/prisma";
import { storage } from "@/lib/storage/factory";
import { ProjectService } from "@/server/services/project.service";
import { PlanningService } from "@/server/services/planning.service";
import { RenderService } from "@/server/services/render.service";
import { BackgroundJobService } from "@/server/services/background-job.service";
import { executeRenderPlan, type RenderPlan } from "@/lib/render/ffmpeg-plan-runner";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { jobDuration } from "@/lib/metrics";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs/promises";

const log = logger.child({ module: "render-worker" });

interface RenderJobData {
  projectId: string;
  renderJobId: string;
}

async function processRender(job: Job<RenderJobData>) {
  const { projectId, renderJobId } = job.data;
  const startTime = Date.now();
  const endTimer = jobDuration.startTimer({ queue: 'render' });
  log.info("Job started", { jobId: job.id, projectId, queue: 'render', attempt: job.attemptsMade + 1 });

  const bgJob = job.id ? await BackgroundJobService.findByQueueJobId(job.id) : null;
  const bgJobId = bgJob?.id ?? null;

  try {
    if (bgJobId) await BackgroundJobService.markRunning(bgJobId);
    await RenderService.markRunning(renderJobId);

    // Worker is the sole owner of this transition
    await ProjectService.markRendering(projectId);

    await job.updateProgress(5);
    if (bgJobId) await BackgroundJobService.updateProgress(bgJobId, 5);

    // Load the latest edit plan
    const editPlan = await PlanningService.getLatestByProjectId(projectId);
    if (!editPlan) {
      throw new Error("No edit plan found. Generate a plan first.");
    }

    const planJson = editPlan.planJson as unknown as RenderPlan;
    if (!planJson.segments || !planJson.outputFormat) {
      throw new Error("Edit plan is malformed — missing segments or outputFormat.");
    }

    // Get source video path
    const sourceAsset = await prisma.mediaAsset.findFirst({
      where: { projectId, type: "SOURCE_VIDEO" },
    });
    if (!sourceAsset) {
      throw new Error("No source video found.");
    }

    const inputPath = storage.getPath(sourceAsset.storageKey);

    // Create output filename
    const outputFileName = `rendered_${uuidv4().substring(0, 8)}.mp4`;
    const outputStorageKey = `renders/${projectId}/${outputFileName}`;
    const outputPath = storage.getPath(outputStorageKey);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    await job.updateProgress(10);
    if (bgJobId) await BackgroundJobService.updateProgress(bgJobId, 10);

    // Execute FFmpeg render
    const result = await executeRenderPlan(inputPath, outputPath, planJson);

    await job.updateProgress(85);
    if (bgJobId) await BackgroundJobService.updateProgress(bgJobId, 85);

    // Get output file stats
    const stat = await fs.stat(outputPath);

    // Create media asset for the rendered output
    const outputAsset = await prisma.mediaAsset.create({
      data: {
        projectId,
        type: "RENDERED_VIDEO",
        storageKey: outputStorageKey,
        fileName: outputFileName,
        mimeType: "video/mp4",
        sizeBytes: stat.size,
        width: planJson.outputFormat.width,
        height: planJson.outputFormat.height,
        fps: planJson.outputFormat.fps,
      },
    });

    // Fix #8: Increment user's disk usage by the rendered file size
    const projectForUser = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });
    if (projectForUser && stat.size > 0) {
      await prisma.user.update({
        where: { id: projectForUser.userId },
        data: { diskUsageBytes: { increment: stat.size } },
      });
    }

    // Mark render job completed
    await RenderService.markCompleted(renderJobId, outputAsset.id, result.logs);

    // Transition project
    await ProjectService.markRendered(projectId);

    await job.updateProgress(100);
    if (bgJobId) await BackgroundJobService.markCompleted(bgJobId);

    log.info("Job completed", {
      projectId,
      queue: 'render',
      jobId: job.id,
      durationMs: Date.now() - startTime,
      outputAssetId: outputAsset.id,
    });
    endTimer({ status: 'success' });
    return { success: true, projectId, outputAssetId: outputAsset.id };
  } catch (err) {
    log.error("Job failed", {
      jobId: job.id,
      projectId,
      queue: 'render',
      err,
      attempt: job.attemptsMade,
    });

    try {
      await RenderService.markFailed(renderJobId, (err as Error).message);
    } catch (cleanupErr) {
      log.warn('Non-critical error suppressed', { err: cleanupErr, module: 'render-job' });
    }

    if (bgJobId) {
      try {
        await BackgroundJobService.markFailed(bgJobId, (err as Error).message);
      } catch (cleanupErr) {
        log.warn('Non-critical error suppressed', { err: cleanupErr, module: 'render-job' });
      }
    }

    try {
      await ProjectService.markFailed(projectId);
    } catch (cleanupErr) {
      log.warn('Non-critical error suppressed', { err: cleanupErr, module: 'render-job' });
    }

    endTimer({ status: 'failure' });
    throw err;
  }
}

export function startRenderWorker() {
  const worker = new Worker("render", processRender, {
    connection: redis,
    concurrency: env.WORKER_RENDER_CONCURRENCY,
    stalledInterval: 30_000,
    maxStalledCount: 2,
  });

  worker.on("completed", (job) => {
    log.info("Render job completed", { jobId: job.id, projectId: job.data.projectId });
  });

  worker.on("failed", (job, err) => {
    log.error("Render job failed", {
      jobId: job?.id,
      projectId: job?.data.projectId,
      error: err.message,
    });
  });

  worker.on("error", (err) => {
    log.error("BullMQ worker error", { err, module: "render-worker" });
  });

  return worker;
}
