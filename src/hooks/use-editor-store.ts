// ============================================
// Xiaohuang Editor - Store Hooks
// Typed selector helpers for the Zustand store
// ============================================

import { useShallow } from "zustand/react/shallow";
import { useEditorStore } from "@/stores/editor-store";
import type {
  EditorStoreState,
  TrackItem,
  Track,
  Marker,
  PanelState,
  PlaybackState,
  SelectionState,
  SnapSettings,
} from "@/types/editor";

// ── Typed Selectors ─────────────────────────────────

/** Select playback state */
export function usePlayback(): PlaybackState {
  return useEditorStore(useShallow((s) => s.playback));
}

/** Select panel state */
export function usePanels(): PanelState {
  return useEditorStore(useShallow((s) => s.panels));
}

/** Select selection state */
export function useSelection(): SelectionState {
  return useEditorStore(useShallow((s) => s.selection));
}

/** Select snap settings */
export function useSnapSettings(): SnapSettings {
  return useEditorStore(useShallow((s) => s.snapSettings));
}

/** Select sorted tracks */
export function useSortedTracks(): Track[] {
  return useEditorStore(
    useShallow((s) => [...s.tracks].sort((a, b) => a.order - b.order))
  );
}

/** Select all track items */
export function useTrackItems(): TrackItem[] {
  return useEditorStore(useShallow((s) => s.trackItems));
}

/** Select items for a specific track */
export function useTrackItemsForTrack(trackId: string): TrackItem[] {
  return useEditorStore(
    useShallow((s) => s.trackItems.filter((i) => i.trackId === trackId))
  );
}

/** Select markers */
export function useMarkers(): Marker[] {
  return useEditorStore(useShallow((s) => s.markers));
}

/** Select currently selected items */
export function useSelectedItems(): TrackItem[] {
  return useEditorStore(
    useShallow((s) =>
      s.trackItems.filter((i) => s.selection.itemIds.includes(i.id))
    )
  );
}

/** Select single selected item (null if multi-select or none) */
export function useSingleSelectedItem(): TrackItem | null {
  return useEditorStore((s) => {
    if (s.selection.itemIds.length !== 1) return null;
    return s.trackItems.find((i) => i.id === s.selection.itemIds[0]) ?? null;
  });
}

/** Select playhead position */
export function usePlayheadMs(): number {
  return useEditorStore((s) => s.playheadMs);
}

/** Select zoom level */
export function useZoom(): number {
  return useEditorStore((s) => s.zoom);
}

/** Select duration */
export function useDuration(): number {
  return useEditorStore((s) => s.duration);
}

/** Select dirty state */
export function useIsDirty(): boolean {
  return useEditorStore((s) => s.isDirty);
}

/** Select saving state */
export function useIsSaving(): boolean {
  return useEditorStore((s) => s.isSaving);
}

/** Select timeline view state */
export function useTimelineView() {
  return useEditorStore(
    useShallow((s) => ({
      zoom: s.zoom,
      scrollLeft: s.scrollLeft,
      duration: s.duration,
      playheadMs: s.playheadMs,
    }))
  );
}

/** Select common editor actions (stable references via zustand) */
export function useEditorActions() {
  return useEditorStore(
    useShallow((s) => ({
      // Track actions
      addTrack: s.addTrack,
      removeTrack: s.removeTrack,
      updateTrack: s.updateTrack,
      reorderTrack: s.reorderTrack,
      toggleTrackVisibility: s.toggleTrackVisibility,
      toggleTrackLock: s.toggleTrackLock,
      toggleTrackMute: s.toggleTrackMute,
      // Item actions
      addTrackItem: s.addTrackItem,
      removeTrackItem: s.removeTrackItem,
      removeTrackItems: s.removeTrackItems,
      updateTrackItem: s.updateTrackItem,
      updateTrackItemProperties: s.updateTrackItemProperties,
      moveTrackItem: s.moveTrackItem,
      trimTrackItemStart: s.trimTrackItemStart,
      trimTrackItemEnd: s.trimTrackItemEnd,
      splitTrackItem: s.splitTrackItem,
      duplicateTrackItem: s.duplicateTrackItem,
      // Selection
      selectItem: s.selectItem,
      deselectItem: s.deselectItem,
      selectItems: s.selectItems,
      selectAll: s.selectAll,
      clearSelection: s.clearSelection,
      selectTrack: s.selectTrack,
      // Clipboard
      copySelection: s.copySelection,
      cutSelection: s.cutSelection,
      paste: s.paste,
      duplicateSelection: s.duplicateSelection,
      // Playback
      setPlayhead: s.setPlayhead,
      togglePlayback: s.togglePlayback,
      setPlaybackRate: s.setPlaybackRate,
      seekForward: s.seekForward,
      seekBackward: s.seekBackward,
      seekToStart: s.seekToStart,
      seekToEnd: s.seekToEnd,
      seekToNextItem: s.seekToNextItem,
      seekToPrevItem: s.seekToPrevItem,
      // Markers
      addMarker: s.addMarker,
      removeMarker: s.removeMarker,
      setMarkers: s.setMarkers,
      // Zoom
      setZoom: s.setZoom,
      zoomIn: s.zoomIn,
      zoomOut: s.zoomOut,
      zoomToFit: s.zoomToFit,
      setScrollLeft: s.setScrollLeft,
      // Panels
      setLeftTab: s.setLeftTab,
      toggleLeftPanel: s.toggleLeftPanel,
      setLeftWidth: s.setLeftWidth,
      setRightContext: s.setRightContext,
      toggleRightPanel: s.toggleRightPanel,
      setRightWidth: s.setRightWidth,
      setTimelineHeight: s.setTimelineHeight,
      // Snap
      toggleSnap: s.toggleSnap,
      setSnapSettings: s.setSnapSettings,
      // Volume
      setMasterVolume: s.setMasterVolume,
      // Persistence
      loadState: s.loadState,
      markDirty: s.markDirty,
      markClean: s.markClean,
      setSaving: s.setSaving,
      getSerializableState: s.getSerializableState,
      // History
      undo: s.undo,
      redo: s.redo,
    }))
  );
}
