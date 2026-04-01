import { prisma } from "@/lib/db/prisma";
import { JobStatus, JobType, StepStatus } from "@/generated/prisma/client";

export { StepStatus };

export interface StepResult {
  status: StepStatus;
  durationMs?: number;
  error?: string;
}

export interface StepResults {
  transcript?: StepResult;
  scenes?: StepResult;
  ocr?: StepResult;
  audio?: StepResult;
  aiAnalysis?: StepResult;
}

export class BackgroundJobService {
  /** Find active (QUEUED or RUNNING) job for a project+type combo */
  static async findActive(projectId: string, type: JobType) {
    return prisma.backgroundJob.findFirst({
      where: {
        projectId,
        type,
        status: { in: [JobStatus.QUEUED, JobStatus.RUNNING] },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Find a background job by its BullMQ queue job ID (unique) */
  static async findByQueueJobId(queueJobId: string) {
    return prisma.backgroundJob.findUnique({
      where: { queueJobId },
    });
  }

  /** Create a new job record in QUEUED state */
  static async create(projectId: string, type: JobType, queueJobId: string) {
    return prisma.backgroundJob.create({
      data: {
        projectId,
        type,
        status: JobStatus.QUEUED,
        queueJobId,
      },
    });
  }

  /** Mark job as RUNNING */
  static async markRunning(id: string) {
    return prisma.backgroundJob.update({
      where: { id },
      data: {
        status: JobStatus.RUNNING,
        startedAt: new Date(),
        attempts: { increment: 1 },
      },
    });
  }

  /** Update progress and step results */
  static async updateProgress(id: string, progress: number, stepResults?: StepResults) {
    const data: Record<string, unknown> = { progress };
    if (stepResults) {
      data.stepResults = stepResults as unknown as Record<string, unknown>;
    }
    return prisma.backgroundJob.update({
      where: { id },
      data,
    });
  }

  /** Mark job as COMPLETED */
  static async markCompleted(id: string, stepResults?: StepResults) {
    const data: Record<string, unknown> = {
      status: JobStatus.COMPLETED,
      progress: 100,
      finishedAt: new Date(),
    };
    if (stepResults) {
      data.stepResults = stepResults as unknown as Record<string, unknown>;
    }
    return prisma.backgroundJob.update({
      where: { id },
      data,
    });
  }

  /** Mark job as FAILED */
  static async markFailed(id: string, errorMessage: string, stepResults?: StepResults) {
    const data: Record<string, unknown> = {
      status: JobStatus.FAILED,
      errorMessage,
      finishedAt: new Date(),
    };
    if (stepResults) {
      data.stepResults = stepResults as unknown as Record<string, unknown>;
    }
    return prisma.backgroundJob.update({
      where: { id },
      data,
    });
  }

  /** Get latest job for a project+type */
  static async getLatest(projectId: string, type: JobType) {
    return prisma.backgroundJob.findFirst({
      where: { projectId, type },
      orderBy: { createdAt: "desc" },
    });
  }
}
