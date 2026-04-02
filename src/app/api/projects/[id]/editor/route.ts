import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/server/api/response";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import { migrateClipsToTrackItems, trackItemsToLegacyClips } from "@/lib/editor/track-utils";
import { withTiming } from "@/lib/api/with-timing";
import { withErrorHandler } from "@/lib/api/errors";
import type { Marker, TrackItem } from "@/types/editor";
import { z } from "zod";

// ── Zod schemas for editor PUT validation (Fix #2) ──

const trackSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["video", "audio", "text", "effect", "sticker", "filter"]),
  order: z.number(),
  muted: z.boolean().optional(),
  locked: z.boolean().optional(),
  visible: z.boolean().optional(),
}).passthrough();

const trackItemSchema = z.object({
  id: z.string(),
  trackId: z.string(),
  type: z.string(),
  startMs: z.number().min(0),
  durationMs: z.number().min(0).optional(),
  endMs: z.number().min(0).optional(),
  sourceStartMs: z.number().min(0).optional(),
  sourceDurationMs: z.number().min(0).optional(),
  sourceEndMs: z.number().min(0).optional(),
  label: z.string().optional(),
  name: z.string().optional(),
  mediaAssetId: z.string().optional(),
}).passthrough(); // allow extra fields like properties

const editorStateSchema = z.object({
  tracks: z.array(trackSchema).max(50).optional(),
  trackItems: z.array(trackItemSchema).max(500).optional(),
  markers: z.array(z.object({
    id: z.string(),
    timeMs: z.number(),
    label: z.string().optional(),
  }).passthrough()).max(200).optional(),
  clips: z.array(z.any()).max(500).optional(),
  playheadMs: z.number().min(0).optional(),
});

// GET - Load editor state (create default if none exists)
// Supports both legacy clip format and new multi-track format
async function handleGET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const { id: projectId } = await params;

  // Verify project exists and belongs to user
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
    include: {
      mediaAssets: {
        where: { type: "SOURCE_VIDEO" },
        take: 1,
      },
    },
  });

  if (!project) return apiError("Project not found", 404);

  const sourceVideo = project.mediaAssets[0];
  const durationMs = sourceVideo?.durationMs || 0;
  const sourceAssetKey = sourceVideo?.storageKey || "source";

  // Try to load existing editor state
  let editorState = await prisma.editorState.findUnique({
    where: { projectId },
  });

  // Create default state if none exists
  if (!editorState) {
    // Default: single clip spanning the full video
    const defaultClips = [
      {
        id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        startMs: 0,
        endMs: durationMs,
        sourceStartMs: 0,
        sourceEndMs: durationMs,
      },
    ];

    // Also create multi-track format
    const multiTrackState = migrateClipsToTrackItems(
      defaultClips,
      [],
      durationMs,
      sourceAssetKey
    );

    editorState = await prisma.editorState.create({
      data: {
        projectId,
        clips: defaultClips,
        markers: [],
        tracks: multiTrackState.tracks as unknown as Prisma.JsonArray,
        trackItems: multiTrackState.trackItems as unknown as Prisma.JsonArray,
        playheadMs: 0,
      },
    });
  }

  // If editor state exists but has no tracks/trackItems, migrate from legacy clips
  const hasMultiTrack = editorState.tracks && editorState.trackItems;
  if (!hasMultiTrack) {
    const legacyClips = (editorState.clips as unknown as Array<{
      id: string;
      startMs: number;
      endMs: number;
      sourceStartMs: number;
      sourceEndMs: number;
    }>) || [];

    const legacyMarkers = (editorState.markers as unknown as Marker[]) || [];

    const multiTrackState = migrateClipsToTrackItems(
      legacyClips,
      legacyMarkers,
      durationMs,
      sourceAssetKey,
      editorState.playheadMs,
      editorState.version
    );

    // Persist the migration
    editorState = await prisma.editorState.update({
      where: { projectId },
      data: {
        tracks: multiTrackState.tracks as unknown as Prisma.JsonArray,
        trackItems: multiTrackState.trackItems as unknown as Prisma.JsonArray,
      },
    });
  }

  return apiSuccess(editorState);
}

// PUT - Save editor state
// Supports both legacy and multi-track formats
async function handlePUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const { id: projectId } = await params;
  const body = await req.json();

  // Fix #2: Validate request body with Zod
  const parsed = editorStateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      `Invalid editor state: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
      400
    );
  }

  // Use parsed.data so Zod coercions/transforms are applied (not raw body)
  const { clips, markers, playheadMs, tracks, trackItems } = parsed.data;

  // Verify project exists and belongs to user
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  });

  if (!project) return apiError("Project not found", 404);

  // Build update data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {
    version: { increment: 1 },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createData: Record<string, any> = {
    projectId,
    clips: [],
    playheadMs: playheadMs ?? 0,
  };

  // Handle multi-track format (preferred)
  if (tracks !== undefined) {
    updateData.tracks = tracks;
    createData.tracks = tracks;
  }
  if (trackItems !== undefined) {
    updateData.trackItems = trackItems;
    createData.trackItems = trackItems;

    // Also update legacy clips for backward compat
    const legacyClips = trackItemsToLegacyClips(trackItems as unknown as TrackItem[]);
    updateData.clips = legacyClips;
    createData.clips = legacyClips;
  }

  // Handle legacy format
  if (clips !== undefined && trackItems === undefined) {
    updateData.clips = clips;
    createData.clips = clips;
  }

  if (markers !== undefined) {
    updateData.markers = markers;
    createData.markers = markers;
  }
  if (playheadMs !== undefined) {
    updateData.playheadMs = playheadMs;
  }

  // Upsert editor state
  const editorState = await prisma.editorState.upsert({
    where: { projectId },
    create: createData as Prisma.EditorStateUncheckedCreateInput,
    update: updateData,
  });

  return apiSuccess(editorState);
}

export const GET = withTiming(
  withErrorHandler(handleGET as Parameters<typeof withTiming>[0]),
  "editor-get"
);

export const PUT = withTiming(
  withErrorHandler(handlePUT as Parameters<typeof withTiming>[0]),
  "editor-put"
);
