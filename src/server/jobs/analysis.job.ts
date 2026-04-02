import { Worker, Job } from "bullmq";
import { redis } from "@/lib/queue/connection";
import { prisma } from "@/lib/db/prisma";
import { storage } from "@/lib/storage/factory";
import { ProjectService } from "@/server/services/project.service";
import { AnalysisService } from "@/server/services/analysis.service";
import { RiskService } from "@/server/services/risk.service";
import { BackgroundJobService, StepStatus, type StepResults, type StepResult } from "@/server/services/background-job.service";
import { analyzeTranscript, analyzeScenes, analyzeOcr, analyzeAudio } from "@/lib/media/analyzers";
import { analysisReportSchema } from "@/lib/validators/analysis";
import { buildAnalysisContext, generateAIAnalysis } from "@/lib/ai/video-analysis";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { jobDuration } from "@/lib/metrics";

const log = logger.child({ module: "analysis-worker" });

interface AnalysisJobData {
  projectId: string;
  mediaAssetId: string;
}

async function resolveBackgroundJobId(job: Job<AnalysisJobData>): Promise<string | null> {
  if (!job.id) return null;
  const bgJob = await BackgroundJobService.findByQueueJobId(job.id);
  return bgJob?.id ?? null;
}

async function runStep<T>(
  stepName: string,
  fn: () => Promise<T | null>
): Promise<{ result: T | null; stepResult: StepResult }> {
  const start = Date.now();
  try {
    const result = await fn();
    const durationMs = Date.now() - start;
    if (result === null) {
      return { result: null, stepResult: { status: StepStatus.SKIPPED, durationMs } };
    }
    return { result, stepResult: { status: StepStatus.COMPLETED, durationMs } };
  } catch (err) {
    const durationMs = Date.now() - start;
    log.error(`Step ${stepName} failed`, { error: (err as Error).message });
    return {
      result: null,
      stepResult: {
        status: StepStatus.FAILED,
        durationMs,
        error: (err as Error).message,
      },
    };
  }
}

async function processAnalysis(job: Job<AnalysisJobData>) {
  const { projectId, mediaAssetId } = job.data;
  const startTime = Date.now();
  const endTimer = jobDuration.startTimer({ queue: 'analysis' });
  log.info("Job started", { jobId: job.id, projectId, queue: 'analysis', attempt: job.attemptsMade + 1 });
  const bgJobId = await resolveBackgroundJobId(job);

  const stepResults: StepResults = {};

  try {
    // Mark background job as running
    if (bgJobId) {
      await BackgroundJobService.markRunning(bgJobId);
    }

    // Worker is the sole owner of this transition
    await ProjectService.markAnalyzing(projectId);

    // Get the media asset to find the file path
    const mediaAsset = await prisma.mediaAsset.findUnique({
      where: { id: mediaAssetId },
    });

    if (!mediaAsset) {
      throw new Error(`MediaAsset ${mediaAssetId} not found`);
    }

    const videoPath = storage.getPath(mediaAsset.storageKey);
    const durationMs = mediaAsset.durationMs || 0;

    // Fetch user AI settings for this project (user-configured key takes priority over env)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { user: { select: { aiApiKey: true, aiBaseUrl: true } } },
    });
    const userSettings = project?.user ?? undefined;

    // Step 1: Scene detection (5% → 30%)
    log.info("Step 1/5: Scene detection");
    await job.updateProgress(5);
    if (bgJobId) await BackgroundJobService.updateProgress(bgJobId, 5, stepResults);

    const { result: scenes, stepResult: scenesStep } = await runStep(
      "scenes",
      () => analyzeScenes(videoPath)
    );
    stepResults.scenes = scenesStep;
    await job.updateProgress(30);
    if (bgJobId) await BackgroundJobService.updateProgress(bgJobId, 30, stepResults);

    // Step 2: OCR (30% → 55%)
    log.info("Step 2/5: OCR analysis");
    const { result: ocr, stepResult: ocrStep } = await runStep(
      "ocr",
      () => analyzeOcr(videoPath, durationMs)
    );
    stepResults.ocr = ocrStep;
    await job.updateProgress(55);
    if (bgJobId) await BackgroundJobService.updateProgress(bgJobId, 55, stepResults);

    // Step 3: Transcription (55% → 80%) — uses OCR+scene as fallback context for GPT synthesis
    log.info("Step 3/5: Transcription");
    const ocrText = ocr?.frames.map(f => f.text).filter(Boolean).join(" ") ?? "";
    const { result: transcript, stepResult: transcriptStep } = await runStep(
      "transcript",
      () => analyzeTranscript(videoPath, userSettings, {
        ocrText,
        sceneCount: scenes?.scenes?.length ?? 0,
        durationMs,
      })
    );
    stepResults.transcript = transcriptStep;
    await job.updateProgress(80);
    if (bgJobId) await BackgroundJobService.updateProgress(bgJobId, 80, stepResults);

    // Step 4: Audio analysis (80% → 90%)
    log.info("Step 4/5: Audio analysis");
    const { result: audio, stepResult: audioStep } = await runStep(
      "audio",
      () => analyzeAudio(videoPath)
    );
    stepResults.audio = audioStep;
    await job.updateProgress(90);
    if (bgJobId) await BackgroundJobService.updateProgress(bgJobId, 90, stepResults);

    // Step 5: AI Analysis (90% → 95%) — non-fatal
    log.info("Step 5/5: AI analysis");
    let aiAnalysisResult: unknown = null;
    try {
      const partialReport = analysisReportSchema.parse({
        transcript,
        scenes,
        ocr,
        audio,
      });
      const context = buildAnalysisContext(partialReport);
      if (context.trim().length > 0) {
        const aiResult = await generateAIAnalysis(context, userSettings ? {
          aiApiKey: userSettings.aiApiKey ?? undefined,
          aiBaseUrl: userSettings.aiBaseUrl ?? undefined,
        } : undefined);
        aiAnalysisResult = aiResult;
        stepResults.aiAnalysis = { status: StepStatus.COMPLETED, durationMs: 0 };
        log.info("AI analysis completed successfully", { projectId });
      } else {
        stepResults.aiAnalysis = { status: StepStatus.SKIPPED, durationMs: 0 };
        log.info("AI analysis skipped: no context data available", { projectId });
      }
    } catch (aiErr) {
      stepResults.aiAnalysis = {
        status: StepStatus.FAILED,
        durationMs: 0,
        error: (aiErr as Error).message,
      };
      log.warn("AI analysis failed (non-fatal)", {
        projectId,
        error: (aiErr as Error).message,
      });
    }
    await job.updateProgress(95);
    if (bgJobId) await BackgroundJobService.updateProgress(bgJobId, 95, stepResults);

    // Validate report with Zod
    const report = analysisReportSchema.parse({
      transcript,
      scenes,
      ocr,
      audio,
    });

    const totalDurationMs = Date.now() - startTime;

    // Persist report with step statuses (including AI analysis)
    await AnalysisService.upsert(projectId, report, stepResults, totalDurationMs, aiAnalysisResult);

    // Auto-generate risk report from analysis
    try {
      await RiskService.generateFromAnalysis(projectId, report);
      log.info("Risk report generated", { projectId });
    } catch (riskErr) {
      log.warn("Risk report generation failed (non-fatal)", {
        projectId,
        error: (riskErr as Error).message,
      });
    }

    // Update project status
    await ProjectService.markAnalyzed(projectId);
    await job.updateProgress(100);

    // Mark background job completed
    if (bgJobId) {
      await BackgroundJobService.markCompleted(bgJobId, stepResults);
    }

    log.info("Job completed", { jobId: job.id, projectId, queue: 'analysis', durationMs: totalDurationMs });
    endTimer({ status: 'success' });
    return { success: true, projectId };
  } catch (err) {
    log.error("Job failed", {
      jobId: job.id,
      projectId,
      queue: 'analysis',
      err,
      attempt: job.attemptsMade,
    });

    // Mark background job failed
    if (bgJobId) {
      try {
        await BackgroundJobService.markFailed(bgJobId, (err as Error).message, stepResults);
      } catch (cleanupErr) {
        log.warn('Non-critical error suppressed', { err: cleanupErr, module: 'analysis-job' });
      }
    }

    // Set project status to FAILED
    try {
      await ProjectService.markFailed(projectId);
    } catch (cleanupErr) {
      log.warn('Non-critical error suppressed', { err: cleanupErr, module: 'analysis-job' });
    }

    endTimer({ status: 'failure' });
    throw err;
  }
}

export function startAnalysisWorker() {
  const worker = new Worker("analysis", processAnalysis, {
    connection: redis,
    concurrency: env.WORKER_ANALYSIS_CONCURRENCY,
    stalledInterval: 30_000,
    maxStalledCount: 2,
  });

  worker.on("completed", (job) => {
    log.info("Job completed", { jobId: job.id, projectId: job.data.projectId });
  });

  worker.on("failed", (job, err) => {
    log.error("Job failed", {
      jobId: job?.id,
      projectId: job?.data.projectId,
      error: err.message,
    });
  });

  worker.on("error", (err) => {
    log.error("BullMQ worker error", { err, module: "analysis-worker" });
  });

  return worker;
}
