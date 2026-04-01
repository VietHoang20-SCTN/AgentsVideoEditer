import { prisma } from "@/lib/db/prisma";
import { generateEditPlan, getPromptVersion, type EditPlanInput } from "@/lib/ai/edit-plan";
import { AnalysisService } from "./analysis.service";
import { RiskService } from "./risk.service";
import { analysisReportSchema } from "@/lib/validators/analysis";
import type { Prisma } from "@/generated/prisma/client";

export class PlanningService {
  static async getLatestByProjectId(projectId: string) {
    return prisma.editPlan.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async listByProjectId(projectId: string) {
    return prisma.editPlan.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Generate and persist an edit plan from analysis + risk data.
   */
  static async generate(projectId: string) {
    // Load analysis
    const analysisReport = await AnalysisService.getByProjectId(projectId);
    if (!analysisReport) {
      throw new Error("No analysis report found — run analysis first.");
    }

    const parsed = analysisReportSchema.safeParse({
      transcript: analysisReport.transcriptJson,
      scenes: analysisReport.scenesJson,
      ocr: analysisReport.ocrJson,
      audio: analysisReport.audioJson,
    });
    if (!parsed.success) {
      throw new Error("Analysis data is malformed.");
    }

    // Load risk report
    const riskReport = await RiskService.getByProjectId(projectId);

    // Load source video metadata
    const sourceAsset = await prisma.mediaAsset.findFirst({
      where: { projectId, type: "SOURCE_VIDEO" },
    });

    const planInput: EditPlanInput = {
      transcript: parsed.data.transcript,
      scenes: parsed.data.scenes,
      ocr: parsed.data.ocr,
      audio: parsed.data.audio,
      riskReport: riskReport
        ? {
            overallScore: riskReport.overallScore,
            watermarkScore: riskReport.watermarkScore,
            audioReuseScore: riskReport.audioReuseScore,
            lowTransformationScore: riskReport.lowTransformationScore,
            notes: riskReport.notesJson as string[] | null,
          }
        : null,
      sourceMetadata: {
        durationMs: sourceAsset?.durationMs ?? undefined,
        width: sourceAsset?.width ?? undefined,
        height: sourceAsset?.height ?? undefined,
        fps: sourceAsset?.fps ?? undefined,
      },
    };

    const plan = generateEditPlan(planInput);

    // Persist
    const editPlan = await prisma.editPlan.create({
      data: {
        projectId,
        modelName: "heuristic-v1",
        promptVersion: getPromptVersion(),
        planJson: plan as unknown as Prisma.InputJsonValue,
        scriptText: plan.hookSuggestion,
        titleOptionsJson: plan.titleOptions as unknown as Prisma.InputJsonValue,
        descriptionOptionsJson: plan.descriptionOptions as unknown as Prisma.InputJsonValue,
        hashtagOptionsJson: plan.hashtagOptions as unknown as Prisma.InputJsonValue,
      },
    });

    return editPlan;
  }
}
