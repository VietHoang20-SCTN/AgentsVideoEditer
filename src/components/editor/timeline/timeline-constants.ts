// ============================================
// Timeline Constants & Helpers
// Shared across all timeline components
// ============================================

/** Color mapping for track types */
export const TRACK_TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  "video-clip": { bg: "bg-blue-600/70", border: "border-blue-500/50", text: "text-blue-200" },
  "audio-clip": { bg: "bg-green-600/70", border: "border-green-500/50", text: "text-green-200" },
  "text-overlay": { bg: "bg-purple-600/70", border: "border-purple-500/50", text: "text-purple-200" },
  "sticker": { bg: "bg-yellow-600/70", border: "border-yellow-500/50", text: "text-yellow-200" },
  "effect": { bg: "bg-pink-600/70", border: "border-pink-500/50", text: "text-pink-200" },
  "transition": { bg: "bg-orange-600/70", border: "border-orange-500/50", text: "text-orange-200" },
  "filter": { bg: "bg-cyan-600/70", border: "border-cyan-500/50", text: "text-cyan-200" },
};

/** Track type icon labels */
export const TRACK_TYPE_ICONS: Record<string, string> = {
  video: "V",
  audio: "A",
  text: "T",
  sticker: "S",
  effect: "E",
  filter: "F",
};

/** Minimum track header width in pixels */
export const TRACK_HEADER_WIDTH = 140;

/** Minimum item width in pixels for rendering name */
export const MIN_ITEM_LABEL_WIDTH = 40;

/** Timeline ruler heights */
export const RULER_HEIGHT = 28;

/** Convert ms to pixel position based on zoom (px per second) */
export function msToPixel(ms: number, zoom: number): number {
  return (ms / 1000) * zoom;
}

/** Convert pixel position to ms based on zoom */
export function pixelToMs(px: number, zoom: number): number {
  return (px / zoom) * 1000;
}

/** Format ms for ruler labels */
export function formatRulerTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min > 0) {
    return `${min}:${sec.toString().padStart(2, "0")}`;
  }
  return `${sec}s`;
}

/** Get nice ruler interval based on zoom level */
export function getRulerInterval(zoom: number): { majorMs: number; minorMs: number } {
  // zoom = pixels per second
  if (zoom >= 200) return { majorMs: 1000, minorMs: 250 };
  if (zoom >= 100) return { majorMs: 2000, minorMs: 500 };
  if (zoom >= 50) return { majorMs: 5000, minorMs: 1000 };
  if (zoom >= 25) return { majorMs: 10000, minorMs: 2000 };
  if (zoom >= 10) return { majorMs: 30000, minorMs: 5000 };
  return { majorMs: 60000, minorMs: 10000 };
}
