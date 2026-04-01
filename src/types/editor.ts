// ============================================
// Xiaohuang Editor - Multi-Track Type System
// Phase 0: Foundation types for CapCut-like editor
// ============================================

// ── Track Types ─────────────────────────────────────

/** All supported track types */
export type TrackType =
  | "video"      // Main video clips
  | "audio"      // Audio clips / music / voiceover
  | "text"       // Text overlays / subtitles / captions
  | "sticker"    // Stickers / emojis / GIFs
  | "effect"     // Visual effects layer
  | "filter";    // Color filters / LUT layer

/** A track is a horizontal lane in the timeline */
export interface Track {
  id: string;
  type: TrackType;
  /** Display name shown in track label */
  name: string;
  /** Order from top to bottom (0 = topmost) */
  order: number;
  /** Whether the track is visible in preview */
  visible: boolean;
  /** Whether the track is locked from editing */
  locked: boolean;
  /** Whether the track is muted (audio tracks) */
  muted: boolean;
  /** Track height in pixels (for timeline rendering) */
  height: number;
}

// ── Track Item Types ────────────────────────────────

/** All supported track item types */
export type TrackItemType =
  | "video-clip"
  | "audio-clip"
  | "text-overlay"
  | "sticker"
  | "effect"
  | "transition"
  | "filter";

/** Base properties shared by all track items */
export interface TrackItemBase {
  id: string;
  trackId: string;
  type: TrackItemType;
  /** Start time on the OUTPUT timeline (ms) */
  startMs: number;
  /** End time on the OUTPUT timeline (ms) */
  endMs: number;
  /** Display name */
  name: string;
  /** Whether this item is locked */
  locked: boolean;
  /** Opacity 0-100 */
  opacity: number;
}

// ── Video Clip ──────────────────────────────────────

export interface VideoClipProperties {
  /** Start time in SOURCE video (ms) */
  sourceStartMs: number;
  /** End time in SOURCE video (ms) */
  sourceEndMs: number;
  /** Source media asset storage key */
  sourceAssetKey: string;
  /** Playback speed multiplier (1.0 = normal) */
  speed: number;
  /** Volume level 0-100 (for video's built-in audio) */
  volume: number;
  /** Whether the video's audio is muted */
  audioMuted: boolean;
  /** Transform: scale factor */
  scale: number;
  /** Transform: X position offset */
  posX: number;
  /** Transform: Y position offset */
  posY: number;
  /** Transform: rotation in degrees */
  rotation: number;
  /** Crop values (0-1 relative to source) */
  cropLeft: number;
  cropRight: number;
  cropTop: number;
  cropBottom: number;
  /** Flip states */
  flipH: boolean;
  flipV: boolean;
  /** Color adjustments */
  brightness: number;    // -100 to 100
  contrast: number;      // -100 to 100
  saturation: number;    // -100 to 100
  /** Applied filter preset ID (if any) */
  filterId: string | null;
  /** Keyframes for animated properties */
  keyframes: Keyframe[];
}

export interface VideoClipItem extends TrackItemBase {
  type: "video-clip";
  properties: VideoClipProperties;
}

// ── Audio Clip ──────────────────────────────────────

export interface AudioClipProperties {
  /** Start time in SOURCE audio (ms) */
  sourceStartMs: number;
  /** End time in SOURCE audio (ms) */
  sourceEndMs: number;
  /** Source media asset storage key */
  sourceAssetKey: string;
  /** Volume level 0-100 */
  volume: number;
  /** Playback speed multiplier */
  speed: number;
  /** Fade in duration (ms) */
  fadeInMs: number;
  /** Fade out duration (ms) */
  fadeOutMs: number;
  /** Audio keyframes for volume automation */
  keyframes: Keyframe[];
}

export interface AudioClipItem extends TrackItemBase {
  type: "audio-clip";
  properties: AudioClipProperties;
}

// ── Text Overlay ────────────────────────────────────

export type TextAnimationType =
  | "none"
  | "fade-in"
  | "fade-out"
  | "typewriter"
  | "slide-up"
  | "slide-down"
  | "slide-left"
  | "slide-right"
  | "bounce"
  | "scale-up"
  | "scale-down"
  | "blur-in"
  | "glow";

export interface TextOverlayProperties {
  /** The text content */
  content: string;
  /** Font family name */
  fontFamily: string;
  /** Font size in px */
  fontSize: number;
  /** Font weight */
  fontWeight: number;
  /** Font color (hex) */
  color: string;
  /** Background color (hex with alpha) */
  backgroundColor: string;
  /** Text alignment */
  textAlign: "left" | "center" | "right";
  /** Text stroke color */
  strokeColor: string;
  /** Text stroke width */
  strokeWidth: number;
  /** Text shadow */
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  /** Position */
  posX: number;
  posY: number;
  /** Size */
  width: number;
  height: number;
  /** Rotation */
  rotation: number;
  /** Letter spacing */
  letterSpacing: number;
  /** Line height */
  lineHeight: number;
  /** Bold / italic / underline */
  bold: boolean;
  italic: boolean;
  underline: boolean;
  /** Animation */
  animationIn: TextAnimationType;
  animationOut: TextAnimationType;
  animationInDurationMs: number;
  animationOutDurationMs: number;
  /** Keyframes for animated properties */
  keyframes: Keyframe[];
}

export interface TextOverlayItem extends TrackItemBase {
  type: "text-overlay";
  properties: TextOverlayProperties;
}

// ── Sticker ─────────────────────────────────────────

export interface StickerProperties {
  /** Sticker asset key or built-in ID */
  stickerId: string;
  /** Source type: built-in or custom upload */
  source: "builtin" | "custom";
  /** Position */
  posX: number;
  posY: number;
  /** Size */
  width: number;
  height: number;
  /** Scale */
  scale: number;
  /** Rotation */
  rotation: number;
  /** Flip states */
  flipH: boolean;
  flipV: boolean;
  /** Animation */
  animationIn: TextAnimationType;
  animationOut: TextAnimationType;
  animationInDurationMs: number;
  animationOutDurationMs: number;
  /** Keyframes */
  keyframes: Keyframe[];
}

export interface StickerItem extends TrackItemBase {
  type: "sticker";
  properties: StickerProperties;
}

// ── Effect ──────────────────────────────────────────

export type EffectType =
  | "blur"
  | "sharpen"
  | "vignette"
  | "noise"
  | "glitch"
  | "chromatic-aberration"
  | "zoom-in"
  | "zoom-out"
  | "shake"
  | "flash"
  | "custom";

export interface EffectProperties {
  /** Effect type identifier */
  effectType: EffectType;
  /** Effect intensity 0-100 */
  intensity: number;
  /** Effect-specific parameters */
  params: Record<string, number | string | boolean>;
  /** Keyframes for animated effect params */
  keyframes: Keyframe[];
}

export interface EffectItem extends TrackItemBase {
  type: "effect";
  properties: EffectProperties;
}

// ── Transition ──────────────────────────────────────

export type TransitionType =
  | "none"
  | "crossfade"
  | "dissolve"
  | "fade-black"
  | "fade-white"
  | "slide-left"
  | "slide-right"
  | "slide-up"
  | "slide-down"
  | "zoom"
  | "wipe-left"
  | "wipe-right"
  | "wipe-up"
  | "wipe-down"
  | "spin"
  | "blur";

export interface TransitionProperties {
  /** Transition type */
  transitionType: TransitionType;
  /** Duration in ms */
  durationMs: number;
  /** Easing function */
  easing: "linear" | "ease-in" | "ease-out" | "ease-in-out";
}

export interface TransitionItem extends TrackItemBase {
  type: "transition";
  properties: TransitionProperties;
}

// ── Filter ──────────────────────────────────────────

export interface FilterProperties {
  /** Filter preset ID */
  filterId: string;
  /** Filter intensity 0-100 */
  intensity: number;
  /** Color adjustments */
  brightness: number;
  contrast: number;
  saturation: number;
  temperature: number;
  tint: number;
  highlights: number;
  shadows: number;
  /** Keyframes */
  keyframes: Keyframe[];
}

export interface FilterItem extends TrackItemBase {
  type: "filter";
  properties: FilterProperties;
}

// ── Union Types ─────────────────────────────────────

/** Union of all track item types */
export type TrackItem =
  | VideoClipItem
  | AudioClipItem
  | TextOverlayItem
  | StickerItem
  | EffectItem
  | TransitionItem
  | FilterItem;

/** Map from item type to its properties */
export type TrackItemPropertiesMap = {
  "video-clip": VideoClipProperties;
  "audio-clip": AudioClipProperties;
  "text-overlay": TextOverlayProperties;
  "sticker": StickerProperties;
  "effect": EffectProperties;
  "transition": TransitionProperties;
  "filter": FilterProperties;
};

// ── Keyframes ───────────────────────────────────────

export type EasingType =
  | "linear"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | "bezier";

/** A keyframe for animating a property over time */
export interface Keyframe {
  id: string;
  /** Time offset from the item's startMs (ms) */
  timeOffsetMs: number;
  /** Property name being animated */
  property: string;
  /** Value at this keyframe */
  value: number;
  /** Easing to the next keyframe */
  easing: EasingType;
  /** Custom bezier control points (if easing = "bezier") */
  bezierPoints?: [number, number, number, number];
}

// ── Markers ─────────────────────────────────────────

/** Marker types for different annotations */
export type MarkerType =
  | "hook"
  | "highlight"
  | "cut"
  | "silence"
  | "transition"
  | "user"
  | "chapter"
  | "beat";

/** A marker represents a point of interest on the timeline */
export interface Marker {
  id: string;
  /** Time position in milliseconds (source video time) */
  timeMs: number;
  /** Display label */
  label: string;
  /** Marker type for color coding */
  type: MarkerType;
  /** Optional color override */
  color?: string;
}

// ── Selection ───────────────────────────────────────

export interface SelectionState {
  /** Selected track item IDs (multi-select) */
  itemIds: string[];
  /** Selected track ID (single) */
  trackId: string | null;
  /** Selected marker IDs */
  markerIds: string[];
}

// ── Clipboard ───────────────────────────────────────

export interface ClipboardState {
  /** Copied items (deep clones) */
  items: TrackItem[];
  /** Operation type */
  operation: "copy" | "cut" | null;
  /** Source time offset for paste alignment */
  sourceTimeMs: number;
}

// ── Panel State ─────────────────────────────────────

/** Left panel tabs */
export type LeftPanelTab =
  | "media"
  | "audio"
  | "text"
  | "stickers"
  | "effects"
  | "transitions"
  | "filters"
  | "ai-analysis";

/** Right panel (properties) context */
export type RightPanelContext =
  | { type: "none" }
  | { type: "video-clip"; itemId: string }
  | { type: "audio-clip"; itemId: string }
  | { type: "text-overlay"; itemId: string }
  | { type: "sticker"; itemId: string }
  | { type: "effect"; itemId: string }
  | { type: "transition"; itemId: string }
  | { type: "filter"; itemId: string }
  | { type: "project-settings" };

export interface PanelState {
  /** Active left panel tab */
  leftTab: LeftPanelTab;
  /** Whether left panel is visible */
  leftVisible: boolean;
  /** Left panel width */
  leftWidth: number;
  /** Right panel context */
  rightContext: RightPanelContext;
  /** Whether right panel is visible */
  rightVisible: boolean;
  /** Right panel width */
  rightWidth: number;
  /** Timeline area height */
  timelineHeight: number;
}

// ── Playback State ──────────────────────────────────

export interface PlaybackState {
  /** Whether video is playing */
  isPlaying: boolean;
  /** Playback speed multiplier */
  playbackRate: number;
  /** Whether looping is enabled */
  isLooping: boolean;
  /** Loop range (if set) */
  loopRange: { startMs: number; endMs: number } | null;
  /** Volume (master output) */
  masterVolume: number;
}

// ── Snap / Grid ─────────────────────────────────────

export interface SnapSettings {
  /** Whether snapping is enabled */
  enabled: boolean;
  /** Snap to playhead */
  snapToPlayhead: boolean;
  /** Snap to other items */
  snapToItems: boolean;
  /** Snap to markers */
  snapToMarkers: boolean;
  /** Snap threshold in pixels */
  thresholdPx: number;
}

// ── History Entry ───────────────────────────────────

export interface HistoryEntry {
  /** Timestamp of the change */
  timestamp: number;
  /** Description of the change for undo/redo UI */
  description: string;
}

// ── Editor State ────────────────────────────────────

/** The complete serializable editor state (persisted to DB) */
export interface SerializedEditorState {
  /** All tracks in the project */
  tracks: Track[];
  /** All track items */
  trackItems: TrackItem[];
  /** All markers */
  markers: Marker[];
  /** Playhead position (output timeline ms) */
  playheadMs: number;
  /** State version for conflict detection */
  version: number;
  /** Source video duration (ms) */
  duration: number;
  /** Snap settings */
  snapSettings: SnapSettings;
}

/** Full editor store state (includes transient UI state) */
export interface EditorStoreState extends SerializedEditorState {
  // ── UI State (not persisted) ──
  /** Current selection */
  selection: SelectionState;
  /** Clipboard */
  clipboard: ClipboardState;
  /** Panel configuration */
  panels: PanelState;
  /** Playback state */
  playback: PlaybackState;
  /** Zoom level (pixels per second) */
  zoom: number;
  /** Timeline scroll position */
  scrollLeft: number;
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Whether the store is currently saving */
  isSaving: boolean;
}

// ── Editor Store Actions ────────────────────────────

export interface EditorStoreActions {
  // ── Track Actions ──
  addTrack: (type: TrackType, name?: string) => string;
  removeTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<Track>) => void;
  reorderTrack: (trackId: string, newOrder: number) => void;
  toggleTrackVisibility: (trackId: string) => void;
  toggleTrackLock: (trackId: string) => void;
  toggleTrackMute: (trackId: string) => void;

  // ── Track Item Actions ──
  addTrackItem: (item: TrackItem) => void;
  removeTrackItem: (itemId: string) => void;
  removeTrackItems: (itemIds: string[]) => void;
  updateTrackItem: <T extends TrackItem>(itemId: string, updates: Partial<T>) => void;
  updateTrackItemProperties: <T extends TrackItemType>(
    itemId: string,
    updates: Partial<TrackItemPropertiesMap[T]>
  ) => void;
  moveTrackItem: (itemId: string, newStartMs: number, newTrackId?: string) => void;
  trimTrackItemStart: (itemId: string, newStartMs: number) => void;
  trimTrackItemEnd: (itemId: string, newEndMs: number) => void;
  splitTrackItem: (itemId: string, atMs: number) => void;
  duplicateTrackItem: (itemId: string) => void;

  // ── Selection Actions ──
  selectItem: (itemId: string, addToSelection?: boolean) => void;
  deselectItem: (itemId: string) => void;
  selectItems: (itemIds: string[]) => void;
  selectAll: () => void;
  clearSelection: () => void;
  selectTrack: (trackId: string | null) => void;

  // ── Clipboard Actions ──
  copySelection: () => void;
  cutSelection: () => void;
  paste: (atMs?: number) => void;
  duplicateSelection: () => void;

  // ── Playback Actions ──
  setPlayhead: (timeMs: number) => void;
  togglePlayback: () => void;
  setPlaybackRate: (rate: number) => void;
  toggleLooping: () => void;
  setLoopRange: (range: { startMs: number; endMs: number } | null) => void;
  setMasterVolume: (volume: number) => void;
  seekForward: (ms: number) => void;
  seekBackward: (ms: number) => void;
  seekToStart: () => void;
  seekToEnd: () => void;
  seekToNextItem: () => void;
  seekToPrevItem: () => void;

  // ── Marker Actions ──
  addMarker: (marker: Marker) => void;
  removeMarker: (markerId: string) => void;
  updateMarker: (markerId: string, updates: Partial<Marker>) => void;
  setMarkers: (markers: Marker[]) => void;

  // ── Zoom / Scroll ──
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  setScrollLeft: (px: number) => void;

  // ── Panel Actions ──
  setLeftTab: (tab: LeftPanelTab) => void;
  toggleLeftPanel: () => void;
  setLeftWidth: (width: number) => void;
  setRightContext: (ctx: RightPanelContext) => void;
  toggleRightPanel: () => void;
  setRightWidth: (width: number) => void;
  setTimelineHeight: (height: number) => void;

  // ── Snap Actions ──
  setSnapSettings: (settings: Partial<SnapSettings>) => void;
  toggleSnap: () => void;

  // ── Persistence Actions ──
  loadState: (state: SerializedEditorState) => void;
  markDirty: () => void;
  markClean: () => void;
  setSaving: (saving: boolean) => void;
  getSerializableState: () => SerializedEditorState;

  // ── History / Undo ──
  undo: () => void;
  redo: () => void;
}

/** Complete store type */
export type EditorStore = EditorStoreState & EditorStoreActions;

// ── Backward Compatibility ──────────────────────────

/** Legacy clip type (for migration from old format) */
export interface LegacyClip {
  id: string;
  startMs: number;
  endMs: number;
  sourceStartMs: number;
  sourceEndMs: number;
}

/** Legacy editor state (old format from DB) */
export interface LegacyEditorStateData {
  clips: LegacyClip[];
  markers: Marker[];
  playheadMs: number;
  version: number;
  duration: number;
}

// ── Project / Source Info ────────────────────────────

/** Project info needed by the editor */
export interface EditorProject {
  id: string;
  name: string;
  status: string;
}

/** Source video info */
export interface SourceVideoInfo {
  storageKey: string;
  durationMs: number;
  width: number;
  height: number;
  mediaUrl: string;
}

/** AI Analysis data from the analysis pipeline */
export interface AIAnalysisData {
  detectedLanguage: string;
  languageName: string;
  confidence: number;
  summary: string;
  transcriptHighlights: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  segments: Array<{
    start: number;
    end: number;
    label: string;
    reason: string;
  }>;
  editSuggestions: Array<{
    type: string;
    start: number;
    end: number;
    reason: string;
  }>;
  editorMarkers: Array<{
    time: number;
    label: string;
    type?: string;
  }>;
}

// ── Default Factories ───────────────────────────────

export const DEFAULT_TRACK_HEIGHT = 56;
export const MIN_CLIP_MS = 100;
export const MAX_UNDO_HISTORY = 50;
export const MIN_ZOOM = 5;
export const MAX_ZOOM = 500;
export const DEFAULT_ZOOM = 100;

export function createDefaultTrack(type: TrackType, order: number, name?: string): Track {
  return {
    id: `track_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    type,
    name: name ?? `${type.charAt(0).toUpperCase() + type.slice(1)} ${order + 1}`,
    order,
    visible: true,
    locked: false,
    muted: false,
    height: DEFAULT_TRACK_HEIGHT,
  };
}

export function createDefaultVideoClipProperties(
  sourceAssetKey: string,
  sourceStartMs: number,
  sourceEndMs: number
): VideoClipProperties {
  return {
    sourceStartMs,
    sourceEndMs,
    sourceAssetKey,
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
  };
}

export function createDefaultAudioClipProperties(
  sourceAssetKey: string,
  sourceStartMs: number,
  sourceEndMs: number
): AudioClipProperties {
  return {
    sourceStartMs,
    sourceEndMs,
    sourceAssetKey,
    volume: 100,
    speed: 1,
    fadeInMs: 0,
    fadeOutMs: 0,
    keyframes: [],
  };
}

export function createDefaultTextOverlayProperties(): TextOverlayProperties {
  return {
    content: "Text",
    fontFamily: "Inter",
    fontSize: 48,
    fontWeight: 600,
    color: "#ffffff",
    backgroundColor: "transparent",
    textAlign: "center",
    strokeColor: "#000000",
    strokeWidth: 0,
    shadowColor: "rgba(0,0,0,0.5)",
    shadowBlur: 4,
    shadowOffsetX: 2,
    shadowOffsetY: 2,
    posX: 50,
    posY: 50,
    width: 80,
    height: 20,
    rotation: 0,
    letterSpacing: 0,
    lineHeight: 1.2,
    bold: false,
    italic: false,
    underline: false,
    animationIn: "fade-in",
    animationOut: "fade-out",
    animationInDurationMs: 300,
    animationOutDurationMs: 300,
    keyframes: [],
  };
}

export function createDefaultStickerProperties(stickerId: string): StickerProperties {
  return {
    stickerId,
    source: "builtin",
    posX: 50,
    posY: 50,
    width: 20,
    height: 20,
    scale: 1,
    rotation: 0,
    flipH: false,
    flipV: false,
    animationIn: "scale-up",
    animationOut: "fade-out",
    animationInDurationMs: 300,
    animationOutDurationMs: 200,
    keyframes: [],
  };
}

export function createDefaultEffectProperties(effectType: EffectType): EffectProperties {
  return {
    effectType,
    intensity: 50,
    params: {},
    keyframes: [],
  };
}

export function createDefaultTransitionProperties(
  transitionType: TransitionType = "crossfade",
  durationMs: number = 500
): TransitionProperties {
  return {
    transitionType,
    durationMs,
    easing: "ease-in-out",
  };
}

export function createDefaultFilterProperties(filterId: string): FilterProperties {
  return {
    filterId,
    intensity: 100,
    brightness: 0,
    contrast: 0,
    saturation: 0,
    temperature: 0,
    tint: 0,
    highlights: 0,
    shadows: 0,
    keyframes: [],
  };
}

export function createDefaultPanelState(): PanelState {
  return {
    leftTab: "media",
    leftVisible: true,
    leftWidth: 300,
    rightContext: { type: "none" },
    rightVisible: true,
    rightWidth: 300,
    timelineHeight: 250,
  };
}

export function createDefaultPlaybackState(): PlaybackState {
  return {
    isPlaying: false,
    playbackRate: 1,
    isLooping: false,
    loopRange: null,
    masterVolume: 100,
  };
}

export function createDefaultSelectionState(): SelectionState {
  return {
    itemIds: [],
    trackId: null,
    markerIds: [],
  };
}

export function createDefaultClipboardState(): ClipboardState {
  return {
    items: [],
    operation: null,
    sourceTimeMs: 0,
  };
}

export function createDefaultSnapSettings(): SnapSettings {
  return {
    enabled: true,
    snapToPlayhead: true,
    snapToItems: true,
    snapToMarkers: true,
    thresholdPx: 8,
  };
}

/** Generate a unique ID */
export function generateId(prefix: string = "item"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
