// ============================================
// Xiaohuang Editor - Shared Types
// Re-exports from the new multi-track type system
// + backward-compatible legacy types
// ============================================

// Re-export everything from the new type system
export type {
  Track,
  TrackType,
  TrackItem,
  TrackItemType,
  TrackItemBase,
  VideoClipItem,
  VideoClipProperties,
  AudioClipItem,
  AudioClipProperties,
  TextOverlayItem,
  TextOverlayProperties,
  StickerItem,
  StickerProperties,
  EffectItem,
  EffectProperties,
  TransitionItem,
  TransitionProperties,
  FilterItem,
  FilterProperties,
  Keyframe,
  EasingType,
  Marker,
  MarkerType,
  SelectionState,
  ClipboardState,
  LeftPanelTab,
  RightPanelContext,
  PanelState,
  PlaybackState,
  SnapSettings,
  SerializedEditorState,
  EditorStoreState,
  EditorStoreActions,
  EditorStore,
  EditorProject,
  SourceVideoInfo,
  AIAnalysisData,
  LegacyClip,
  LegacyEditorStateData,
  TextAnimationType,
  EffectType,
  TransitionType,
} from "@/types/editor";

export {
  generateId,
  createDefaultTrack,
  createDefaultVideoClipProperties,
  createDefaultAudioClipProperties,
  createDefaultTextOverlayProperties,
  createDefaultStickerProperties,
  createDefaultEffectProperties,
  createDefaultTransitionProperties,
  createDefaultFilterProperties,
  createDefaultPanelState,
  createDefaultPlaybackState,
  createDefaultSelectionState,
  createDefaultClipboardState,
  createDefaultSnapSettings,
  DEFAULT_TRACK_HEIGHT,
  MIN_CLIP_MS,
  MAX_UNDO_HISTORY,
  MIN_ZOOM,
  MAX_ZOOM,
  DEFAULT_ZOOM,
} from "@/types/editor";

// ── Legacy types (backward compat) ──────────────────

/** @deprecated Use VideoClipItem instead */
export interface Clip {
  id: string;
  startMs: number;
  endMs: number;
  sourceStartMs: number;
  sourceEndMs: number;
}

/** Complete editor state stored in DB - legacy format */
export interface EditorStateData {
  clips: Clip[];
  markers: import("@/types/editor").Marker[];
  playheadMs: number;
  version: number;
  duration: number;
}

/** Actions for the legacy editor reducer */
export type EditorAction =
  | { type: "SET_PLAYHEAD"; timeMs: number }
  | { type: "SPLIT_CLIP"; clipId: string; atMs: number }
  | { type: "DELETE_CLIP"; clipId: string }
  | { type: "TRIM_CLIP"; clipId: string; newStartMs: number; newEndMs: number }
  | { type: "SELECT_CLIP"; clipId: string | null }
  | { type: "SET_CLIPS"; clips: Clip[] }
  | { type: "SET_MARKERS"; markers: import("@/types/editor").Marker[] }
  | { type: "UNDO" }
  | { type: "SET_ZOOM"; zoom: number }
  | { type: "LOAD_STATE"; state: EditorStateData };

/** Editor reducer state (legacy) */
export interface EditorReducerState extends EditorStateData {
  selectedClipId: string | null;
  zoom: number;
  history: EditorStateData[];
  isDirty: boolean;
}

/** Props for components that need to seek the video */
export interface SeekableProps {
  onSeek: (timeMs: number) => void;
}
