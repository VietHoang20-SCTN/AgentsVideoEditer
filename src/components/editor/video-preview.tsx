"use client";

import { useRef, useEffect, useCallback } from "react";
import { Play, Pause } from "lucide-react";
import { formatTime } from "@/lib/editor/utils";

interface VideoPreviewProps {
  src: string;
  currentTimeMs: number;
  isPlaying: boolean;
  onTimeUpdate: (timeMs: number) => void;
  onPlayPause: () => void;
  onSeek: (timeMs: number) => void;
  duration: number;
}

export default function VideoPreview({
  src,
  currentTimeMs,
  isPlaying,
  onTimeUpdate,
  onPlayPause,
  onSeek,
  duration,
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isSyncingRef = useRef(false);
  const progressRef = useRef<HTMLDivElement>(null);

  // Sync play/pause state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(() => {
        // Autoplay might be blocked
      });
    } else {
      video.pause();
    }
  }, [isPlaying]);

  // Sync currentTimeMs from external seek (e.g. timeline click)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isSyncingRef.current) return;

    const videoTimeS = currentTimeMs / 1000;
    // Only seek if there's a significant difference to avoid loops
    if (Math.abs(video.currentTime - videoTimeS) > 0.1) {
      video.currentTime = videoTimeS;
    }
  }, [currentTimeMs]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    isSyncingRef.current = true;
    onTimeUpdate(video.currentTime * 1000);
    // Reset flag after a tick so external sync can still work
    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  }, [onTimeUpdate]);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent) => {
      const bar = progressRef.current;
      if (!bar || duration <= 0) return;
      const rect = bar.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, x / rect.width));
      onSeek(ratio * duration);
    },
    [duration, onSeek]
  );

  const progress = duration > 0 ? (currentTimeMs / duration) * 100 : 0;

  return (
    <div className="flex flex-col bg-gray-900 rounded-lg overflow-hidden">
      {/* Video container */}
      <div className="relative aspect-video bg-black group cursor-pointer" onClick={onPlayPause}>
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          preload="metadata"
        />

        {/* Play/Pause overlay */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity ${
            isPlaying
              ? "opacity-0 group-hover:opacity-100"
              : "opacity-100"
          }`}
        >
          <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
            {isPlaying ? (
              <Pause className="text-white" size={28} />
            ) : (
              <Play className="text-white ml-1" size={28} />
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div
        ref={progressRef}
        className="relative h-1.5 bg-gray-700 cursor-pointer group"
        onClick={handleProgressClick}
      >
        <div
          className="absolute top-0 left-0 h-full bg-blue-500 transition-[width] duration-75"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
        {/* Scrub handle */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-blue-400 border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `calc(${Math.min(progress, 100)}% - 6px)` }}
        />
      </div>

      {/* Time display */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-900 text-xs text-gray-300">
        <span className="font-mono">{formatTime(currentTimeMs)}</span>
        <span className="font-mono text-gray-500">{formatTime(duration)}</span>
      </div>
    </div>
  );
}
