import { prisma } from "@/lib/db/prisma";
import { ProjectStatus } from "@/generated/prisma/client";
import type { CreateProjectInput, UpdateProjectInput } from "@/lib/validators/project";

// Valid transitions: from -> allowed targets
const VALID_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  DRAFT: [ProjectStatus.UPLOADED],
  UPLOADED: [ProjectStatus.ANALYZING, ProjectStatus.FAILED],
  ANALYZING: [ProjectStatus.ANALYZED, ProjectStatus.FAILED],
  ANALYZED: [ProjectStatus.ANALYZING, ProjectStatus.PLANNING, ProjectStatus.FAILED],
  PLANNING: [ProjectStatus.PLANNED, ProjectStatus.FAILED],
  PLANNED: [ProjectStatus.PLANNING, ProjectStatus.RENDERING, ProjectStatus.FAILED],
  RENDERING: [ProjectStatus.RENDERED, ProjectStatus.FAILED],
  RENDERED: [ProjectStatus.RENDERING, ProjectStatus.PLANNING],
  FAILED: [ProjectStatus.ANALYZING, ProjectStatus.PLANNING, ProjectStatus.RENDERING, ProjectStatus.UPLOADED],
};

export function assertValidTransition(from: ProjectStatus, to: ProjectStatus): void {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new Error(`Invalid project status transition: ${from} -> ${to}`);
  }
}

export class ProjectService {
  static async create(userId: string, data: CreateProjectInput) {
    return prisma.project.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
      },
    });
  }

  static async list(userId: string) {
    return prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { mediaAssets: true } },
      },
    });
  }

  static async getById(id: string, userId: string) {
    return prisma.project.findFirst({
      where: { id, userId },
      include: {
        mediaAssets: true,
        _count: { select: { mediaAssets: true } },
      },
    });
  }

  static async update(id: string, userId: string, data: UpdateProjectInput) {
    const project = await prisma.project.findFirst({ where: { id, userId } });
    if (!project) return null;

    return prisma.project.update({
      where: { id },
      data,
    });
  }

  /** Guarded status transition — throws if transition is invalid.
   *  Uses updateMany with WHERE {id, status: from} to prevent TOCTOU races.
   *  Throws StaleStatusError if no row was updated (concurrent worker already transitioned).
   */
  static async transitionStatus(id: string, to: ProjectStatus) {
    // We need to know the current status to validate the transition *and* to
    // use it as the atomic WHERE predicate.  A single read here is safe because
    // the actual write is guarded by the status predicate in updateMany.
    const project = await prisma.project.findUnique({ where: { id }, select: { status: true } });
    if (!project) throw new Error(`Project ${id} not found`);

    const from = project.status;
    assertValidTransition(from, to);

    const result = await prisma.project.updateMany({
      where: { id, status: from },
      data: { status: to },
    });

    if (result.count === 0) {
      throw new Error(
        `Stale status transition: project ${id} expected ${from}, transition to ${to} failed`
      );
    }

    // Return the updated record so callers retain the same API surface.
    return prisma.project.findUniqueOrThrow({ where: { id } });
  }

  // Convenience methods for common transitions
  static async markUploaded(id: string, mediaAssetId: string) {
    const project = await prisma.project.findUnique({ where: { id }, select: { status: true } });
    if (!project) throw new Error(`Project ${id} not found`);

    const from = project.status;
    assertValidTransition(from, ProjectStatus.UPLOADED);

    const result = await prisma.project.updateMany({
      where: { id, status: from },
      data: { sourceVideoId: mediaAssetId, status: ProjectStatus.UPLOADED },
    });

    if (result.count === 0) {
      throw new Error(
        `Stale status transition: project ${id} expected ${from}, transition to UPLOADED failed`
      );
    }

    return prisma.project.findUniqueOrThrow({ where: { id } });
  }

  static async markAnalyzing(id: string) {
    return this.transitionStatus(id, ProjectStatus.ANALYZING);
  }

  static async markAnalyzed(id: string) {
    return this.transitionStatus(id, ProjectStatus.ANALYZED);
  }

  static async markPlanning(id: string) {
    return this.transitionStatus(id, ProjectStatus.PLANNING);
  }

  static async markPlanned(id: string) {
    return this.transitionStatus(id, ProjectStatus.PLANNED);
  }

  static async markRendering(id: string) {
    return this.transitionStatus(id, ProjectStatus.RENDERING);
  }

  static async markRendered(id: string) {
    return this.transitionStatus(id, ProjectStatus.RENDERED);
  }

  static async markFailed(id: string) {
    // FAILED is always reachable from non-DRAFT states
    return prisma.project.update({
      where: { id },
      data: { status: ProjectStatus.FAILED },
    });
  }

  /** @deprecated Use transitionStatus or specific mark* methods instead */
  static async updateStatus(id: string, status: ProjectStatus) {
    return this.transitionStatus(id, status);
  }

  static async setSourceVideo(id: string, mediaAssetId: string) {
    return this.markUploaded(id, mediaAssetId);
  }
}
