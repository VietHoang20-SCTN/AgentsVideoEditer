// ============================================
// useTimelineDrag – Drag-to-move timeline items
// Uses pointer events + capture for smooth drag
// ============================================

"use client";

import { useRef, useCallback } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { pixelToMs } from "./timeline-constants";
import {
  collectSnapPoints,
  findMoveSnap,
  snapThresholdToMs,
  type SnapPoint,
} from "./timeline-snap";

// ── Types ────────────────────────────────────────

export interface DragState {
  /** The item being dragged */
  itemId: string;
  /** Track the item started in */
  originTrackId: string;
  /** Pointer X at drag start (client px) */
  startClientX: number;
  /** Pointer Y at drag start (client px) */
  startClientY: number;
  /** Item startMs at drag start */
  originStartMs: number;
  /** Item endMs at drag start */
  originEndMs: number;
  /** Current visual startMs (may differ from committed) */
  currentStartMs: number;
  /** Track being hovered (for cross-track moves) */
  currentTrackId: string;
  /** Active snap guide line (ms position) */
  snapGuideMs: number | null;
  /** Whether drag has exceeded movement threshold */
  hasMoved: boolean;
}

/** Minimum px movement before drag activates (avoids click→drag) */
const DRAG_THRESHOLD_PX = 3;

/** Result passed to the component for rendering */
export interface DragRenderState {
  isDragging: boolean;
  dragItemId: string | null;
  currentStartMs: number;
  currentTrackId: string | null;
  snapGuideMs: number | null;
}

// ── Hook ─────────────────────────────────────────

export function useTimelineDrag(zoom: number) {
  const dragRef = useRef<DragState | null>(null);
  const renderStateRef = useRef<DragRenderState>({
    isDragging: false,
    dragItemId: null,
    currentStartMs: 0,
    currentTrackId: null,
    snapGuideMs: null,
  });
  const forceUpdateRef = useRef<() => void>(() => {});

  // Expose a setter for the forceUpdate function
  const setForceUpdate = useCallback((fn: () => void) => {
    forceUpdateRef.current = fn;
  }, []);

  const onDragStart = useCallback(
    (
      e: React.PointerEvent,
      itemId: string,
      trackId: string,
      startMs: number,
      endMs: number
    ) => {
      // Only left button
      if (e.button !== 0) return;

      // Check if item is locked
      const store = useEditorStore.getState();
      const item = store.trackItems.find((i) => i.id === itemId);
      if (!item || item.locked) return;

      // Select item if not already selected
      if (!store.selection.itemIds.includes(itemId)) {
        store.selectItem(itemId, e.shiftKey);
      }

      // Capture pointer for smooth dragging
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      dragRef.current = {
        itemId,
        originTrackId: trackId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        originStartMs: startMs,
        originEndMs: endMs,
        currentStartMs: startMs,
        currentTrackId: trackId,
        snapGuideMs: null,
        hasMoved: false,
      };
    },
    []
  );

  const onDragMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const dx = e.clientX - drag.startClientX;
      const dy = e.clientY - drag.startClientY;

      // Check movement threshold
      if (!drag.hasMoved) {
        if (Math.abs(dx) < DRAG_THRESHOLD_PX && Math.abs(dy) < DRAG_THRESHOLD_PX) {
          return;
        }
        drag.hasMoved = true;
      }

      // Convert pixel delta to ms delta
      const deltaMs = pixelToMs(dx, zoom);
      const itemDuration = drag.originEndMs - drag.originStartMs;
      let newStartMs = Math.max(0, Math.round(drag.originStartMs + deltaMs));

      // Snap logic
      const store = useEditorStore.getState();
      const { snapSettings, trackItems, markers, playheadMs } = store;

      if (snapSettings.enabled) {
        const excludeIds = new Set(store.selection.itemIds);
        const snapPoints = collectSnapPoints(
          trackItems,
          markers,
          playheadMs,
          snapSettings,
          excludeIds
        );
        const thresholdMs = snapThresholdToMs(snapSettings.thresholdPx, zoom);
        const newEndMs = newStartMs + itemDuration;
        const snapResult = findMoveSnap(newStartMs, newEndMs, snapPoints, thresholdMs);

        if (snapResult.snapped) {
          newStartMs = newStartMs + snapResult.deltaMs;
          drag.snapGuideMs = snapResult.snapPoint?.ms ?? null;
        } else {
          drag.snapGuideMs = null;
        }
      } else {
        drag.snapGuideMs = null;
      }

      // Clamp to zero
      newStartMs = Math.max(0, newStartMs);

      // Cross-track detection via Y offset
      const trackHeight = 56; // DEFAULT_TRACK_HEIGHT
      const trackOffset = Math.round(dy / trackHeight);
      if (trackOffset !== 0) {
        const tracks = store.tracks.filter((t) => t.visible).sort((a, b) => a.order - b.order);
        const originIdx = tracks.findIndex((t) => t.id === drag.originTrackId);
        const targetIdx = Math.max(0, Math.min(tracks.length - 1, originIdx + trackOffset));
        const targetTrack = tracks[targetIdx];
        if (targetTrack && !targetTrack.locked) {
          drag.currentTrackId = targetTrack.id;
        }
      } else {
        drag.currentTrackId = drag.originTrackId;
      }

      drag.currentStartMs = newStartMs;

      // Update render state
      renderStateRef.current = {
        isDragging: true,
        dragItemId: drag.itemId,
        currentStartMs: newStartMs,
        currentTrackId: drag.currentTrackId,
        snapGuideMs: drag.snapGuideMs,
      };
      forceUpdateRef.current();
    },
    [zoom]
  );

  const onDragEnd = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Pointer capture may already be released
      }

      if (drag.hasMoved) {
        const store = useEditorStore.getState();

        // Commit the move
        store.moveTrackItem(
          drag.itemId,
          drag.currentStartMs,
          drag.currentTrackId !== drag.originTrackId ? drag.currentTrackId : undefined
        );
      }

      dragRef.current = null;
      renderStateRef.current = {
        isDragging: false,
        dragItemId: null,
        currentStartMs: 0,
        currentTrackId: null,
        snapGuideMs: null,
      };
      forceUpdateRef.current();
    },
    []
  );

  return {
    dragState: renderStateRef,
    onDragStart,
    onDragMove,
    onDragEnd,
    setForceUpdate,
  };
}
