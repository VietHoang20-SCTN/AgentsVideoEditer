// ============================================
// Timeline Track Lane - Renders items in a track
// Passes drag/trim callbacks down to items
// ============================================

"use client";

import React from "react";
import type { Track } from "@/types/editor";
import { useTrackItemsForTrack } from "@/hooks/use-editor-store";
import { useEditorStore } from "@/stores/editor-store";
import { msToPixel, pixelToMs } from "./timeline-constants";
import TimelineItem from "./timeline-item";
import type { DragRenderState } from "./use-timeline-drag";
import type { TrimRenderState } from "./use-timeline-trim";
import type { TrimEdge } from "./use-timeline-trim";

interface TimelineTrackLaneProps {
  track: Track;
  dragState: DragRenderState;
  trimState: TrimRenderState;
  onDragStart: (
    e: React.PointerEvent,
    itemId: string,
    trackId: string,
    startMs: number,
    endMs: number
  ) => void;
  onTrimStart: (
    e: React.PointerEvent,
    itemId: string,
    trackId: string,
    edge: TrimEdge,
    startMs: number,
    endMs: number
  ) => void;
}

function TimelineTrackLaneInner({
  track,
  dragState,
  trimState,
  onDragStart,
  onTrimStart,
}: TimelineTrackLaneProps) {
  const items = useTrackItemsForTrack(track.id);
  const zoom = useEditorStore((s) => s.zoom);
  const duration = useEditorStore((s) => s.duration);
  const scrollLeft = useEditorStore((s) => s.scrollLeft);

  // Total lane width based on duration
  const totalWidth = msToPixel(duration, zoom);

  // Only render grid lines in visible range (with buffer)
  const viewportWidth = 1200; // approximate max viewport
  const visibleStartMs = Math.max(0, pixelToMs(scrollLeft - 100, zoom));
  const visibleEndMs = pixelToMs(scrollLeft + viewportWidth + 100, zoom);
  const gridStartSec = Math.floor(visibleStartMs / 1000);
  const gridEndSec = Math.min(Math.ceil(visibleEndMs / 1000), Math.ceil(duration / 1000) + 1);

  return (
    <div
      className={`relative border-b border-gray-800 ${
        !track.visible ? "opacity-40" : ""
      } ${track.locked ? "pointer-events-none" : ""}`}
      style={{ height: track.height, minWidth: totalWidth }}
    >
      {/* Background grid lines (visible range only) */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: Math.max(0, gridEndSec - gridStartSec) }, (_, i) => {
          const sec = gridStartSec + i;
          const x = msToPixel(sec * 1000, zoom);
          return (
            <div
              key={sec}
              className="absolute top-0 h-full w-px bg-gray-800/50"
              style={{ left: x }}
            />
          );
        })}
      </div>

      {/* Drop zone highlight when dragging over this track */}
      {dragState.isDragging && dragState.currentTrackId === track.id && (
        <div className="absolute inset-0 bg-blue-500/5 border border-blue-500/20 rounded-sm pointer-events-none z-10" />
      )}

      {/* Track items */}
      {items.map((item) => {
        const isBeingDragged =
          dragState.isDragging && dragState.dragItemId === item.id;
        const isBeingTrimmed =
          trimState.isTrimming && trimState.trimItemId === item.id;

        return (
          <TimelineItem
            key={item.id}
            item={item}
            zoom={zoom}
            trackHeight={track.height}
            isDragging={isBeingDragged}
            isTrimming={isBeingTrimmed}
            previewStartMs={
              isBeingDragged
                ? dragState.currentStartMs
                : isBeingTrimmed
                  ? trimState.currentStartMs
                  : undefined
            }
            previewEndMs={
              isBeingTrimmed ? trimState.currentEndMs : undefined
            }
            onDragStart={onDragStart}
            onTrimStart={onTrimStart}
          />
        );
      })}

      {/* Empty state hint */}
      {items.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[10px] text-gray-700">Empty track</span>
        </div>
      )}
    </div>
  );
}

const TimelineTrackLane = React.memo(TimelineTrackLaneInner);
export default TimelineTrackLane;
