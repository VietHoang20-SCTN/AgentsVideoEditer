// ============================================
// useTimelineTrim – Trim start/end edges of items
// Uses pointer capture for smooth edge dragging
// ============================================

"use client";

import { useRef, useCallback } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { MIN_CLIP_MS } from "@/types/editor";
import { pixelToMs } from "./timeline-constants";
import {
  collectSnapPoints,
  findSnap,
  snapThresholdToMs,
} from "./timeline-snap";

// ── Types ────────────────────────────────────────

export type TrimEdge = "start" | "end";

export interface TrimState {
  itemId: string;
  trackId: string;
  edge: TrimEdge;
  startClientX: number;
  /** Original item startMs */
  originStartMs: number;
  /** Original item endMs */
  originEndMs: number;
  /** Current trimmed value */
  currentMs: number;
  /** Active snap guide */
  snapGuideMs: number | null;
  hasMoved: boolean;
}

export interface TrimRenderState {
  isTrimming: boolean;
  trimItemId: string | null;
  trimEdge: TrimEdge | null;
  currentStartMs: number;
  currentEndMs: number;
  snapGuideMs: number | null;
}

const TRIM_THRESHOLD_PX = 2;

// ── Hook ─────────────────────────────────────────

export function useTimelineTrim(zoom: number) {
  const trimRef = useRef<TrimState | null>(null);
  const renderStateRef = useRef<TrimRenderState>({
    isTrimming: false,
    trimItemId: null,
    trimEdge: null,
    currentStartMs: 0,
    currentEndMs: 0,
    snapGuideMs: null,
  });
  const forceUpdateRef = useRef<() => void>(() => {});

  const setForceUpdate = useCallback((fn: () => void) => {
    forceUpdateRef.current = fn;
  }, []);

  const onTrimStart = useCallback(
    (
      e: React.PointerEvent,
      itemId: string,
      trackId: string,
      edge: TrimEdge,
      startMs: number,
      endMs: number
    ) => {
      if (e.button !== 0) return;

      // Check if item is locked
      const store = useEditorStore.getState();
      const item = store.trackItems.find((i) => i.id === itemId);
      if (!item || item.locked) return;

      e.stopPropagation(); // Don't trigger drag
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      trimRef.current = {
        itemId,
        trackId,
        edge,
        startClientX: e.clientX,
        originStartMs: startMs,
        originEndMs: endMs,
        currentMs: edge === "start" ? startMs : endMs,
        snapGuideMs: null,
        hasMoved: false,
      };
    },
    []
  );

  const onTrimMove = useCallback(
    (e: React.PointerEvent) => {
      const trim = trimRef.current;
      if (!trim) return;

      const dx = e.clientX - trim.startClientX;

      if (!trim.hasMoved) {
        if (Math.abs(dx) < TRIM_THRESHOLD_PX) return;
        trim.hasMoved = true;
      }

      const deltaMs = pixelToMs(dx, zoom);
      const store = useEditorStore.getState();

      let newMs: number;

      if (trim.edge === "start") {
        // Trim start: move start forward/backward
        newMs = Math.round(trim.originStartMs + deltaMs);
        // Clamp: can't go below 0 or past end - MIN_CLIP_MS
        newMs = Math.max(0, Math.min(trim.originEndMs - MIN_CLIP_MS, newMs));
      } else {
        // Trim end: move end forward/backward
        newMs = Math.round(trim.originEndMs + deltaMs);
        // Clamp: can't go below start + MIN_CLIP_MS
        newMs = Math.max(trim.originStartMs + MIN_CLIP_MS, newMs);
      }

      // Snap
      const { snapSettings, trackItems, markers, playheadMs } = store;
      if (snapSettings.enabled) {
        const excludeIds = new Set([trim.itemId]);
        const snapPoints = collectSnapPoints(
          trackItems,
          markers,
          playheadMs,
          snapSettings,
          excludeIds
        );
        const thresholdMs = snapThresholdToMs(snapSettings.thresholdPx, zoom);
        const snapResult = findSnap(newMs, snapPoints, thresholdMs);

        if (snapResult.snapped) {
          // Re-validate after snap
          if (trim.edge === "start") {
            newMs = Math.max(0, Math.min(trim.originEndMs - MIN_CLIP_MS, snapResult.ms));
          } else {
            newMs = Math.max(trim.originStartMs + MIN_CLIP_MS, snapResult.ms);
          }
          trim.snapGuideMs = snapResult.snapPoint?.ms ?? null;
        } else {
          trim.snapGuideMs = null;
        }
      } else {
        trim.snapGuideMs = null;
      }

      trim.currentMs = newMs;

      renderStateRef.current = {
        isTrimming: true,
        trimItemId: trim.itemId,
        trimEdge: trim.edge,
        currentStartMs: trim.edge === "start" ? newMs : trim.originStartMs,
        currentEndMs: trim.edge === "end" ? newMs : trim.originEndMs,
        snapGuideMs: trim.snapGuideMs,
      };
      forceUpdateRef.current();
    },
    [zoom]
  );

  const onTrimEnd = useCallback(
    (e: React.PointerEvent) => {
      const trim = trimRef.current;
      if (!trim) return;

      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Pointer capture may already be released
      }

      if (trim.hasMoved) {
        const store = useEditorStore.getState();
        if (trim.edge === "start") {
          store.trimTrackItemStart(trim.itemId, trim.currentMs);
        } else {
          store.trimTrackItemEnd(trim.itemId, trim.currentMs);
        }
      }

      trimRef.current = null;
      renderStateRef.current = {
        isTrimming: false,
        trimItemId: null,
        trimEdge: null,
        currentStartMs: 0,
        currentEndMs: 0,
        snapGuideMs: null,
      };
      forceUpdateRef.current();
    },
    []
  );

  return {
    trimState: renderStateRef,
    onTrimStart,
    onTrimMove,
    onTrimEnd,
    setForceUpdate,
  };
}
