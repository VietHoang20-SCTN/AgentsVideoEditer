import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/server/api/response";
import { prisma } from "@/lib/db/prisma";
import { AnalysisService } from "@/server/services/analysis.service";
import { BackgroundJobService } from "@/server/services/background-job.service";
import { JobType } from "@/generated/prisma/client";

type AnalysisStatus = "not_started" | "queued" | "running" | "completed" | "failed";

function deriveAnalysisStatus(
  projectStatus: string,
  hasReport: boolean,
  activeJobStatus?: string,
  latestJobStatus?: string
): AnalysisStatus {
  if (activeJobStatus === "QUEUED") return "queued";
  if (activeJobStatus === "RUNNING") return "running";
  if (hasReport && (projectStatus === "ANALYZED" || projectStatus === "PLANNING" || projectStatus === "PLANNED" || projectStatus === "RENDERING" || projectStatus === "RENDERED")) {
    return "completed";
  }
  // Only show "failed" if the analysis job itself failed, not some other pipeline step
  if (latestJobStatus === "FAILED") return "failed";
  if (projectStatus === "ANALYZING") return "running";
  return "not_started";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const { id: projectId } = await params;

  // Verify project ownership
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  });

  if (!project) return apiError("Project not found", 404);

  // Get analysis report (may be null)
  const report = await AnalysisService.getByProjectId(projectId);

  // Get active or latest job
  const activeJob = await BackgroundJobService.findActive(projectId, JobType.ANALYSIS);
  const latestJob = activeJob ?? await BackgroundJobService.getLatest(projectId, JobType.ANALYSIS);

  const analysisStatus = deriveAnalysisStatus(
    project.status,
    !!report,
    activeJob?.status,
    latestJob?.status
  );

  return apiSuccess({
    projectId,
    analysisStatus,
    projectStatus: project.status,
    job: latestJob
      ? {
          id: latestJob.id,
          status: latestJob.status,
          progress: latestJob.progress,
          stepResults: latestJob.stepResults,
          errorMessage: latestJob.errorMessage,
          startedAt: latestJob.startedAt,
          finishedAt: latestJob.finishedAt,
          attempts: latestJob.attempts,
        }
      : null,
    analysis: report
      ? {
          transcript: report.transcriptJson,
          transcriptStatus: report.transcriptStatus,
          scenes: report.scenesJson,
          scenesStatus: report.scenesStatus,
          ocr: report.ocrJson,
          ocrStatus: report.ocrStatus,
          audio: report.audioJson,
          audioStatus: report.audioStatus,
          summary: report.summaryJson,
          version: report.version,
          durationMs: report.durationMs,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
        }
      : null,
  });
}
