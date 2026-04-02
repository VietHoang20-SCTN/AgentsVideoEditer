// ============================================
// Timeline Snap Guides – Visual snap indicator lines
// Shows vertical guide lines when items snap
// ============================================

"use client";

import { msToPixel } from "./timeline-constants";

interface TimelineSnapGuidesProps {
  snapGuideMs: number | null;
  zoom: number;
  height: number;
}

export default function TimelineSnapGuides({
  snapGuideMs,
  zoom,
  height,
}: TimelineSnapGuidesProps) {
  if (snapGuideMs === null) return null;

  const x = msToPixel(snapGuideMs, zoom);

  return (
    <div
      className="absolute top-0 z-40 pointer-events-none"
      style={{ left: x, height }}
    >
      <div className="w-px h-full bg-yellow-400/80" />
    </div>
  );
}
