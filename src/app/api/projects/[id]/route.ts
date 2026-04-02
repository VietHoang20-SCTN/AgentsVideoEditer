import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/server/api/response";
import { ProjectService } from "@/server/services/project.service";
import { updateProjectSchema } from "@/lib/validators/project";
import { prisma } from "@/lib/db/prisma";
import { storage } from "@/lib/storage/factory";
import { withTiming } from "@/lib/api/with-timing";
import { withErrorHandler } from "@/lib/api/errors";
import fs from "fs/promises";

async function handleGET(
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

async function handlePATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const { id } = await params;
  const body = await req.json();
  const data = updateProjectSchema.parse(body);
  const project = await ProjectService.update(id, session.user.id, data);
  if (!project) return apiError("Project not found", 404);

  return apiSuccess(project);
}

const ACTIVE_STATUSES = new Set(["ANALYZING", "PLANNING", "RENDERING"]);

async function handleDELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const { id } = await params;

  // Ownership check — include sizeBytes for disk usage accounting
  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
    include: { mediaAssets: { select: { storageKey: true, sizeBytes: true } } },
  });
  if (!project) return apiError("Project not found", 404);

  // Block deletion while active jobs are running
  if (ACTIVE_STATUSES.has(project.status)) {
    return apiError("Project has active jobs, cannot delete", 409);
  }

  // Fix #7: Decrement user disk usage before deleting
  const totalBytes = project.mediaAssets.reduce(
    (sum, a) => sum + (a.sizeBytes ?? BigInt(0)),
    BigInt(0)
  );
  if (totalBytes > BigInt(0)) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { diskUsageBytes: { decrement: totalBytes } },
    });
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
}

export const GET = withTiming(
  withErrorHandler(handleGET as Parameters<typeof withTiming>[0]),
  "project-get"
);

export const PATCH = withTiming(
  withErrorHandler(handlePATCH as Parameters<typeof withTiming>[0]),
  "project-patch"
);

export const DELETE = withTiming(
  withErrorHandler(handleDELETE as Parameters<typeof withTiming>[0]),
  "project-delete"
);
