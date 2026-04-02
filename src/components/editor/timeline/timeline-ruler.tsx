// ============================================
// Timeline Ruler - Time markers with ticks
// ============================================

"use client";

import { useMemo, useCallback, useRef } from "react";
import { useTimelineView, useEditorActions } from "@/hooks/use-editor-store";
import {
  msToPixel,
  pixelToMs,
  formatRulerTime,
  getRulerInterval,
  RULER_HEIGHT,
  TRACK_HEADER_WIDTH,
} from "./timeline-constants";

export default function TimelineRuler() {
  const { zoom, scrollLeft, duration } = useTimelineView();
  const { setPlayhead } = useEditorActions();
  const rulerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const visibleStartMs = pixelToMs(scrollLeft, zoom);
  const visibleWidthPx = typeof window !== "undefined" ? window.innerWidth : 1920;
  const visibleEndMs = pixelToMs(scrollLeft + visibleWidthPx, zoom);

  // Total timeline width
  const totalWidth = msToPixel(duration, zoom);

  // Get ruler interval
  const { majorMs, minorMs } = useMemo(
    () => getRulerInterval(zoom),
    [zoom]
  );

  // Generate tick marks within visible range (with buffer)
  const ticks = useMemo(() => {
    const result: Array<{ ms: number; isMajor: boolean }> = [];
    const bufferMs = majorMs * 2;
    const start = Math.max(0, Math.floor((visibleStartMs - bufferMs) / minorMs) * minorMs);
    const end = Math.min(duration + bufferMs, visibleEndMs + bufferMs);

    for (let ms = start; ms <= end; ms += minorMs) {
      result.push({ ms, isMajor: ms % majorMs === 0 });
    }
    return result;
  }, [visibleStartMs, visibleEndMs, duration, majorMs, minorMs]);

  // Click on ruler to set playhead
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!rulerRef.current) return;
      const rect = rulerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left + scrollLeft;
      const ms = pixelToMs(clickX, zoom);
      setPlayhead(Math.max(0, Math.min(duration, Math.round(ms))));
    },
    [scrollLeft, zoom, duration, setPlayhead]
  );

  return (
    <div
      ref={rulerRef}
      role="slider"
      aria-label="Timeline ruler - click to seek"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={Math.round(pixelToMs(scrollLeft, zoom))}
      className="relative bg-gray-900 border-b border-gray-700 cursor-pointer select-none"
      style={{ height: RULER_HEIGHT, minWidth: totalWidth }}
      onClick={handleClick}
    >
      {ticks.map(({ ms, isMajor }) => {
        const x = msToPixel(ms, zoom);
        return (
          <div
            key={ms}
            className="absolute top-0"
            style={{ left: x }}
          >
            {/* Tick line */}
            <div
              className={`w-px ${isMajor ? "h-3 bg-gray-500" : "h-1.5 bg-gray-700"}`}
              style={{ marginTop: isMajor ? 0 : RULER_HEIGHT - 6 }}
            />
            {/* Label for major ticks */}
            {isMajor && (
              <span
                className="absolute text-[10px] text-gray-500 whitespace-nowrap"
                style={{ top: 10, left: 3 }}
              >
                {formatRulerTime(ms)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
