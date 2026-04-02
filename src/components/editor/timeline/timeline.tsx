// ============================================
// Timeline - Main multi-track timeline component
// Wires together toolbar, ruler, tracks, playhead,
// drag/trim interactions, snap guides, and split
// ============================================

"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import {
  useSortedTracks,
  useTimelineView,
  useEditorActions,
} from "@/hooks/use-editor-store";
import { useEditorStore } from "@/stores/editor-store";
import { msToPixel, pixelToMs, TRACK_HEADER_WIDTH } from "./timeline-constants";

import TimelineToolbar from "./timeline-toolbar";
import TimelineRuler from "./timeline-ruler";
import TimelinePlayhead from "./timeline-playhead";
import TimelineTrackHeader from "./timeline-track-header";
import TimelineTrackLane from "./timeline-track-lane";
import TimelineSnapGuides from "./timeline-snap-guides";

import { useTimelineDrag } from "./use-timeline-drag";
import { useTimelineTrim } from "./use-timeline-trim";

export default function Timeline() {
  const tracks = useSortedTracks();
  const { zoom, scrollLeft, duration, playheadMs } = useTimelineView();
  const { setScrollLeft, setPlayhead, clearSelection, splitTrackItem } =
    useEditorActions();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [tracksAreaHeight, setTracksAreaHeight] = useState(200);

  // Force-update counter for interaction rendering
  const [, setTick] = useState(0);
  const forceUpdate = useCallback(() => setTick((t) => t + 1), []);

  // Total timeline width
  const totalWidth = msToPixel(duration, zoom);

  // Calculate tracks area height
  const totalTracksHeight = tracks.reduce((sum, t) => sum + t.height, 0);

  useEffect(() => {
    setTracksAreaHeight(Math.max(totalTracksHeight, 100));
  }, [totalTracksHeight]);

  // ── Drag interaction ─────────────────────────
  const {
    dragState,
    onDragStart,
    onDragMove,
    onDragEnd,
    setForceUpdate: setDragForceUpdate,
  } = useTimelineDrag(zoom);

  // ── Trim interaction ─────────────────────────
  const {
    trimState,
    onTrimStart,
    onTrimMove,
    onTrimEnd,
    setForceUpdate: setTrimForceUpdate,
  } = useTimelineTrim(zoom);

  // Connect force-update to interaction hooks
  useEffect(() => {
    setDragForceUpdate(forceUpdate);
    setTrimForceUpdate(forceUpdate);
  }, [forceUpdate, setDragForceUpdate, setTrimForceUpdate]);

  // ── Scroll sync ──────────────────────────────
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      setScrollLeft(target.scrollLeft);
    },
    [setScrollLeft]
  );

  // ── Click on empty area ──────────────────────
  const handleLaneAreaClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        clearSelection();
      }
    },
    [clearSelection]
  );

  // ── Split at playhead (Alt+Click on item) ────
  const handleLaneAreaAltClick = useCallback(
    (e: React.MouseEvent) => {
      if (!e.altKey) return;

      // Find the item under the click
      const target = e.target as HTMLElement;
      const itemEl = target.closest("[data-item-id]") as HTMLElement | null;
      if (!itemEl) return;

      const itemId = itemEl.dataset.itemId;
      if (!itemId) return;

      e.preventDefault();
      e.stopPropagation();

      // Split at playhead position
      splitTrackItem(itemId, playheadMs);
    },
    [playheadMs, splitTrackItem]
  );

  // ── Scroll to playhead if out of view ────────
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const playheadPx = msToPixel(playheadMs, zoom);
    const viewStart = container.scrollLeft;
    const viewEnd = viewStart + container.clientWidth;

    if (playheadPx < viewStart || playheadPx > viewEnd - 20) {
      container.scrollLeft = Math.max(0, playheadPx - container.clientWidth / 3);
    }
  }, [playheadMs, zoom]);

  // ── Wheel zoom (Ctrl + scroll) ───────────────
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const store = useEditorStore.getState();
        if (e.deltaY < 0) {
          store.zoomIn();
        } else {
          store.zoomOut();
        }
      }
    },
    []
  );

  // ── Pointer move/up for drag and trim ────────
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      onDragMove(e);
      onTrimMove(e);
    },
    [onDragMove, onTrimMove]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      onDragEnd(e);
      onTrimEnd(e);
    },
    [onDragEnd, onTrimEnd]
  );

  // Get current snap guide
  const activeSnapGuideMs =
    dragState.current.snapGuideMs ?? trimState.current.snapGuideMs ?? null;

  return (
    <div
      className="flex flex-col h-full bg-gray-900 select-none"
      role="region"
      aria-label="Timeline editor"
      onWheel={handleWheel}
    >
      {/* ── Toolbar ────────────────────────── */}
      <TimelineToolbar />

      {/* ── Timeline body ──────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* ── Track Headers (fixed left) ───── */}
        <div className="shrink-0 flex flex-col overflow-hidden border-r border-gray-700">
          {/* Ruler spacer */}
          <div className="shrink-0 h-7 border-b border-gray-700 bg-gray-900" />
          {/* Track headers */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {tracks.map((track) => (
              <TimelineTrackHeader key={track.id} track={track} />
            ))}
            {tracks.length === 0 && (
              <div className="flex items-center justify-center h-24 text-xs text-gray-600">
                No tracks
              </div>
            )}
          </div>
        </div>

        {/* ── Scrollable timeline area ─────── */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-auto"
          onScroll={handleScroll}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div style={{ width: Math.max(totalWidth + 200, 800), position: "relative" }}>
            {/* Ruler */}
            <TimelineRuler />

            {/* Tracks + Playhead container */}
            <div
              className="relative"
              onClick={handleLaneAreaClick}
              onClickCapture={handleLaneAreaAltClick}
            >
              {/* Track lanes */}
              {tracks.map((track) => (
                <TimelineTrackLane
                  key={track.id}
                  track={track}
                  dragState={dragState.current}
                  trimState={trimState.current}
                  onDragStart={onDragStart}
                  onTrimStart={onTrimStart}
                />
              ))}

              {/* Empty state */}
              {tracks.length === 0 && (
                <div className="flex items-center justify-center h-24 text-xs text-gray-600">
                  Load a project to see timeline tracks
                </div>
              )}

              {/* Snap guide lines */}
              <TimelineSnapGuides
                snapGuideMs={activeSnapGuideMs}
                zoom={zoom}
                height={tracksAreaHeight}
              />

              {/* Playhead overlay */}
              <TimelinePlayhead height={tracksAreaHeight} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
