import { prisma } from "@/lib/db/prisma";
import type { AnalysisReport } from "@/lib/validators/analysis";
import type { StepResults } from "./background-job.service";
import { StepStatus } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";

export interface AnalysisSummary {
  hasTranscript: boolean;
  transcriptLanguage?: string;
  segmentCount: number;
  sceneCount: number;
  watermarkDetected: boolean;
  silentSegmentCount: number;
  meanVolume?: number;
  ocrFrameCount: number;
  analyzedAt: string;
}

function buildSummary(report: AnalysisReport): AnalysisSummary {
  const transcript = report.transcript;
  const scenes = report.scenes;
  const ocr = report.ocr;
  const audio = report.audio;

  return {
    hasTranscript: !!transcript,
    transcriptLanguage: transcript?.language ?? undefined,
    segmentCount: transcript?.segments.length ?? 0,
    sceneCount: scenes?.scenes.length ?? 0,
    watermarkDetected: ocr?.watermarkDetected ?? false,
    silentSegmentCount: audio?.silentSegments.length ?? 0,
    meanVolume: audio?.meanVolume ?? undefined,
    ocrFrameCount: ocr?.frames.length ?? 0,
    analyzedAt: new Date().toISOString(),
  };
}

export class AnalysisService {
  static async getByProjectId(projectId: string) {
    return prisma.analysisReport.findUnique({
      where: { projectId },
    });
  }

  static async upsert(
    projectId: string,
    report: AnalysisReport,
    stepResults: StepResults,
    durationMs?: number,
    aiAnalysisJson?: unknown,
  ) {
    const summary = buildSummary(report);
    const summaryValue = JSON.parse(JSON.stringify(summary)) as Prisma.InputJsonValue;
    const metadataValue = { analyzedAt: new Date().toISOString() } as Prisma.InputJsonValue;
    const aiAnalysisValue = aiAnalysisJson
      ? (JSON.parse(JSON.stringify(aiAnalysisJson)) as Prisma.InputJsonValue)
      : undefined;
    const aiAnalysisStatus = aiAnalysisValue
      ? StepStatus.COMPLETED
      : (stepResults.aiAnalysis?.status ?? StepStatus.PENDING);

    return prisma.analysisReport.upsert({
      where: { projectId },
      create: {
        projectId,
        transcriptJson: report.transcript ?? undefined,
        transcriptStatus: stepResults.transcript?.status ?? StepStatus.PENDING,
        scenesJson: report.scenes ?? undefined,
        scenesStatus: stepResults.scenes?.status ?? StepStatus.PENDING,
        ocrJson: report.ocr ?? undefined,
        ocrStatus: stepResults.ocr?.status ?? StepStatus.PENDING,
        audioJson: report.audio ?? undefined,
        audioStatus: stepResults.audio?.status ?? StepStatus.PENDING,
        aiAnalysisJson: aiAnalysisValue,
        aiAnalysisStatus,
        summaryJson: summaryValue,
        metadataJson: metadataValue,
        durationMs,
      },
      update: {
        version: { increment: 1 },
        transcriptJson: report.transcript ?? undefined,
        transcriptStatus: stepResults.transcript?.status ?? StepStatus.PENDING,
        scenesJson: report.scenes ?? undefined,
        scenesStatus: stepResults.scenes?.status ?? StepStatus.PENDING,
        ocrJson: report.ocr ?? undefined,
        ocrStatus: stepResults.ocr?.status ?? StepStatus.PENDING,
        audioJson: report.audio ?? undefined,
        audioStatus: stepResults.audio?.status ?? StepStatus.PENDING,
        aiAnalysisJson: aiAnalysisValue,
        aiAnalysisStatus,
        summaryJson: summaryValue,
        metadataJson: metadataValue,
        durationMs,
      },
    });
  }
}
