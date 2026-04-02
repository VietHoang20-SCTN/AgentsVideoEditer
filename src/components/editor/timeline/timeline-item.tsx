// ============================================
// Timeline Item - Single clip/overlay/effect block
// Supports drag-to-move and edge trimming
// ============================================

"use client";

import React, { useMemo, useCallback } from "react";
import type { TrackItem } from "@/types/editor";
import { useSelection, useEditorActions } from "@/hooks/use-editor-store";
import { msToPixel, TRACK_TYPE_COLORS, MIN_ITEM_LABEL_WIDTH } from "./timeline-constants";
import type { TrimEdge } from "./use-timeline-trim";

// ── Props ────────────────────────────────────────

interface TimelineItemProps {
  item: TrackItem;
  zoom: number;
  trackHeight: number;
  /** Override startMs during drag preview */
  previewStartMs?: number;
  /** Override endMs during trim preview */
  previewEndMs?: number;
  /** Whether this item is currently being dragged */
  isDragging?: boolean;
  /** Whether this item is currently being trimmed */
  isTrimming?: boolean;
  /** Callbacks from parent */
  onDragStart?: (
    e: React.PointerEvent,
    itemId: string,
    trackId: string,
    startMs: number,
    endMs: number
  ) => void;
  onTrimStart?: (
    e: React.PointerEvent,
    itemId: string,
    trackId: string,
    edge: TrimEdge,
    startMs: number,
    endMs: number
  ) => void;
}

// ── Component ────────────────────────────────────

function TimelineItemInner({
  item,
  zoom,
  trackHeight,
  previewStartMs,
  previewEndMs,
  isDragging = false,
  isTrimming = false,
  onDragStart,
  onTrimStart,
}: TimelineItemProps) {
  const selection = useSelection();
  const { selectItem } = useEditorActions();
  const isSelected = selection.itemIds.includes(item.id);

  // Use preview values during drag/trim, otherwise real values
  const displayStartMs = previewStartMs ?? item.startMs;
  const displayEndMs = previewEndMs ?? item.endMs;

  // Calculate position and size
  const style = useMemo(() => {
    const left = msToPixel(displayStartMs, zoom);
    const width = msToPixel(displayEndMs - displayStartMs, zoom);
    return {
      left,
      width: Math.max(width, 2),
      top: 2,
      height: trackHeight - 4,
    };
  }, [displayStartMs, displayEndMs, zoom, trackHeight]);

  // Get colors for this item type
  const colors = TRACK_TYPE_COLORS[item.type] ?? TRACK_TYPE_COLORS["video-clip"];

  // ── Handlers ─────────────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (item.locked) return;
      // Only left button
      if (e.button !== 0) return;
      // Don't start drag if clicking on trim handles
      const target = e.target as HTMLElement;
      if (target.dataset.trimHandle) return;

      onDragStart?.(e, item.id, item.trackId, item.startMs, item.endMs);
    },
    [item.id, item.trackId, item.startMs, item.endMs, item.locked, onDragStart]
  );

  const handleTrimPointerDown = useCallback(
    (e: React.PointerEvent, edge: TrimEdge) => {
      if (item.locked) return;
      if (e.button !== 0) return;
      onTrimStart?.(e, item.id, item.trackId, edge, item.startMs, item.endMs);
    },
    [item.id, item.trackId, item.startMs, item.endMs, item.locked, onTrimStart]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (item.locked) return;
      selectItem(item.id, e.shiftKey);
    },
    [item.id, item.locked, selectItem]
  );

  // ── Render ───────────────────────────────────

  return (
    <div
      data-item-id={item.id}
      role="button"
      aria-label={`${item.type} item: ${item.name}, ${Math.round(displayStartMs / 1000)}s to ${Math.round(displayEndMs / 1000)}s${item.locked ? ", locked" : ""}${isSelected ? ", selected" : ""}`}
      aria-selected={isSelected}
      tabIndex={item.locked ? -1 : 0}
      className={`absolute rounded-sm overflow-hidden select-none
        ${colors.bg}
        ${isDragging ? "opacity-80 shadow-xl z-20 ring-2 ring-yellow-400/60" : ""}
        ${isTrimming ? "z-20 ring-2 ring-green-400/60" : ""}
        ${isSelected && !isDragging && !isTrimming
          ? "ring-2 ring-blue-400 ring-offset-1 ring-offset-gray-900 shadow-lg shadow-blue-500/20"
          : !isDragging && !isTrimming
            ? `border ${colors.border} hover:brightness-110`
            : ""
        }
        ${item.locked ? "opacity-60 cursor-not-allowed" : "cursor-grab active:cursor-grabbing"}
      `}
      style={style}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      title={`${item.name}\n${Math.round(displayStartMs / 1000)}s - ${Math.round(displayEndMs / 1000)}s`}
    >
      {/* Item content */}
      <div className="flex items-center h-full px-1.5 gap-1 min-w-0 pointer-events-none">
        {style.width > MIN_ITEM_LABEL_WIDTH && (
          <span className={`text-[10px] ${colors.text} truncate leading-none`}>
            {item.name}
          </span>
        )}
      </div>

      {/* Left trim handle */}
      <div
        data-trim-handle="start"
        className="absolute left-0 top-0 w-2 h-full cursor-col-resize z-10
          bg-white/0 hover:bg-white/20 active:bg-white/30 transition-colors
          group"
        onPointerDown={(e) => handleTrimPointerDown(e, "start")}
      >
        <div className="absolute left-0 top-0 w-0.5 h-full bg-white/20 group-hover:bg-white/50 rounded-l-sm" />
      </div>

      {/* Right trim handle */}
      <div
        data-trim-handle="end"
        className="absolute right-0 top-0 w-2 h-full cursor-col-resize z-10
          bg-white/0 hover:bg-white/20 active:bg-white/30 transition-colors
          group"
        onPointerDown={(e) => handleTrimPointerDown(e, "end")}
      >
        <div className="absolute right-0 top-0 w-0.5 h-full bg-white/20 group-hover:bg-white/50 rounded-r-sm" />
      </div>
    </div>
  );
}

const TimelineItem = React.memo(TimelineItemInner);
export default TimelineItem;
