import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/server/api/response";
import { ProjectService } from "@/server/services/project.service";
import { updateProjectSchema } from "@/lib/validators/project";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { storage } from "@/lib/storage/factory";
import fs from "fs/promises";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const { id } = await params;
  const project = await ProjectService.getById(id, session.user.id);
  if (!project) return apiError("Project not found", 404);

  return apiSuccess(project);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  try {
    const { id } = await params;
    const body = await req.json();
    const data = updateProjectSchema.parse(body);
    const project = await ProjectService.update(id, session.user.id, data);
    if (!project) return apiError("Project not found", 404);

    return apiSuccess(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0].message);
    }
    return apiError("Internal server error", 500);
  }
}

const ACTIVE_STATUSES = new Set(["ANALYZING", "PLANNING", "RENDERING"]);

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  try {
    const { id } = await params;

    // Ownership check
    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
      include: { mediaAssets: { select: { storageKey: true } } },
    });
    if (!project) return apiError("Project not found", 404);

    // Block deletion while active jobs are running
    if (ACTIVE_STATUSES.has(project.status)) {
      return apiError("Project has active jobs, cannot delete", 409);
    }

    // Delete each media asset file from disk
    await Promise.all(
      project.mediaAssets.map((asset) => storage.delete(asset.storageKey))
    );

    // Delete renders folder for this project (e.g. uploads/renders/<id>/)
    const rendersFolder = storage.getPath(`renders/${id}`);
    try {
      await fs.rm(rendersFolder, { recursive: true, force: true });
    } catch {
      // Ignore — folder may not exist
    }

    // Remove the project record (cascades to mediaAssets via DB FK)
    await prisma.project.delete({ where: { id } });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /projects/:id]", error);
    return apiError("Internal server error", 500);
  }
}
