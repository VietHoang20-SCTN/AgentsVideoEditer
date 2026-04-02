"use client";

import { useCallback, useRef } from "react";
import type { Clip, Marker } from "@/components/editor/types";
import { formatTimeShort } from "@/lib/editor/utils";
import ClipTrack from "./clip-track";
import MarkerOverlay from "./marker-overlay";

interface TimelineProps {
  clips: Clip[];
  markers: Marker[];
  playheadMs: number;
  duration: number;
  selectedClipId: string | null;
  zoom: number;
  onSeek: (timeMs: number) => void;
  onSelectClip: (id: string) => void;
  onTrimClip: (
    clipId: string,
    newSourceStartMs: number,
    newSourceEndMs: number
  ) => void;
  onMarkerClick: (marker: Marker) => void;
}

export default function Timeline({
  clips,
  markers,
  playheadMs,
  duration,
  selectedClipId,
  zoom,
  onSeek,
  onSelectClip,
  onTrimClip,
  onMarkerClick,
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const totalWidth = Math.max((duration * zoom) / 1000, 200);

  // Generate time ruler marks
  const getTickInterval = useCallback((): number => {
    if (zoom >= 200) return 1000;
    if (zoom >= 100) return 2000;
    if (zoom >= 50) return 5000;
    if (zoom >= 20) return 10000;
    return 30000;
  }, [zoom]);

  const tickInterval = getTickInterval();
  const ticks: number[] = [];
  for (let t = 0; t <= duration; t += tickInterval) {
    ticks.push(t);
  }

  const playheadLeftPx = (playheadMs / 1000) * zoom;

  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      // Only seek if clicking on the background, not on a clip
      if ((e.target as HTMLElement).closest("[data-clip-track]")) return;

      const rect = container.getBoundingClientRect();
      const scrollLeft = container.scrollLeft;
      const x = e.clientX - rect.left + scrollLeft;
      const timeMs = (x / zoom) * 1000;
      onSeek(Math.max(0, Math.min(duration, timeMs)));
    },
    [zoom, duration, onSeek]
  );

  return (
    <div
      ref={containerRef}
      className="relative overflow-x-auto bg-gray-900 border-t border-gray-700"
      onClick={handleBackgroundClick}
    >
      <div className="relative" style={{ width: `${totalWidth}px`, minHeight: "90px" }}>
        {/* Time ruler */}
        <div className="relative h-6 border-b border-gray-700 select-none">
          {ticks.map((t) => {
            const leftPx = (t / 1000) * zoom;
            return (
              <div
                key={t}
                className="absolute top-0 flex flex-col items-center"
                style={{ left: `${leftPx}px` }}
              >
                <div className="w-px h-3 bg-gray-500" />
                <span className="text-[10px] text-gray-400 mt-0.5 -translate-x-1/2">
                  {formatTimeShort(t)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Track area */}
        <div className="relative mt-2 mx-0" data-clip-track>
          <ClipTrack
            clips={clips}
            selectedClipId={selectedClipId}
            duration={duration}
            zoom={zoom}
            onSelectClip={onSelectClip}
            onTrimClip={onTrimClip}
          />

          <MarkerOverlay
            markers={markers}
            duration={duration}
            zoom={zoom}
            onMarkerClick={onMarkerClick}
          />
        </div>

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none"
          style={{ left: `${playheadLeftPx}px` }}
        >
          {/* Playhead head (triangle) */}
          <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-0 h-0"
            style={{
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "6px solid #ef4444",
            }}
          />
        </div>
      </div>
    </div>
  );
}
