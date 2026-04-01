import { prisma } from "@/lib/db/prisma";
import { scoreRisk } from "@/lib/risk/scoring";
import type { AnalysisReport } from "@/lib/validators/analysis";
import type { Prisma } from "@/generated/prisma/client";

export class RiskService {
  static async getByProjectId(projectId: string) {
    return prisma.riskReport.findUnique({ where: { projectId } });
  }

  /**
   * Generate and persist a risk report from analysis data.
   * If a report already exists, it will be updated.
   */
  static async generateFromAnalysis(projectId: string, report: AnalysisReport) {
    const scores = scoreRisk(report);

    return prisma.riskReport.upsert({
      where: { projectId },
      create: {
        projectId,
        overallScore: scores.overallScore,
        watermarkScore: scores.watermarkScore,
        audioReuseScore: scores.audioReuseScore,
        lowTransformationScore: scores.lowTransformationScore,
        notesJson: scores.notes as unknown as Prisma.InputJsonValue,
      },
      update: {
        overallScore: scores.overallScore,
        watermarkScore: scores.watermarkScore,
        audioReuseScore: scores.audioReuseScore,
        lowTransformationScore: scores.lowTransformationScore,
        notesJson: scores.notes as unknown as Prisma.InputJsonValue,
      },
    });
  }
}
