// ============================================
// Video Preview Panel (wrapper for the new layout)
// Center zone - video player + transport controls
// ============================================

"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEditorActions, usePlayback, usePlayheadMs, useDuration } from "@/hooks/use-editor-store";
import { formatTime } from "@/lib/editor/utils";

interface PreviewPanelProps {
  videoSrc: string;
  /** Source time in ms (after output-to-source conversion) */
  sourceTimeMs: number;
}

export default function PreviewPanel({ videoSrc, sourceTimeMs }: PreviewPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isSyncingRef = useRef(false);
  const playback = usePlayback();
  const playheadMs = usePlayheadMs();
  const duration = useDuration();
  const {
    togglePlayback,
    setPlayhead,
    seekForward,
    seekToStart,
  } = useEditorActions();

  const [isMuted, setIsMuted] = useState(false);

  // Sync play/pause state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (playback.isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [playback.isPlaying]);

  // Sync currentTimeMs from external seek
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isSyncingRef.current) return;

    const videoTimeS = sourceTimeMs / 1000;
    if (Math.abs(video.currentTime - videoTimeS) > 0.1) {
      video.currentTime = videoTimeS;
    }
  }, [sourceTimeMs]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    isSyncingRef.current = true;
    // Report source time - will be converted upstream
    setPlayhead(video.currentTime * 1000);
    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  }, [setPlayhead]);

  const handleToggleMute = useCallback(() => {
    setIsMuted((m) => {
      const newMuted = !m;
      if (videoRef.current) {
        videoRef.current.muted = newMuted;
      }
      return newMuted;
    });
  }, []);

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto p-4">
      {/* Video container */}
      <div
        className="relative aspect-video bg-black rounded-lg overflow-hidden group cursor-pointer"
        onClick={togglePlayback}
      >
        <video
          ref={videoRef}
          src={videoSrc}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          preload="metadata"
        />

        {/* Play/Pause overlay */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity ${
            playback.isPlaying
              ? "opacity-0 group-hover:opacity-100"
              : "opacity-100"
          }`}
        >
          <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
            {playback.isPlaying ? (
              <Pause className="text-white" size={28} />
            ) : (
              <Play className="text-white ml-1" size={28} />
            )}
          </div>
        </div>
      </div>

      {/* Transport controls */}
      <div className="flex items-center gap-3 mt-2 px-1">
        {/* Play controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={seekToStart}
            className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            title="Go to start"
          >
            <SkipBack size={16} />
          </button>
          <button
            onClick={togglePlayback}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            {playback.isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
          </button>
          <button
            onClick={() => seekForward(5000)}
            className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            title="Forward 5s"
          >
            <SkipForward size={16} />
          </button>
        </div>

        {/* Time display */}
        <div className="text-xs text-gray-300 font-mono">
          <span>{formatTime(playheadMs)}</span>
          <span className="text-gray-600 mx-1">/</span>
          <span className="text-gray-500">{formatTime(duration)}</span>
        </div>

        <div className="flex-1" />

        {/* Volume */}
        <button
          onClick={handleToggleMute}
          className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>
    </div>
  );
}
