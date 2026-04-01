"use client";

import { useCallback, useRef } from "react";
import type { Clip } from "@/components/editor/types";
import { formatTimeShort } from "@/lib/editor/utils";

interface ClipTrackProps {
  clips: Clip[];
  selectedClipId: string | null;
  duration: number;
  zoom: number;
  onSelectClip: (id: string) => void;
  onTrimClip: (
    clipId: string,
    newSourceStartMs: number,
    newSourceEndMs: number
  ) => void;
}

const CLIP_COLORS = ["bg-indigo-500", "bg-indigo-400"];
const MIN_CLIP_MS = 100;

export default function ClipTrack({
  clips,
  selectedClipId,
  duration,
  zoom,
  onSelectClip,
  onTrimClip,
}: ClipTrackProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<{
    clipId: string;
    edge: "left" | "right";
    startX: number;
    origSourceStart: number;
    origSourceEnd: number;
  } | null>(null);

  const totalWidth = (duration * zoom) / 1000;

  const handleMouseDown = useCallback(
    (
      e: React.MouseEvent,
      clipId: string,
      edge: "left" | "right",
      sourceStartMs: number,
      sourceEndMs: number
    ) => {
      e.stopPropagation();
      e.preventDefault();

      draggingRef.current = {
        clipId,
        edge,
        startX: e.clientX,
        origSourceStart: sourceStartMs,
        origSourceEnd: sourceEndMs,
      };

      const handleMouseMove = (ev: MouseEvent) => {
        if (!draggingRef.current) return;
        const dx = ev.clientX - draggingRef.current.startX;
        const msPerPx = 1000 / zoom;
        const deltaMs = dx * msPerPx;

        let newStart = draggingRef.current.origSourceStart;
        let newEnd = draggingRef.current.origSourceEnd;

        if (draggingRef.current.edge === "left") {
          newStart = Math.max(0, draggingRef.current.origSourceStart + deltaMs);
          if (newEnd - newStart < MIN_CLIP_MS) {
            newStart = newEnd - MIN_CLIP_MS;
          }
        } else {
          newEnd = Math.max(
            newStart + MIN_CLIP_MS,
            draggingRef.current.origSourceEnd + deltaMs
          );
        }

        onTrimClip(draggingRef.current.clipId, newStart, newEnd);
      };

      const handleMouseUp = () => {
        draggingRef.current = null;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [zoom, onTrimClip]
  );

  if (clips.length === 0) {
    return (
      <div
        ref={trackRef}
        className="relative h-14 bg-gray-800/50 rounded-md flex items-center justify-center"
        style={{ width: `${Math.max(totalWidth, 200)}px` }}
      >
        <span className="text-gray-500 text-xs">No clips</span>
      </div>
    );
  }

  return (
    <div
      ref={trackRef}
      className="relative h-14 flex"
      style={{ width: `${totalWidth}px` }}
    >
      {clips.map((clip, index) => {
        const clipDuration = clip.endMs - clip.startMs;
        const widthPx = (clipDuration / 1000) * zoom;
        const leftPx = (clip.startMs / 1000) * zoom;
        const isSelected = clip.id === selectedClipId;
        const colorClass = CLIP_COLORS[index % CLIP_COLORS.length];

        return (
          <div
            key={clip.id}
            className={`absolute top-0 h-full group cursor-pointer select-none ${colorClass} rounded-sm flex items-center justify-center overflow-hidden transition-shadow ${
              isSelected
                ? "ring-2 ring-blue-400 ring-offset-1 ring-offset-gray-950 z-10"
                : "hover:brightness-110"
            }`}
            style={{
              left: `${leftPx}px`,
              width: `${Math.max(widthPx, 2)}px`,
            }}
            onClick={() => onSelectClip(clip.id)}
          >
            {/* Left trim handle */}
            <div
              className="absolute left-0 top-0 w-1.5 h-full bg-white/30 hover:bg-white/60 cursor-col-resize z-20 opacity-0 group-hover:opacity-100 transition-opacity"
              onMouseDown={(e) =>
                handleMouseDown(
                  e,
                  clip.id,
                  "left",
                  clip.sourceStartMs,
                  clip.sourceEndMs
                )
              }
            />

            {/* Clip label */}
            {widthPx > 50 && (
              <span className="text-white text-xs font-medium drop-shadow-sm pointer-events-none truncate px-2">
                {formatTimeShort(clipDuration)}
              </span>
            )}

            {/* Right trim handle */}
            <div
              className="absolute right-0 top-0 w-1.5 h-full bg-white/30 hover:bg-white/60 cursor-col-resize z-20 opacity-0 group-hover:opacity-100 transition-opacity"
              onMouseDown={(e) =>
                handleMouseDown(
                  e,
                  clip.id,
                  "right",
                  clip.sourceStartMs,
                  clip.sourceEndMs
                )
              }
            />
          </div>
        );
      })}
    </div>
  );
}
