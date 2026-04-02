// ============================================
// Timeline Snap Engine
// Calculates snap points for drag & trim ops
// ============================================

import type { TrackItem, SnapSettings, Marker } from "@/types/editor";

export interface SnapPoint {
  ms: number;
  type: "playhead" | "item-start" | "item-end" | "marker";
  label?: string;
}

export interface SnapResult {
  /** The snapped value (or original if no snap) */
  ms: number;
  /** Whether snapping occurred */
  snapped: boolean;
  /** The snap point that was matched */
  snapPoint: SnapPoint | null;
}

/**
 * Collect all snap points from the timeline.
 * Excludes items in the `excludeIds` set (the items being dragged).
 */
export function collectSnapPoints(
  trackItems: TrackItem[],
  markers: Marker[],
  playheadMs: number,
  settings: SnapSettings,
  excludeIds: Set<string>
): SnapPoint[] {
  const points: SnapPoint[] = [];

  if (settings.snapToPlayhead) {
    points.push({ ms: playheadMs, type: "playhead" });
  }

  if (settings.snapToItems) {
    for (const item of trackItems) {
      if (excludeIds.has(item.id)) continue;
      points.push({ ms: item.startMs, type: "item-start", label: item.name });
      points.push({ ms: item.endMs, type: "item-end", label: item.name });
    }
  }

  if (settings.snapToMarkers) {
    for (const marker of markers) {
      points.push({ ms: marker.timeMs, type: "marker", label: marker.label });
    }
  }

  return points;
}

/**
 * Find the closest snap point within threshold.
 * `thresholdMs` is the snap distance in milliseconds.
 */
export function findSnap(
  valueMs: number,
  snapPoints: SnapPoint[],
  thresholdMs: number
): SnapResult {
  let closest: SnapPoint | null = null;
  let closestDist = Infinity;

  for (const point of snapPoints) {
    const dist = Math.abs(valueMs - point.ms);
    if (dist < closestDist && dist <= thresholdMs) {
      closest = point;
      closestDist = dist;
    }
  }

  if (closest) {
    return { ms: closest.ms, snapped: true, snapPoint: closest };
  }

  return { ms: valueMs, snapped: false, snapPoint: null };
}

/**
 * Convert pixel-based snap threshold to ms based on zoom.
 */
export function snapThresholdToMs(thresholdPx: number, zoom: number): number {
  return (thresholdPx / zoom) * 1000;
}

/**
 * Multi-edge snap: try snapping both start and end edges of an item,
 * return the adjustment that produces the closest snap.
 */
export function findMoveSnap(
  startMs: number,
  endMs: number,
  snapPoints: SnapPoint[],
  thresholdMs: number
): { deltaMs: number; snapped: boolean; snapPoint: SnapPoint | null; edge: "start" | "end" | null } {
  const startSnap = findSnap(startMs, snapPoints, thresholdMs);
  const endSnap = findSnap(endMs, snapPoints, thresholdMs);

  const startDist = startSnap.snapped
    ? Math.abs(startMs - startSnap.ms)
    : Infinity;
  const endDist = endSnap.snapped
    ? Math.abs(endMs - endSnap.ms)
    : Infinity;

  if (!startSnap.snapped && !endSnap.snapped) {
    return { deltaMs: 0, snapped: false, snapPoint: null, edge: null };
  }

  if (startDist <= endDist) {
    return {
      deltaMs: startSnap.ms - startMs,
      snapped: true,
      snapPoint: startSnap.snapPoint,
      edge: "start",
    };
  }

  return {
    deltaMs: endSnap.ms - endMs,
    snapped: true,
    snapPoint: endSnap.snapPoint,
    edge: "end",
  };
}
