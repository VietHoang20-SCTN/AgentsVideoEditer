// ============================================
// Timeline Playhead - Vertical indicator line
// ============================================

"use client";

import { usePlayheadMs, useZoom } from "@/hooks/use-editor-store";
import { msToPixel } from "./timeline-constants";

interface TimelinePlayheadProps {
  /** Full height of the timeline tracks area */
  height: number;
}

export default function TimelinePlayhead({ height }: TimelinePlayheadProps) {
  const playheadMs = usePlayheadMs();
  const zoom = useZoom();
  const x = msToPixel(playheadMs, zoom);

  return (
    <div
      className="absolute top-0 z-30 pointer-events-none"
      style={{ left: x, height }}
    >
      {/* Triangle indicator at top */}
      <div
        className="relative -left-[5px] w-0 h-0"
        style={{
          borderLeft: "5px solid transparent",
          borderRight: "5px solid transparent",
          borderTop: "6px solid #ef4444",
        }}
      />
      {/* Vertical line */}
      <div className="w-px h-full bg-red-500 -mt-px" />
    </div>
  );
}
