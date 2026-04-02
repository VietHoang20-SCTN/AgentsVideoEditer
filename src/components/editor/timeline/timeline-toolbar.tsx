// ============================================
// Timeline Toolbar - Playback controls + Zoom
// ============================================

"use client";

import { useCallback } from "react";
import {
  usePlayback,
  usePlayheadMs,
  useZoom,
  useDuration,
  useEditorActions,
  useSnapSettings,
  useIsDirty,
} from "@/hooks/use-editor-store";
import { MIN_ZOOM, MAX_ZOOM } from "@/types/editor";

function formatTimecode(ms: number): string {
  const totalSec = Math.max(0, ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = Math.floor(totalSec % 60);
  const frames = Math.floor((totalSec % 1) * 30); // 30fps approximation
  return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}:${frames.toString().padStart(2, "0")}`;
}

export default function TimelineToolbar() {
  const playback = usePlayback();
  const playheadMs = usePlayheadMs();
  const zoom = useZoom();
  const duration = useDuration();
  const snap = useSnapSettings();
  const isDirty = useIsDirty();
  const {
    togglePlayback,
    seekToStart,
    seekToEnd,
    seekBackward,
    seekForward,
    seekToPrevItem,
    seekToNextItem,
    setZoom,
    zoomIn,
    zoomOut,
    zoomToFit,
    toggleSnap,
  } = useEditorActions();

  const handleZoomChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setZoom(Number(e.target.value));
    },
    [setZoom]
  );

  return (
    <div className="flex items-center gap-1 px-2 py-1 border-b border-gray-800 bg-gray-900/90 select-none" role="toolbar" aria-label="Timeline controls">
      {/* ── Playback Controls ──────────────── */}
      <div className="flex items-center gap-0.5">
        <ToolbarBtn
          onClick={seekToStart}
          title="Go to start (Home)"
          label="⏮"
        />
        <ToolbarBtn
          onClick={seekToPrevItem}
          title="Previous item"
          label="⏪"
        />
        <ToolbarBtn
          onClick={() => seekBackward(5000)}
          title="Back 5s"
          label="◀"
        />
        <button
          onClick={togglePlayback}
          className={`px-2.5 py-1 text-sm rounded transition-colors ${
            playback.isPlaying
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-gray-700 hover:bg-gray-600 text-gray-200"
          }`}
          title="Play/Pause (Space)"
          aria-label={playback.isPlaying ? "Pause" : "Play"}
        >
          {playback.isPlaying ? "⏸" : "▶"}
        </button>
        <ToolbarBtn
          onClick={() => seekForward(5000)}
          title="Forward 5s"
          label="▶"
        />
        <ToolbarBtn
          onClick={seekToNextItem}
          title="Next item"
          label="⏩"
        />
        <ToolbarBtn
          onClick={seekToEnd}
          title="Go to end (End)"
          label="⏭"
        />
      </div>

      {/* ── Timecode Display ──────────────── */}
      <div className="mx-2 px-2 py-0.5 bg-gray-800 rounded font-mono text-xs text-gray-300 min-w-[90px] text-center">
        {formatTimecode(playheadMs)}
      </div>

      {/* ── Playback Rate ────────────────── */}
      <span className="text-[10px] text-gray-500">
        {playback.playbackRate}x
      </span>

      {/* ── Spacer ───────────────────────── */}
      <div className="flex-1" />

      {/* ── Dirty indicator ──────────────── */}
      {isDirty && (
        <span className="text-[10px] text-yellow-500 mr-1" title="Unsaved changes">
          ●
        </span>
      )}

      {/* ── Snap Toggle ──────────────────── */}
      <ToolbarBtn
        onClick={toggleSnap}
        title={`Snap: ${snap.enabled ? "ON" : "OFF"}`}
        label="⊞"
        active={snap.enabled}
      />

      {/* ── Zoom Controls ────────────────── */}
      <div className="flex items-center gap-1 ml-1">
        <ToolbarBtn onClick={zoomOut} title="Zoom out (-)" label="−" />
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          value={zoom}
          onChange={handleZoomChange}
          className="w-20 h-1 accent-blue-500 cursor-pointer"
          title={`Zoom: ${zoom} px/s`}
          aria-label={`Zoom level: ${zoom} pixels per second`}
        />
        <ToolbarBtn onClick={zoomIn} title="Zoom in (+)" label="+" />
        <ToolbarBtn
          onClick={zoomToFit}
          title="Zoom to fit"
          label="⊡"
        />
      </div>

      {/* ── Duration ─────────────────────── */}
      <span className="text-[10px] text-gray-600 ml-2 font-mono">
        {formatTimecode(duration)}
      </span>
    </div>
  );
}

// ── Toolbar Button Component ──────────────────────

interface ToolbarBtnProps {
  onClick: () => void;
  title: string;
  label: string;
  active?: boolean;
}

function ToolbarBtn({ onClick, title, label, active }: ToolbarBtnProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`w-6 h-6 flex items-center justify-center text-xs rounded transition-colors ${
        active
          ? "bg-blue-600/30 text-blue-400 hover:bg-blue-600/50"
          : "text-gray-400 hover:bg-gray-700 hover:text-gray-200"
      }`}
    >
      {label}
    </button>
  );
}
