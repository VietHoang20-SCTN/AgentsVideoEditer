import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/server/api/response";
import { prisma } from "@/lib/db/prisma";
import { migrateClipsToTrackItems, trackItemsToLegacyClips } from "@/lib/editor/track-utils";

// GET - Load editor state (create default if none exists)
// Supports both legacy clip format and new multi-track format
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  try {
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
          tracks: multiTrackState.tracks as unknown as Record<string, unknown>[],
          trackItems: multiTrackState.trackItems as unknown as Record<string, unknown>[],
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

      const legacyMarkers = (editorState.markers as unknown as Array<{
        id: string;
        timeMs: number;
        label: string;
        type: string;
        color?: string;
      }>) || [];

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
          tracks: multiTrackState.tracks as unknown as Record<string, unknown>[],
          trackItems: multiTrackState.trackItems as unknown as Record<string, unknown>[],
        },
      });
    }

    return apiSuccess(editorState);
  } catch (error) {
    console.error("[GET /projects/:id/editor]", error);
    return apiError("Failed to load editor state", 500);
  }
}

// PUT - Save editor state
// Supports both legacy and multi-track formats
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  try {
    const { id: projectId } = await params;
    const body = await req.json();

    const { clips, markers, playheadMs, tracks, trackItems } = body;

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
      const legacyClips = trackItemsToLegacyClips(trackItems);
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
      create: createData,
      update: updateData,
    });

    return apiSuccess(editorState);
  } catch (error) {
    console.error("[PUT /projects/:id/editor]", error);
    return apiError("Failed to save editor state", 500);
  }
}
