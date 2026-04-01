import type { Clip } from "@/components/editor/types";

/** Generate a unique clip ID */
export function generateClipId(): string {
  return `clip_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Format milliseconds to mm:ss.d display format */
export function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const tenths = Math.floor((totalSeconds % 1) * 10);
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${tenths}`;
}

/** Format milliseconds to mm:ss (no decimal) */
export function formatTimeShort(ms: number): string {
  const totalSeconds = Math.max(0, ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/** Convert ms to percentage of total duration */
export function msToPercent(ms: number, duration: number): number {
  if (duration <= 0) return 0;
  return Math.min(100, Math.max(0, (ms / duration) * 100));
}

/** Convert percentage to ms */
export function percentToMs(percent: number, duration: number): number {
  return Math.max(0, (percent / 100) * duration);
}

/** Split a clip at a given source time position */
export function splitClip(clip: Clip, atSourceMs: number): [Clip, Clip] | null {
  // Validate: split point must be within the clip's source range
  if (atSourceMs <= clip.sourceStartMs || atSourceMs >= clip.sourceEndMs) {
    return null;
  }

  const clipDuration = clip.endMs - clip.startMs;
  const sourceRange = clip.sourceEndMs - clip.sourceStartMs;
  const splitRatio = (atSourceMs - clip.sourceStartMs) / sourceRange;
  const splitOutputMs = clip.startMs + clipDuration * splitRatio;

  const firstClip: Clip = {
    id: generateClipId(),
    startMs: clip.startMs,
    endMs: splitOutputMs,
    sourceStartMs: clip.sourceStartMs,
    sourceEndMs: atSourceMs,
  };

  const secondClip: Clip = {
    id: generateClipId(),
    startMs: splitOutputMs,
    endMs: clip.endMs,
    sourceStartMs: atSourceMs,
    sourceEndMs: clip.sourceEndMs,
  };

  return [firstClip, secondClip];
}

/** Delete a clip from the array and recalculate timeline positions */
export function deleteClip(clips: Clip[], clipId: string): Clip[] {
  const filtered = clips.filter((c) => c.id !== clipId);
  return recalculateTimeline(filtered);
}

/** Trim a clip's source boundaries and recalculate */
export function trimClip(
  clips: Clip[],
  clipId: string,
  newSourceStartMs: number,
  newSourceEndMs: number,
): Clip[] {
  return recalculateTimeline(
    clips.map((c) => {
      if (c.id !== clipId) return c;
      return {
        ...c,
        sourceStartMs: Math.max(0, newSourceStartMs),
        sourceEndMs: newSourceEndMs,
      };
    }),
  );
}

/** Recalculate output timeline positions so clips are contiguous */
export function recalculateTimeline(clips: Clip[]): Clip[] {
  let currentMs = 0;
  return clips.map((clip) => {
    const duration = clip.sourceEndMs - clip.sourceStartMs;
    const result: Clip = {
      ...clip,
      startMs: currentMs,
      endMs: currentMs + duration,
    };
    currentMs += duration;
    return result;
  });
}

/** Calculate total duration of all clips */
export function clipsToTotalDuration(clips: Clip[]): number {
  return clips.reduce((sum, clip) => sum + (clip.endMs - clip.startMs), 0);
}

/** Find which clip contains a given output timeline position */
export function findClipAtTime(clips: Clip[], timeMs: number): Clip | undefined {
  return clips.find((c) => timeMs >= c.startMs && timeMs < c.endMs);
}

/** Convert output timeline time to source video time */
export function outputToSourceTime(clips: Clip[], outputMs: number): number {
  const clip = findClipAtTime(clips, outputMs);
  if (!clip) return outputMs;
  const offsetInClip = outputMs - clip.startMs;
  const clipDuration = clip.endMs - clip.startMs;
  const sourceDuration = clip.sourceEndMs - clip.sourceStartMs;
  const ratio = sourceDuration > 0 ? offsetInClip / clipDuration : 0;
  return clip.sourceStartMs + sourceDuration * ratio;
}

/** Convert source video time to output timeline time */
export function sourceToOutputTime(clips: Clip[], sourceMs: number): number | null {
  for (const clip of clips) {
    if (sourceMs >= clip.sourceStartMs && sourceMs < clip.sourceEndMs) {
      const ratio = (sourceMs - clip.sourceStartMs) / (clip.sourceEndMs - clip.sourceStartMs);
      return clip.startMs + (clip.endMs - clip.startMs) * ratio;
    }
  }
  return null;
}

/** Create initial clips from video duration (single clip = full video) */
export function createInitialClips(durationMs: number): Clip[] {
  return [
    {
      id: generateClipId(),
      startMs: 0,
      endMs: durationMs,
      sourceStartMs: 0,
      sourceEndMs: durationMs,
    },
  ];
}

/** Get marker color based on type */
export function getMarkerColor(type: string): string {
  switch (type) {
    case "hook":
      return "#22c55e"; // green
    case "highlight":
      return "#3b82f6"; // blue
    case "cut":
      return "#ef4444"; // red
    case "silence":
      return "#f59e0b"; // amber
    case "transition":
      return "#8b5cf6"; // purple
    case "user":
      return "#06b6d4"; // cyan
    default:
      return "#6b7280"; // gray
  }
}
