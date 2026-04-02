// ============================================
// Legacy State Migration
// Converts old single-track Clip[] format to
// new multi-track SerializedEditorState
// ============================================

import type {
  SerializedEditorState,
  Track,
  TrackItem,
  VideoClipItem,
  Marker,
  LegacyClip,
  LegacyEditorStateData,
} from "@/types/editor";
import {
  generateId,
  createDefaultTrack,
  createDefaultVideoClipProperties,
  createDefaultSnapSettings,
} from "@/types/editor";

/**
 * Convert legacy editor state (single track, Clip[]) to
 * the new multi-track SerializedEditorState.
 */
export function migrateLegacyState(
  legacy: LegacyEditorStateData
): SerializedEditorState {
  // Create a primary video track
  const videoTrack: Track = {
    ...createDefaultTrack("video", 0),
    id: "track_video_main",
    name: "Video",
  };

  // Create a primary audio track
  const audioTrack: Track = {
    ...createDefaultTrack("audio", 1),
    id: "track_audio_main",
    name: "Audio",
  };

  // Convert legacy clips to video track items
  const trackItems: TrackItem[] = legacy.clips.map(
    (clip: LegacyClip): VideoClipItem => ({
      id: clip.id || generateId(),
      trackId: videoTrack.id,
      type: "video-clip",
      name: `Clip ${clip.id.slice(-4)}`,
      startMs: clip.startMs,
      endMs: clip.endMs,
      opacity: 100,
      locked: false,
      properties: {
        ...createDefaultVideoClipProperties(
          clip.id,
          clip.sourceStartMs,
          clip.sourceEndMs
        ),
      },
    })
  );

  // Convert markers (keep as-is since the type is compatible)
  const markers: Marker[] = legacy.markers.map((m) => ({
    ...m,
    id: m.id || generateId(),
  }));

  return {
    tracks: [videoTrack, audioTrack],
    trackItems,
    markers,
    playheadMs: legacy.playheadMs,
    version: legacy.version,
    duration: legacy.duration,
    snapSettings: createDefaultSnapSettings(),
  };
}

/**
 * Check if editor data looks like legacy format (has `clips` array at top level).
 */
export function isLegacyState(
  data: unknown
): data is LegacyEditorStateData {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return Array.isArray(d.clips) && !Array.isArray(d.tracks);
}

/**
 * Parse raw editor data from API, auto-migrating legacy format.
 */
export function parseEditorState(
  raw: unknown,
  durationMs: number
): SerializedEditorState {
  if (!raw) {
    // Create default state with a single clip spanning full duration
    return migrateLegacyState({
      clips: [
        {
          id: generateId(),
          startMs: 0,
          endMs: durationMs,
          sourceStartMs: 0,
          sourceEndMs: durationMs,
        },
      ],
      markers: [],
      playheadMs: 0,
      version: 1,
      duration: durationMs,
    });
  }

  if (isLegacyState(raw)) {
    return migrateLegacyState(raw);
  }

  // Already in new format
  return raw as SerializedEditorState;
}
