import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/server/api/response";
import { prisma } from "@/lib/db/prisma";
import { storage } from "@/lib/storage/factory";
import { extractMetadata } from "@/lib/media/ffprobe";
import { ProjectService } from "@/server/services/project.service";
import { ProjectStatus } from "@/generated/prisma/client";
import { logger } from "@/lib/logger";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { redis } from "@/lib/queue/connection";
import { rateLimit } from "@/lib/rate-limit";
import { env } from "@/lib/env";

const MAX_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_DURATION_MS = 3 * 60 * 1000; // 3 minutes
const ALLOWED_TYPES = ["video/mp4"];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const { id: projectId } = await params;
  const log = logger.child({ projectId, userId: session.user.id });

  // --- Rate limiting: 20 uploads per minute per user ---
  const rl = await rateLimit(redis, `ratelimit:${session.user.id}:upload`, 20, 60);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfter: rl.resetAt },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.resetAt - Date.now() / 1000)) },
      }
    );
  }

  // Verify project ownership & status
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  });

  if (!project) return apiError("Project not found", 404);
  if (project.status !== ProjectStatus.DRAFT) {
    return apiError("Project already has a video uploaded", 400);
  }

  // --- Disk quota check ---
  const userRecord = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!userRecord) return apiError("User not found", 404);

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  // --- Validation ---
  if (!file) return apiError("No file provided. Please select a video to upload.", 400);
  if (file.size === 0) return apiError("File is empty (zero bytes). Please select a valid video.", 400);
  if (!ALLOWED_TYPES.includes(file.type)) {
    return apiError(`Invalid file type "${file.type}". Only MP4 files are allowed.`, 400);
  }
  if (file.size > MAX_SIZE) {
    return apiError(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the 500MB limit.`, 400);
  }

  // --- Quota check: ensure user has enough remaining storage ---
  if (Number(userRecord.diskUsageBytes) + file.size > env.DISK_QUOTA_BYTES) {
    return apiError("Storage quota exceeded", 413);
  }

  // --- Save file with UUID key (streaming to reduce RAM usage) ---
  const ext = path.extname(file.name) || ".mp4";
  const storageKey = `users/${session.user.id}/projects/${projectId}/${uuidv4()}${ext}`;

  log.info("Saving uploaded file", { fileName: file.name, size: file.size, storageKey });
  await storage.saveStream(storageKey, file.stream(), file.size);

  // --- Validate video via ffprobe ---
  const filePath = storage.getPath(storageKey);
  let metadata;
  try {
    metadata = await extractMetadata(filePath);
  } catch (err) {
    // File saved but not a valid video — clean up and reject
    await storage.delete(storageKey);
    log.warn("ffprobe validation failed, file deleted", { error: (err as Error).message });
    return apiError("File is not a valid video or could not be analyzed. Please upload a valid MP4.", 400);
  }

  // Check duration
  if (metadata.durationMs > MAX_DURATION_MS) {
    await storage.delete(storageKey);
    return apiError(
      `Video duration (${(metadata.durationMs / 1000).toFixed(1)}s) exceeds the 3 minute limit.`,
      400
    );
  }

  // --- Create MediaAsset with transactional cleanup ---
  let mediaAsset;
  try {
    mediaAsset = await prisma.mediaAsset.create({
      data: {
        projectId,
        type: "SOURCE_VIDEO",
        storageKey,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        durationMs: metadata.durationMs,
        width: metadata.width,
        height: metadata.height,
        fps: metadata.fps,
        bitrate: metadata.bitrate,
        codec: metadata.codec,
        audioCodec: metadata.audioCodec,
      },
    });
  } catch (err) {
    // DB write failed — clean up file
    await storage.delete(storageKey);
    log.error("Failed to create MediaAsset, file deleted", { error: (err as Error).message });
    return apiError("Failed to save upload record. Please try again.", 500);
  }

  // --- Set source video on project ---
  try {
    await ProjectService.setSourceVideo(projectId, mediaAsset.id);
  } catch (err) {
    // Project update failed — clean up MediaAsset and file
    await prisma.mediaAsset.delete({ where: { id: mediaAsset.id } });
    await storage.delete(storageKey);
    log.error("Failed to update project, cleaned up MediaAsset and file", {
      error: (err as Error).message,
    });
    return apiError("Failed to update project. Please try again.", 500);
  }

  // --- Increment user disk usage ---
  await prisma.user.update({
    where: { id: session.user.id },
    data: { diskUsageBytes: { increment: BigInt(file.size) } },
  });

  log.info("Upload completed successfully", { mediaAssetId: mediaAsset.id });
  return apiSuccess(mediaAsset, 201);
}
