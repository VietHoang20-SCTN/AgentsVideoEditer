// ============================================
// Editor Shell v2 - CapCut-style 4-zone Layout
// Bridges the page-level data fetching with the
// new Zustand store + layout system.
// ============================================

"use client";

import { useEffect, useCallback, useMemo, useRef } from "react";

import type {
  EditorProject,
  SourceVideoInfo,
  EditorStateData,
  AIAnalysisData,
} from "@/components/editor/types";
import type { SerializedEditorState, Track, TrackItem } from "@/types/editor";
import { generateId } from "@/types/editor";

import { useEditorActions, usePlayheadMs } from "@/hooks/use-editor-store";
import { useEditorStore } from "@/stores/editor-store";

import { EditorLayout, EditorHeader, LeftPanel, RightPanel, PreviewPanel } from "./layout";
import AnalysisSidebar from "./analysis-sidebar";
import { outputToSourceTime, sourceToOutputTime } from "@/lib/editor/utils";

// ── Props ──────────────────────────────────────────────

interface EditorShellProps {
  project: EditorProject;
  sourceVideo: SourceVideoInfo;
  initialState: EditorStateData;
  aiAnalysis: AIAnalysisData | null;
  onSave: (state: EditorStateData) => Promise<void>;
}

// ── Legacy → Multi-track migration ────────────────────

/**
 * Convert legacy single-track clip array into the new
 * multi-track SerializedEditorState format.
 */
function migrateToMultiTrack(
  legacy: EditorStateData,
  sourceVideo: SourceVideoInfo
): SerializedEditorState {
  // Create a default video track
  const videoTrack: Track = {
    id: generateId("track"),
    type: "video",
    name: "Video 1",
    order: 0,
    height: 48,
    visible: true,
    locked: false,
    muted: false,
  };

  // Convert legacy clips to track items
  const trackItems: TrackItem[] = legacy.clips.map((clip) => ({
    id: clip.id,
    type: "video-clip" as const,
    trackId: videoTrack.id,
    name: "Video Clip",
    startMs: clip.startMs,
    endMs: clip.endMs,
    opacity: 100,
    locked: false,
    properties: {
      sourceStartMs: clip.sourceStartMs,
      sourceEndMs: clip.sourceEndMs,
      sourceAssetKey: sourceVideo.storageKey,
      speed: 1,
      volume: 100,
      audioMuted: false,
      scale: 1,
      posX: 0,
      posY: 0,
      rotation: 0,
      cropLeft: 0,
      cropRight: 0,
      cropTop: 0,
      cropBottom: 0,
      flipH: false,
      flipV: false,
      brightness: 0,
      contrast: 0,
      saturation: 0,
      filterId: null,
      keyframes: [],
    },
  }));

  return {
    tracks: [videoTrack],
    trackItems,
    markers: legacy.markers.map((m) => ({
      ...m,
      type: m.type || ("info" as const),
      color: m.color || "#3b82f6",
    })),
    playheadMs: legacy.playheadMs,
    version: legacy.version,
    duration: legacy.duration,
    snapSettings: {
      enabled: true,
      snapToPlayhead: true,
      snapToItems: true,
      snapToMarkers: true,
      thresholdPx: 8,
    },
  };
}

/**
 * Convert the new multi-track state back to the legacy format
 * for saving via the existing API.
 */
function serializeToLegacy(store: ReturnType<typeof useEditorStore.getState>): EditorStateData {
  // Extract video clips and convert back to legacy Clip format
  const videoClips = store.trackItems
    .filter((item) => item.type === "video-clip")
    .sort((a, b) => a.startMs - b.startMs)
    .map((item) => {
      const props = (item as { properties: { sourceStartMs: number; sourceEndMs: number } }).properties;
      return {
        id: item.id,
        startMs: item.startMs,
        endMs: item.endMs,
        sourceStartMs: props.sourceStartMs,
        sourceEndMs: props.sourceEndMs,
      };
    });

  return {
    clips: videoClips,
    markers: store.markers.map((m) => ({
      id: m.id,
      timeMs: m.timeMs,
      label: m.label,
      type: m.type,
      color: m.color,
    })),
    playheadMs: store.playheadMs,
    version: store.version + 1,
    duration: store.duration,
  };
}

// ── Component ──────────────────────────────────────────

export default function EditorShell({
  project,
  sourceVideo,
  initialState,
  aiAnalysis,
  onSave,
}: EditorShellProps) {
  const { loadState, markClean } = useEditorActions();
  const playheadMs = usePlayheadMs();
  const initializedRef = useRef(false);

  // ── Initialize store from legacy state (once) ───────
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const multiTrackState = migrateToMultiTrack(initialState, sourceVideo);
    loadState(multiTrackState);
  }, [initialState, sourceVideo, loadState]);

  // ── Source/Output time conversion ────────────────────
  // Legacy clips for time conversion (video clips only)
  const trackItems = useEditorStore((s) => s.trackItems);
  const legacyClips = useMemo(() => {
    return trackItems
      .filter((item) => item.type === "video-clip")
      .sort((a, b) => a.startMs - b.startMs)
      .map((item) => {
        const props = (item as { properties: { sourceStartMs: number; sourceEndMs: number } }).properties;
        return {
          id: item.id,
          startMs: item.startMs,
          endMs: item.endMs,
          sourceStartMs: props.sourceStartMs,
          sourceEndMs: props.sourceEndMs,
        };
      });
  }, [trackItems]);

  const sourceTimeMs = useMemo(
    () => outputToSourceTime(legacyClips, playheadMs),
    [legacyClips, playheadMs]
  );

  // ── Save handler ────────────────────────────────────
  const handleSave = useCallback(async () => {
    const store = useEditorStore.getState();
    const legacyState = serializeToLegacy(store);
    await onSave(legacyState);
    markClean();
  }, [onSave, markClean]);

  // ── Analysis seek (source time → output time) ───────
  const handleAnalysisSeek = useCallback(
    (timeMs: number) => {
      const outputMs = sourceToOutputTime(legacyClips, timeMs);
      if (outputMs !== null) {
        useEditorStore.getState().setPlayhead(outputMs);
      }
    },
    [legacyClips]
  );

  // ── Render ───────────────────────────────────────────
  return (
    <EditorLayout
      header={
        <EditorHeader
          projectId={project.id}
          projectName={project.name}
          onSave={handleSave}
        />
      }
      leftPanel={
        <LeftPanel
          analysisSidebar={
            <AnalysisSidebar
              analysis={aiAnalysis}
              onSeek={handleAnalysisSeek}
              isLoading={false}
            />
          }
        />
      }
      preview={
        <PreviewPanel
          videoSrc={sourceVideo.mediaUrl}
          sourceTimeMs={sourceTimeMs}
        />
      }
      rightPanel={<RightPanel />}
      timeline={
        <TimelinePlaceholder />
      }
    />
  );
}

// ── Temporary timeline placeholder ────────────────────
// Will be replaced by the real multi-track timeline in Phase 2.

function TimelinePlaceholder() {
  const playheadMs = usePlayheadMs();
  const { togglePlayback, seekForward, seekBackward } = useEditorActions();
  const tracks = useEditorStore((s) => s.tracks);
  const trackItems = useEditorStore((s) => s.trackItems);

  return (
    <div className="flex flex-col h-full">
      {/* Mini toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-800 bg-gray-900/80">
        <button
          onClick={togglePlayback}
          className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
        >
          Play/Pause
        </button>
        <button
          onClick={() => seekBackward(5000)}
          className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
        >
          -5s
        </button>
        <button
          onClick={() => seekForward(5000)}
          className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
        >
          +5s
        </button>
        <span className="text-xs text-gray-500 font-mono ml-auto">
          {Math.floor(playheadMs / 1000)}s
        </span>
        <span className="text-xs text-gray-600 ml-2">
          {tracks.length} tracks | {trackItems.length} items
        </span>
      </div>

      {/* Track lanes (basic visualization) */}
      <div className="flex-1 overflow-auto p-2">
        {tracks.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-600 text-xs">
            No tracks. Multi-track timeline coming in Phase 2.
          </div>
        ) : (
          <div className="space-y-1">
            {tracks
              .sort((a, b) => a.order - b.order)
              .map((track) => {
                const items = trackItems.filter((i) => i.trackId === track.id);
                return (
                  <div
                    key={track.id}
                    className="flex items-center gap-2 h-10 bg-gray-800/50 rounded px-2"
                  >
                    <span className="text-xs text-gray-400 w-16 shrink-0 truncate">
                      {track.name}
                    </span>
                    <div className="flex-1 relative h-6">
                      {items.map((item) => {
                        const maxEnd = Math.max(
                          ...trackItems.map((i) => i.endMs),
                          1
                        );
                        const left = (item.startMs / maxEnd) * 100;
                        const width =
                          ((item.endMs - item.startMs) / maxEnd) * 100;
                        return (
                          <div
                            key={item.id}
                            className="absolute top-0 h-full rounded bg-blue-600/60 border border-blue-500/40"
                            style={{
                              left: `${left}%`,
                              width: `${Math.max(width, 0.5)}%`,
                            }}
                            title={`${item.name} (${Math.round(item.startMs / 1000)}s - ${Math.round(item.endMs / 1000)}s)`}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
