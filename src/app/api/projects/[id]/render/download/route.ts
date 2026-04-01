import { auth } from "@/lib/auth";
import { apiError } from "@/server/api/response";
import { prisma } from "@/lib/db/prisma";
import { storage } from "@/lib/storage/factory";
import { createReadStream } from "fs";
import { stat } from "fs/promises";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const { id: projectId } = await params;

  // Verify ownership
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  });
  if (!project) return apiError("Project not found", 404);

  // Get the latest completed render's output
  const renderJob = await prisma.renderJob.findFirst({
    where: { projectId, status: "COMPLETED" },
    orderBy: { createdAt: "desc" },
    include: { outputMediaAsset: true },
  });

  if (!renderJob?.outputMediaAsset) {
    return apiError("No rendered video available", 404);
  }

  const asset = renderJob.outputMediaAsset;
  const filePath = storage.getPath(asset.storageKey);

  try {
    const fileStat = await stat(filePath);
    const stream = createReadStream(filePath);

    // Convert Node ReadStream to Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk: Buffer | string) => {
          controller.enqueue(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
        });
        stream.on("end", () => controller.close());
        stream.on("error", (err) => controller.error(err));
      },
    });

    return new Response(webStream, {
      headers: {
        "Content-Type": asset.mimeType,
        "Content-Length": fileStat.size.toString(),
        "Content-Disposition": `attachment; filename="${asset.fileName}"`,
      },
    });
  } catch {
    return apiError("Rendered file not found on disk", 404);
  }
}
