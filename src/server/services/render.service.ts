import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/generated/prisma/client";

export class RenderService {
  static async getById(id: string) {
    return prisma.renderJob.findUnique({
      where: { id },
      include: { outputMediaAsset: true },
    });
  }

  static async getLatestByProjectId(projectId: string) {
    return prisma.renderJob.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      include: { outputMediaAsset: true },
    });
  }

  static async listByProjectId(projectId: string) {
    return prisma.renderJob.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      include: { outputMediaAsset: true },
    });
  }

  static async create(projectId: string, planVersion: string) {
    return prisma.renderJob.create({
      data: {
        projectId,
        inputPlanVersion: planVersion,
      },
    });
  }

  static async markRunning(id: string) {
    return prisma.renderJob.update({
      where: { id },
      data: { status: "RUNNING", startedAt: new Date() },
    });
  }

  static async markCompleted(id: string, outputMediaAssetId: string, logsJson: string[]) {
    return prisma.renderJob.update({
      where: { id },
      data: {
        status: "COMPLETED",
        outputMediaAssetId,
        logsJson: logsJson as unknown as Prisma.InputJsonValue,
        finishedAt: new Date(),
      },
    });
  }

  static async markFailed(id: string, errorMessage: string, logsJson?: string[]) {
    return prisma.renderJob.update({
      where: { id },
      data: {
        status: "FAILED",
        errorMessage,
        logsJson: logsJson ? (logsJson as unknown as Prisma.InputJsonValue) : undefined,
        finishedAt: new Date(),
      },
    });
  }
}
