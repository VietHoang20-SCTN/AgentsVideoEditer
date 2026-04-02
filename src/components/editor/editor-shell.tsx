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
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

import { EditorLayout, EditorHeader, LeftPanel, RightPanel, PreviewPanel } from "./layout";
import { Timeline } from "./timeline";
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

  // ── Global keyboard shortcuts ─────────────────────────
  useKeyboardShortcuts();

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
        <Timeline />
      }
    />
  );
}
