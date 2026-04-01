import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/server/api/response";
import { prisma } from "@/lib/db/prisma";
import { RiskService } from "@/server/services/risk.service";
import { AnalysisService } from "@/server/services/analysis.service";
import { analysisReportSchema } from "@/lib/validators/analysis";

export async function GET(
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

  const riskReport = await RiskService.getByProjectId(projectId);

  if (!riskReport) {
    return apiSuccess({
      projectId,
      status: "not_generated",
      risk: null,
    });
  }

  return apiSuccess({
    projectId,
    status: "available",
    risk: {
      overallScore: riskReport.overallScore,
      watermarkScore: riskReport.watermarkScore,
      audioReuseScore: riskReport.audioReuseScore,
      lowTransformationScore: riskReport.lowTransformationScore,
      notes: riskReport.notesJson,
      createdAt: riskReport.createdAt,
      updatedAt: riskReport.updatedAt,
    },
  });
}

/** POST to (re)generate risk report from latest analysis */
export async function POST(
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

  const analysisReport = await AnalysisService.getByProjectId(projectId);
  if (!analysisReport) {
    return apiError("No analysis report exists. Run analysis first.", 400);
  }

  // Reconstruct the analysis report type from stored JSON
  const parsed = analysisReportSchema.safeParse({
    transcript: analysisReport.transcriptJson,
    scenes: analysisReport.scenesJson,
    ocr: analysisReport.ocrJson,
    audio: analysisReport.audioJson,
  });

  if (!parsed.success) {
    return apiError("Analysis data is malformed — cannot generate risk report.", 500);
  }

  const riskReport = await RiskService.generateFromAnalysis(projectId, parsed.data);

  return apiSuccess({
    projectId,
    status: "generated",
    risk: {
      overallScore: riskReport.overallScore,
      watermarkScore: riskReport.watermarkScore,
      audioReuseScore: riskReport.audioReuseScore,
      lowTransformationScore: riskReport.lowTransformationScore,
      notes: riskReport.notesJson,
      createdAt: riskReport.createdAt,
      updatedAt: riskReport.updatedAt,
    },
  });
}
