// ============================================
// Xiaohuang Editor - Zustand Store
// Multi-track editor state management
// Uses immer for immutable updates + zundo for undo/redo
// ============================================

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { temporal } from "zundo";
import type {
  EditorStore,
  EditorStoreState,
  SerializedEditorState,
  Track,
  TrackType,
  TrackItem,
  TrackItemType,
  TrackItemPropertiesMap,
  Marker,
  LeftPanelTab,
  RightPanelContext,
  SnapSettings,
  VideoClipItem,
} from "@/types/editor";
import {
  generateId,
  createDefaultTrack,
  createDefaultPanelState,
  createDefaultPlaybackState,
  createDefaultSelectionState,
  createDefaultClipboardState,
  createDefaultSnapSettings,
  MIN_CLIP_MS,
  MIN_ZOOM,
  MAX_ZOOM,
  DEFAULT_ZOOM,
  MAX_UNDO_HISTORY,
} from "@/types/editor";

// ── Initial State ───────────────────────────────────

const createInitialState = (): EditorStoreState => ({
  // Serialized state
  tracks: [],
  trackItems: [],
  markers: [],
  playheadMs: 0,
  version: 1,
  duration: 0,
  snapSettings: createDefaultSnapSettings(),

  // UI state
  selection: createDefaultSelectionState(),
  clipboard: createDefaultClipboardState(),
  panels: createDefaultPanelState(),
  playback: createDefaultPlaybackState(),
  zoom: DEFAULT_ZOOM,
  scrollLeft: 0,
  isDirty: false,
  isSaving: false,
});

// ── Store Creation ──────────────────────────────────

export const useEditorStore = create<EditorStore>()(
  temporal(
    immer((set, get) => ({
      ...createInitialState(),

      // ══════════════════════════════════════════════
      // Track Actions
      // ══════════════════════════════════════════════

      addTrack: (type: TrackType, name?: string) => {
        const id = generateId("track");
        set((state) => {
          const order = state.tracks.length;
          const track = createDefaultTrack(type, order, name);
          track.id = id;
          state.tracks.push(track);
          state.isDirty = true;
        });
        return id;
      },

      removeTrack: (trackId: string) => {
        set((state) => {
          state.tracks = state.tracks.filter((t) => t.id !== trackId);
          state.trackItems = state.trackItems.filter((i) => i.trackId !== trackId);
          // Reorder remaining tracks
          state.tracks.forEach((t, idx) => {
            t.order = idx;
          });
          // Clear selection if affected
          state.selection.itemIds = state.selection.itemIds.filter(
            (id) => state.trackItems.some((i) => i.id === id)
          );
          if (state.selection.trackId === trackId) {
            state.selection.trackId = null;
          }
          state.isDirty = true;
        });
      },

      updateTrack: (trackId: string, updates: Partial<Track>) => {
        set((state) => {
          const track = state.tracks.find((t) => t.id === trackId);
          if (track) {
            Object.assign(track, updates);
            state.isDirty = true;
          }
        });
      },

      reorderTrack: (trackId: string, newOrder: number) => {
        set((state) => {
          const trackIdx = state.tracks.findIndex((t) => t.id === trackId);
          if (trackIdx === -1) return;

          const [track] = state.tracks.splice(trackIdx, 1);
          state.tracks.splice(newOrder, 0, track);
          state.tracks.forEach((t, idx) => {
            t.order = idx;
          });
          state.isDirty = true;
        });
      },

      toggleTrackVisibility: (trackId: string) => {
        set((state) => {
          const track = state.tracks.find((t) => t.id === trackId);
          if (track) {
            track.visible = !track.visible;
            state.isDirty = true;
          }
        });
      },

      toggleTrackLock: (trackId: string) => {
        set((state) => {
          const track = state.tracks.find((t) => t.id === trackId);
          if (track) {
            track.locked = !track.locked;
            state.isDirty = true;
          }
        });
      },

      toggleTrackMute: (trackId: string) => {
        set((state) => {
          const track = state.tracks.find((t) => t.id === trackId);
          if (track) {
            track.muted = !track.muted;
            state.isDirty = true;
          }
        });
      },

      // ══════════════════════════════════════════════
      // Track Item Actions
      // ══════════════════════════════════════════════

      addTrackItem: (item: TrackItem) => {
        set((state) => {
          state.trackItems.push(item);
          state.isDirty = true;
        });
      },

      removeTrackItem: (itemId: string) => {
        set((state) => {
          state.trackItems = state.trackItems.filter((i) => i.id !== itemId);
          state.selection.itemIds = state.selection.itemIds.filter((id) => id !== itemId);
          state.isDirty = true;
        });
      },

      removeTrackItems: (itemIds: string[]) => {
        set((state) => {
          const idSet = new Set(itemIds);
          state.trackItems = state.trackItems.filter((i) => !idSet.has(i.id));
          state.selection.itemIds = state.selection.itemIds.filter((id) => !idSet.has(id));
          state.isDirty = true;
        });
      },

      updateTrackItem: <T extends TrackItem>(itemId: string, updates: Partial<T>) => {
        set((state) => {
          const item = state.trackItems.find((i) => i.id === itemId);
          if (item) {
            Object.assign(item, updates);
            state.isDirty = true;
          }
        });
      },

      updateTrackItemProperties: <T extends TrackItemType>(
        itemId: string,
        updates: Partial<TrackItemPropertiesMap[T]>
      ) => {
        set((state) => {
          const item = state.trackItems.find((i) => i.id === itemId);
          if (item && "properties" in item) {
            Object.assign(item.properties, updates);
            state.isDirty = true;
          }
        });
      },

      moveTrackItem: (itemId: string, newStartMs: number, newTrackId?: string) => {
        set((state) => {
          const item = state.trackItems.find((i) => i.id === itemId);
          if (!item) return;

          const duration = item.endMs - item.startMs;
          item.startMs = Math.max(0, newStartMs);
          item.endMs = item.startMs + duration;
          if (newTrackId) {
            item.trackId = newTrackId;
          }
          state.isDirty = true;
        });
      },

      trimTrackItemStart: (itemId: string, newStartMs: number) => {
        set((state) => {
          const item = state.trackItems.find((i) => i.id === itemId);
          if (!item) return;

          const minStart = Math.max(0, item.endMs - MIN_CLIP_MS);
          item.startMs = Math.max(0, Math.min(newStartMs, minStart));

          // Also trim source start for video/audio clips
          if (item.type === "video-clip" || item.type === "audio-clip") {
            const delta = newStartMs - item.startMs;
            (item as VideoClipItem).properties.sourceStartMs += delta;
          }
          state.isDirty = true;
        });
      },

      trimTrackItemEnd: (itemId: string, newEndMs: number) => {
        set((state) => {
          const item = state.trackItems.find((i) => i.id === itemId);
          if (!item) return;

          item.endMs = Math.max(item.startMs + MIN_CLIP_MS, newEndMs);

          // Also trim source end for video/audio clips
          if (item.type === "video-clip" || item.type === "audio-clip") {
            const props = (item as VideoClipItem).properties;
            const sourceDuration = item.endMs - item.startMs;
            props.sourceEndMs = props.sourceStartMs + sourceDuration;
          }
          state.isDirty = true;
        });
      },

      splitTrackItem: (itemId: string, atMs: number) => {
        set((state) => {
          const itemIdx = state.trackItems.findIndex((i) => i.id === itemId);
          if (itemIdx === -1) return;

          const item = state.trackItems[itemIdx];
          if (atMs <= item.startMs + MIN_CLIP_MS || atMs >= item.endMs - MIN_CLIP_MS) return;

          // Create the second half as a new item
          const newItem = structuredClone(item) as TrackItem;
          newItem.id = generateId(item.type);
          newItem.startMs = atMs;

          // Adjust source times for video/audio clips
          if (
            (item.type === "video-clip" || item.type === "audio-clip") &&
            (newItem.type === "video-clip" || newItem.type === "audio-clip")
          ) {
            const origProps = (item as VideoClipItem).properties;
            const splitOffset = atMs - item.startMs;
            const newProps = (newItem as VideoClipItem).properties;
            newProps.sourceStartMs = origProps.sourceStartMs + splitOffset;
          }

          // Trim the first half
          item.endMs = atMs;
          if (item.type === "video-clip" || item.type === "audio-clip") {
            const props = (item as VideoClipItem).properties;
            props.sourceEndMs = props.sourceStartMs + (atMs - item.startMs);
          }

          state.trackItems.push(newItem);
          state.isDirty = true;
        });
      },

      duplicateTrackItem: (itemId: string) => {
        set((state) => {
          const item = state.trackItems.find((i) => i.id === itemId);
          if (!item) return;

          const clone = structuredClone(item) as TrackItem;
          clone.id = generateId(item.type);
          // Place after the original
          clone.startMs = item.endMs;
          clone.endMs = clone.startMs + (item.endMs - item.startMs);

          state.trackItems.push(clone);
          state.selection.itemIds = [clone.id];
          state.isDirty = true;
        });
      },

      // ══════════════════════════════════════════════
      // Selection Actions
      // ══════════════════════════════════════════════

      selectItem: (itemId: string, addToSelection = false) => {
        set((state) => {
          if (addToSelection) {
            if (!state.selection.itemIds.includes(itemId)) {
              state.selection.itemIds.push(itemId);
            }
          } else {
            state.selection.itemIds = [itemId];
          }
          // Set right panel context based on selected item
          const item = state.trackItems.find((i) => i.id === itemId);
          if (item) {
            state.panels.rightContext = { type: item.type, itemId } as RightPanelContext;
            state.panels.rightVisible = true;
          }
        });
      },

      deselectItem: (itemId: string) => {
        set((state) => {
          state.selection.itemIds = state.selection.itemIds.filter((id) => id !== itemId);
          if (state.selection.itemIds.length === 0) {
            state.panels.rightContext = { type: "none" };
          }
        });
      },

      selectItems: (itemIds: string[]) => {
        set((state) => {
          state.selection.itemIds = itemIds;
          if (itemIds.length === 1) {
            const item = state.trackItems.find((i) => i.id === itemIds[0]);
            if (item) {
              state.panels.rightContext = { type: item.type, itemId: item.id } as RightPanelContext;
              state.panels.rightVisible = true;
            }
          }
        });
      },

      selectAll: () => {
        set((state) => {
          state.selection.itemIds = state.trackItems.map((i) => i.id);
        });
      },

      clearSelection: () => {
        set((state) => {
          state.selection.itemIds = [];
          state.selection.trackId = null;
          state.selection.markerIds = [];
          state.panels.rightContext = { type: "none" };
        });
      },

      selectTrack: (trackId: string | null) => {
        set((state) => {
          state.selection.trackId = trackId;
        });
      },

      // ══════════════════════════════════════════════
      // Clipboard Actions
      // ══════════════════════════════════════════════

      copySelection: () => {
        set((state) => {
          const items = state.trackItems.filter((i) =>
            state.selection.itemIds.includes(i.id)
          );
          state.clipboard = {
            items: structuredClone(items),
            operation: "copy",
            sourceTimeMs: state.playheadMs,
          };
        });
      },

      cutSelection: () => {
        set((state) => {
          const items = state.trackItems.filter((i) =>
            state.selection.itemIds.includes(i.id)
          );
          state.clipboard = {
            items: structuredClone(items),
            operation: "cut",
            sourceTimeMs: state.playheadMs,
          };
          // Remove cut items
          const idSet = new Set(state.selection.itemIds);
          state.trackItems = state.trackItems.filter((i) => !idSet.has(i.id));
          state.selection.itemIds = [];
          state.isDirty = true;
        });
      },

      paste: (atMs?: number) => {
        set((state) => {
          if (state.clipboard.items.length === 0) return;

          const pasteTime = atMs ?? state.playheadMs;
          const timeOffset = pasteTime - state.clipboard.sourceTimeMs;

          const newIds: string[] = [];
          for (const item of state.clipboard.items) {
            const clone = structuredClone(item) as TrackItem;
            clone.id = generateId(item.type);
            clone.startMs += timeOffset;
            clone.endMs += timeOffset;
            state.trackItems.push(clone);
            newIds.push(clone.id);
          }

          state.selection.itemIds = newIds;
          state.isDirty = true;

          // Clear cut operation after paste
          if (state.clipboard.operation === "cut") {
            state.clipboard = createDefaultClipboardState();
          }
        });
      },

      duplicateSelection: () => {
        set((state) => {
          const items = state.trackItems.filter((i) =>
            state.selection.itemIds.includes(i.id)
          );
          if (items.length === 0) return;

          const newIds: string[] = [];
          for (const item of items) {
            const clone = structuredClone(item) as TrackItem;
            clone.id = generateId(item.type);
            const duration = clone.endMs - clone.startMs;
            clone.startMs = item.endMs;
            clone.endMs = clone.startMs + duration;
            state.trackItems.push(clone);
            newIds.push(clone.id);
          }

          state.selection.itemIds = newIds;
          state.isDirty = true;
        });
      },

      // ══════════════════════════════════════════════
      // Playback Actions
      // ══════════════════════════════════════════════

      setPlayhead: (timeMs: number) => {
        set((state) => {
          state.playheadMs = Math.max(0, Math.min(timeMs, state.duration));
        });
      },

      togglePlayback: () => {
        set((state) => {
          state.playback.isPlaying = !state.playback.isPlaying;
        });
      },

      setPlaybackRate: (rate: number) => {
        set((state) => {
          state.playback.playbackRate = Math.max(0.25, Math.min(4, rate));
        });
      },

      toggleLooping: () => {
        set((state) => {
          state.playback.isLooping = !state.playback.isLooping;
        });
      },

      setLoopRange: (range) => {
        set((state) => {
          state.playback.loopRange = range;
        });
      },

      setMasterVolume: (volume: number) => {
        set((state) => {
          state.playback.masterVolume = Math.max(0, Math.min(100, volume));
        });
      },

      seekForward: (ms: number) => {
        set((state) => {
          state.playheadMs = Math.min(state.playheadMs + ms, state.duration);
        });
      },

      seekBackward: (ms: number) => {
        set((state) => {
          state.playheadMs = Math.max(state.playheadMs - ms, 0);
        });
      },

      seekToStart: () => {
        set((state) => {
          state.playheadMs = 0;
        });
      },

      seekToEnd: () => {
        set((state) => {
          state.playheadMs = state.duration;
        });
      },

      seekToNextItem: () => {
        set((state) => {
          const currentTime = state.playheadMs;
          const edges = state.trackItems
            .flatMap((i) => [i.startMs, i.endMs])
            .filter((t) => t > currentTime + 1)
            .sort((a, b) => a - b);
          if (edges.length > 0) {
            state.playheadMs = edges[0];
          }
        });
      },

      seekToPrevItem: () => {
        set((state) => {
          const currentTime = state.playheadMs;
          const edges = state.trackItems
            .flatMap((i) => [i.startMs, i.endMs])
            .filter((t) => t < currentTime - 1)
            .sort((a, b) => b - a);
          if (edges.length > 0) {
            state.playheadMs = edges[0];
          }
        });
      },

      // ══════════════════════════════════════════════
      // Marker Actions
      // ══════════════════════════════════════════════

      addMarker: (marker: Marker) => {
        set((state) => {
          state.markers.push(marker);
          state.isDirty = true;
        });
      },

      removeMarker: (markerId: string) => {
        set((state) => {
          state.markers = state.markers.filter((m) => m.id !== markerId);
          state.selection.markerIds = state.selection.markerIds.filter(
            (id) => id !== markerId
          );
          state.isDirty = true;
        });
      },

      updateMarker: (markerId: string, updates: Partial<Marker>) => {
        set((state) => {
          const marker = state.markers.find((m) => m.id === markerId);
          if (marker) {
            Object.assign(marker, updates);
            state.isDirty = true;
          }
        });
      },

      setMarkers: (markers: Marker[]) => {
        set((state) => {
          state.markers = markers;
          state.isDirty = true;
        });
      },

      // ══════════════════════════════════════════════
      // Zoom / Scroll
      // ══════════════════════════════════════════════

      setZoom: (zoom: number) => {
        set((state) => {
          state.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
        });
      },

      zoomIn: () => {
        set((state) => {
          state.zoom = Math.min(state.zoom * 1.3, MAX_ZOOM);
        });
      },

      zoomOut: () => {
        set((state) => {
          state.zoom = Math.max(state.zoom / 1.3, MIN_ZOOM);
        });
      },

      zoomToFit: () => {
        set((state) => {
          // This will be calculated based on container width at the component level
          // For now, reset to default
          state.zoom = DEFAULT_ZOOM;
        });
      },

      setScrollLeft: (px: number) => {
        set((state) => {
          state.scrollLeft = Math.max(0, px);
        });
      },

      // ══════════════════════════════════════════════
      // Panel Actions
      // ══════════════════════════════════════════════

      setLeftTab: (tab: LeftPanelTab) => {
        set((state) => {
          state.panels.leftTab = tab;
          state.panels.leftVisible = true;
        });
      },

      toggleLeftPanel: () => {
        set((state) => {
          state.panels.leftVisible = !state.panels.leftVisible;
        });
      },

      setLeftWidth: (width: number) => {
        set((state) => {
          state.panels.leftWidth = Math.max(200, Math.min(500, width));
        });
      },

      setRightContext: (ctx: RightPanelContext) => {
        set((state) => {
          state.panels.rightContext = ctx;
          if (ctx.type !== "none") {
            state.panels.rightVisible = true;
          }
        });
      },

      toggleRightPanel: () => {
        set((state) => {
          state.panels.rightVisible = !state.panels.rightVisible;
        });
      },

      setRightWidth: (width: number) => {
        set((state) => {
          state.panels.rightWidth = Math.max(200, Math.min(500, width));
        });
      },

      setTimelineHeight: (height: number) => {
        set((state) => {
          state.panels.timelineHeight = Math.max(150, Math.min(600, height));
        });
      },

      // ══════════════════════════════════════════════
      // Snap Actions
      // ══════════════════════════════════════════════

      setSnapSettings: (settings: Partial<SnapSettings>) => {
        set((state) => {
          Object.assign(state.snapSettings, settings);
        });
      },

      toggleSnap: () => {
        set((state) => {
          state.snapSettings.enabled = !state.snapSettings.enabled;
        });
      },

      // ══════════════════════════════════════════════
      // Persistence Actions
      // ══════════════════════════════════════════════

      loadState: (state: SerializedEditorState) => {
        set((draft) => {
          draft.tracks = state.tracks;
          draft.trackItems = state.trackItems;
          draft.markers = state.markers;
          draft.playheadMs = state.playheadMs;
          draft.version = state.version;
          draft.duration = state.duration;
          draft.snapSettings = state.snapSettings || createDefaultSnapSettings();
          draft.isDirty = false;
          // Reset UI state
          draft.selection = createDefaultSelectionState();
          draft.clipboard = createDefaultClipboardState();
          draft.playback = createDefaultPlaybackState();
        });
      },

      markDirty: () => {
        set((state) => {
          state.isDirty = true;
        });
      },

      markClean: () => {
        set((state) => {
          state.isDirty = false;
        });
      },

      setSaving: (saving: boolean) => {
        set((state) => {
          state.isSaving = saving;
        });
      },

      getSerializableState: (): SerializedEditorState => {
        const state = get();
        return {
          tracks: state.tracks,
          trackItems: state.trackItems,
          markers: state.markers,
          playheadMs: state.playheadMs,
          version: state.version,
          duration: state.duration,
          snapSettings: state.snapSettings,
        };
      },

      // ══════════════════════════════════════════════
      // History / Undo (delegated to zundo temporal)
      // ══════════════════════════════════════════════

      undo: () => {
        useEditorStore.temporal.getState().undo();
      },

      redo: () => {
        useEditorStore.temporal.getState().redo();
      },
    })),
    {
      // zundo options
      limit: MAX_UNDO_HISTORY,
      // Only track serializable state changes (not UI-only state)
      partialize: (state) => ({
        tracks: state.tracks,
        trackItems: state.trackItems,
        markers: state.markers,
        playheadMs: state.playheadMs,
        duration: state.duration,
      }),
      // Equality check to avoid duplicate history entries
      equality: (pastState, currentState) =>
        pastState.tracks === currentState.tracks &&
        pastState.trackItems === currentState.trackItems &&
        pastState.markers === currentState.markers &&
        pastState.playheadMs === currentState.playheadMs &&
        pastState.duration === currentState.duration,
    }
  )
);

// ── Selector Helpers ────────────────────────────────

/** Get items for a specific track */
export const selectTrackItems = (state: EditorStoreState, trackId: string) =>
  state.trackItems.filter((i) => i.trackId === trackId);

/** Get the currently selected items */
export const selectSelectedItems = (state: EditorStoreState) =>
  state.trackItems.filter((i) => state.selection.itemIds.includes(i.id));

/** Get a single selected item (when exactly one is selected) */
export const selectSingleSelectedItem = (state: EditorStoreState) => {
  if (state.selection.itemIds.length !== 1) return null;
  return state.trackItems.find((i) => i.id === state.selection.itemIds[0]) ?? null;
};

/** Get track by ID */
export const selectTrackById = (state: EditorStoreState, trackId: string) =>
  state.tracks.find((t) => t.id === trackId);

/** Get tracks sorted by order */
export const selectSortedTracks = (state: EditorStoreState) =>
  [...state.tracks].sort((a, b) => a.order - b.order);

/** Check if we can undo */
export const selectCanUndo = () =>
  useEditorStore.temporal.getState().pastStates.length > 0;

/** Check if we can redo */
export const selectCanRedo = () =>
  useEditorStore.temporal.getState().futureStates.length > 0;

/** Get the total output duration (max endMs of all items) */
export const selectOutputDuration = (state: EditorStoreState) => {
  if (state.trackItems.length === 0) return state.duration;
  return Math.max(
    state.duration,
    ...state.trackItems.map((i) => i.endMs)
  );
};
