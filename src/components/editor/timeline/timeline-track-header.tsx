// ============================================
// Timeline Track Header - Track label + controls
// ============================================

"use client";

import React from "react";
import type { Track } from "@/types/editor";
import { useEditorActions, useSelection } from "@/hooks/use-editor-store";
import { TRACK_TYPE_ICONS, TRACK_HEADER_WIDTH } from "./timeline-constants";

interface TimelineTrackHeaderProps {
  track: Track;
}

function TimelineTrackHeaderInner({ track }: TimelineTrackHeaderProps) {
  const { toggleTrackVisibility, toggleTrackLock, toggleTrackMute, selectTrack } = useEditorActions();
  const selection = useSelection();
  const isSelected = selection.trackId === track.id;

  return (
    <div
      role="button"
      aria-label={`Track: ${track.name}, type: ${track.type}${track.locked ? ", locked" : ""}${track.muted ? ", muted" : ""}${!track.visible ? ", hidden" : ""}`}
      aria-selected={isSelected}
      className={`flex items-center gap-1 px-2 border-b border-gray-800 shrink-0 cursor-pointer transition-colors ${
        isSelected ? "bg-gray-700/50" : "bg-gray-900 hover:bg-gray-800/50"
      }`}
      style={{ width: TRACK_HEADER_WIDTH, height: track.height }}
      onClick={() => selectTrack(track.id)}
    >
      {/* Track type icon */}
      <span className="w-5 h-5 flex items-center justify-center rounded bg-gray-700 text-[10px] font-bold text-gray-400 shrink-0">
        {TRACK_TYPE_ICONS[track.type] ?? "?"}
      </span>

      {/* Track name */}
      <span className="flex-1 text-xs text-gray-300 truncate" title={track.name}>
        {track.name}
      </span>

      {/* Controls */}
      <div className="flex items-center gap-0.5 shrink-0">
        {/* Visibility toggle */}
        <TrackControlBtn
          onClick={(e) => { e.stopPropagation(); toggleTrackVisibility(track.id); }}
          active={track.visible}
          title={track.visible ? "Hide" : "Show"}
          label={track.visible ? "👁" : "◌"}
        />
        {/* Lock toggle */}
        <TrackControlBtn
          onClick={(e) => { e.stopPropagation(); toggleTrackLock(track.id); }}
          active={track.locked}
          title={track.locked ? "Unlock" : "Lock"}
          label={track.locked ? "🔒" : "🔓"}
        />
        {/* Mute toggle (audio tracks) */}
        {(track.type === "audio" || track.type === "video") && (
          <TrackControlBtn
            onClick={(e) => { e.stopPropagation(); toggleTrackMute(track.id); }}
            active={track.muted}
            title={track.muted ? "Unmute" : "Mute"}
            label={track.muted ? "🔇" : "🔊"}
          />
        )}
      </div>
    </div>
  );
}

// ── Track Control Button ──────────────────────────

interface TrackControlBtnProps {
  onClick: (e: React.MouseEvent) => void;
  active: boolean;
  title: string;
  label: string;
}

function TrackControlBtn({ onClick, active, title, label }: TrackControlBtnProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`w-4 h-4 flex items-center justify-center text-[9px] rounded transition-colors ${
        active ? "text-gray-300" : "text-gray-600 hover:text-gray-400"
      }`}
    >
      {label}
    </button>
  );
}

const TimelineTrackHeader = React.memo(TimelineTrackHeaderInner);
export default TimelineTrackHeader;
