// ============================================
// Xiaohuang Editor - Track Utilities
// Multi-track helper functions
// ============================================

import type {
  Track,
  TrackType,
  TrackItem,
  VideoClipItem,
  AudioClipItem,
  Marker,
  LegacyClip,
  SerializedEditorState,
} from "@/types/editor";
import {
  generateId,
  createDefaultTrack,
  createDefaultVideoClipProperties,
  createDefaultSnapSettings,
} from "@/types/editor";

// ── Migration ───────────────────────────────────────

/**
 * Migrate legacy Clip[] + Marker[] format to the new multi-track format.
 * Creates a default video track and converts each clip to a VideoClipItem.
 */
export function migrateClipsToTrackItems(
  clips: LegacyClip[],
  markers: Marker[],
  duration: number,
  sourceAssetKey: string = "source",
  playheadMs: number = 0,
  version: number = 1
): SerializedEditorState {
  // Create a default video track
  const videoTrack = createDefaultTrack("video", 0, "Video 1");

  // Convert clips to track items
  const trackItems: VideoClipItem[] = clips.map((clip) => ({
    id: clip.id || generateId("video-clip"),
    trackId: videoTrack.id,
    type: "video-clip" as const,
    startMs: clip.startMs,
    endMs: clip.endMs,
    name: `Clip ${formatTimeRange(clip.startMs, clip.endMs)}`,
    locked: false,
    opacity: 100,
    properties: createDefaultVideoClipProperties(
      sourceAssetKey,
      clip.sourceStartMs,
      clip.sourceEndMs
    ),
  }));

  return {
    tracks: [videoTrack],
    trackItems,
    markers,
    playheadMs,
    version,
    duration,
    snapSettings: createDefaultSnapSettings(),
  };
}

/**
 * Convert new multi-track state back to legacy format for backward compat
 */
export function trackItemsToLegacyClips(trackItems: TrackItem[]): LegacyClip[] {
  return trackItems
    .filter((item): item is VideoClipItem => item.type === "video-clip")
    .map((item) => ({
      id: item.id,
      startMs: item.startMs,
      endMs: item.endMs,
      sourceStartMs: item.properties.sourceStartMs,
      sourceEndMs: item.properties.sourceEndMs,
    }));
}

// ── Track Utilities ─────────────────────────────────

/** Get all items in a track, sorted by start time */
export function getTrackItems(trackItems: TrackItem[], trackId: string): TrackItem[] {
  return trackItems
    .filter((item) => item.trackId === trackId)
    .sort((a, b) => a.startMs - b.startMs);
}

/** Get items that overlap with a time range */
export function getItemsInRange(
  trackItems: TrackItem[],
  startMs: number,
  endMs: number,
  trackId?: string
): TrackItem[] {
  return trackItems.filter((item) => {
    if (trackId && item.trackId !== trackId) return false;
    return item.startMs < endMs && item.endMs > startMs;
  });
}

/** Get the item at a specific time on a specific track */
export function getItemAtTime(
  trackItems: TrackItem[],
  timeMs: number,
  trackId: string
): TrackItem | undefined {
  return trackItems.find(
    (item) =>
      item.trackId === trackId &&
      item.startMs <= timeMs &&
      item.endMs > timeMs
  );
}

/** Check if a time range overlaps with existing items on a track */
export function hasOverlap(
  trackItems: TrackItem[],
  trackId: string,
  startMs: number,
  endMs: number,
  excludeItemId?: string
): boolean {
  return trackItems.some(
    (item) =>
      item.trackId === trackId &&
      item.id !== excludeItemId &&
      item.startMs < endMs &&
      item.endMs > startMs
  );
}

/** Find the next available gap on a track for a given duration */
export function findNextGap(
  trackItems: TrackItem[],
  trackId: string,
  afterMs: number,
  durationMs: number
): number {
  const items = getTrackItems(trackItems, trackId);
  let candidateStart = afterMs;

  for (const item of items) {
    if (item.endMs <= candidateStart) continue;
    if (item.startMs >= candidateStart + durationMs) break;
    candidateStart = item.endMs;
  }

  return candidateStart;
}

/** Get snap points from all items and markers */
export function getSnapPoints(
  trackItems: TrackItem[],
  markers: Marker[],
  playheadMs: number,
  excludeItemIds: string[] = []
): number[] {
  const excludeSet = new Set(excludeItemIds);
  const points = new Set<number>();

  // Add item edges
  for (const item of trackItems) {
    if (excludeSet.has(item.id)) continue;
    points.add(item.startMs);
    points.add(item.endMs);
  }

  // Add marker positions
  for (const marker of markers) {
    points.add(marker.timeMs);
  }

  // Add playhead
  points.add(playheadMs);

  // Add zero
  points.add(0);

  return Array.from(points).sort((a, b) => a - b);
}

/** Snap a time value to the nearest snap point */
export function snapToPoint(
  timeMs: number,
  snapPoints: number[],
  thresholdMs: number
): number {
  let closest = timeMs;
  let closestDist = Infinity;

  for (const point of snapPoints) {
    const dist = Math.abs(timeMs - point);
    if (dist < closestDist && dist <= thresholdMs) {
      closest = point;
      closestDist = dist;
    }
  }

  return closest;
}

/** Get tracks of a specific type */
export function getTracksByType(tracks: Track[], type: TrackType): Track[] {
  return tracks.filter((t) => t.type === type).sort((a, b) => a.order - b.order);
}

/** Calculate the total output duration from all items */
export function calculateOutputDuration(
  trackItems: TrackItem[],
  baseDuration: number = 0
): number {
  if (trackItems.length === 0) return baseDuration;
  const maxEnd = Math.max(...trackItems.map((i) => i.endMs));
  return Math.max(baseDuration, maxEnd);
}

// ── Format Helpers ──────────────────────────────────

function formatTimeRange(startMs: number, endMs: number): string {
  return `${formatMs(startMs)} - ${formatMs(endMs)}`;
}

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

// ── Type Guards ─────────────────────────────────────

export function isVideoClipItem(item: TrackItem): item is VideoClipItem {
  return item.type === "video-clip";
}

export function isAudioClipItem(item: TrackItem): item is AudioClipItem {
  return item.type === "audio-clip";
}
