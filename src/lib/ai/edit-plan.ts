import type { AnalysisReport } from "@/lib/validators/analysis";

export interface EditPlanInput {
  transcript: AnalysisReport["transcript"];
  scenes: AnalysisReport["scenes"];
  ocr: AnalysisReport["ocr"];
  audio: AnalysisReport["audio"];
  riskReport: {
    overallScore: number;
    watermarkScore: number | null;
    audioReuseScore: number | null;
    lowTransformationScore: number | null;
    notes: string[] | null;
  } | null;
  sourceMetadata: {
    durationMs?: number;
    width?: number;
    height?: number;
    fps?: number;
  };
}

export interface SegmentPlan {
  startMs: number;
  endMs: number;
  action: "keep" | "cut" | "speed_up" | "slow_down";
  reason: string;
  speedFactor?: number;
}

export interface SubtitleStrategy {
  enabled: boolean;
  style: "bottom_center" | "dynamic_highlight" | "karaoke";
  fontSizeScale: number;
  language?: string;
}

export interface EditPlanOutput {
  hookSuggestion: string;
  segments: SegmentPlan[];
  cutRecommendations: string[];
  subtitleStrategy: SubtitleStrategy;
  titleOptions: string[];
  descriptionOptions: string[];
  hashtagOptions: string[];
  ctaSuggestion: string;
  transformationNotes: string[];
  outputFormat: {
    width: number;
    height: number;
    fps: number;
    durationEstimateMs: number;
  };
}

const PROMPT_VERSION = "v1.0";

/**
 * Generate a deterministic edit plan from analysis + risk signals.
 * This is a heuristic-based planner (no LLM call for MVP).
 * Designed so the plan JSON can be consumed by a render pipeline.
 */
export function generateEditPlan(input: EditPlanInput): EditPlanOutput {
  const { transcript, scenes, ocr, audio, riskReport, sourceMetadata } = input;
  const durationMs = sourceMetadata.durationMs ?? 0;
  const srcWidth = sourceMetadata.width ?? 1920;
  const srcHeight = sourceMetadata.height ?? 1080;
  const fps = sourceMetadata.fps ?? 30;

  // --- Segments: decide what to keep/cut ---
  const segments: SegmentPlan[] = [];
  const silentSegments = audio?.silentSegments ?? [];
  const sceneCuts = scenes?.scenes ?? [];

  // Mark leading silence as cut
  if (silentSegments.length > 0 && silentSegments[0].start < 0.5) {
    const leadingSilence = silentSegments[0];
    if (leadingSilence.duration > 0.5) {
      segments.push({
        startMs: 0,
        endMs: Math.round(leadingSilence.end * 1000),
        action: "cut",
        reason: "Leading silence — trim for faster hook",
      });
    }
  }

  // Mark trailing silence as cut
  if (silentSegments.length > 0) {
    const lastSilence = silentSegments[silentSegments.length - 1];
    if (lastSilence.end * 1000 >= durationMs - 500 && lastSilence.duration > 0.5) {
      segments.push({
        startMs: Math.round(lastSilence.start * 1000),
        endMs: durationMs,
        action: "cut",
        reason: "Trailing silence — trim dead air",
      });
    }
  }

  // Mark long mid-silence as speed-up
  for (const seg of silentSegments) {
    if (seg.duration > 2 && seg.start > 1 && seg.end * 1000 < durationMs - 1000) {
      segments.push({
        startMs: Math.round(seg.start * 1000),
        endMs: Math.round(seg.end * 1000),
        action: "speed_up",
        speedFactor: 2,
        reason: "Long silence — speed up to maintain engagement",
      });
    }
  }

  // If very few segments planned so far, keep the whole video
  if (segments.length === 0) {
    segments.push({
      startMs: 0,
      endMs: durationMs,
      action: "keep",
      reason: "Full video — no significant silence or dead spots detected",
    });
  }

  // --- Hook suggestion ---
  let hookSuggestion = "Start with the most engaging visual moment.";
  if (transcript && transcript.segments.length > 0) {
    const firstWords = transcript.segments[0].text.substring(0, 80);
    hookSuggestion = `Open with: "${firstWords}..." — grab attention in first 3 seconds.`;
  }
  if (sceneCuts.length > 3) {
    hookSuggestion += " Video has fast cuts — use the most dynamic scene as the hook.";
  }

  // --- Cut recommendations ---
  const cutRecommendations: string[] = [];
  if (riskReport && riskReport.watermarkScore && riskReport.watermarkScore > 50) {
    cutRecommendations.push("Consider cropping to remove watermark regions.");
  }
  if (silentSegments.length > 3) {
    cutRecommendations.push(`Remove or speed up ${silentSegments.length} silent segments for tighter pacing.`);
  }
  if (durationMs > 90000) {
    cutRecommendations.push("Source is over 90s — trim to 60s or less for short-form.");
  }

  // --- Subtitle strategy ---
  const subtitleStrategy: SubtitleStrategy = {
    enabled: !!transcript,
    style: "bottom_center",
    fontSizeScale: 1.0,
    language: transcript?.language,
  };

  // --- Title options ---
  const titleOptions = generateTitleOptions(transcript);

  // --- Description options ---
  const descriptionOptions = [
    transcript?.fullText
      ? `${transcript.fullText.substring(0, 150)}...`
      : "Watch this video to find out more!",
    "Quick breakdown of the key moments.",
  ];

  // --- Hashtags ---
  const hashtagOptions = generateHashtags(transcript, ocr);

  // --- CTA ---
  const ctaSuggestion = "Follow for more content like this! Drop a comment with your thoughts.";

  // --- Transformation notes ---
  const transformationNotes: string[] = [];
  if (srcWidth > srcHeight) {
    transformationNotes.push("Source is landscape — will need crop/resize to 9:16 for vertical short-form.");
  }
  if (riskReport && riskReport.overallScore > 60) {
    transformationNotes.push("High risk score — apply significant visual transformation (zoom, crop, overlay).");
  }
  if (riskReport && riskReport.overallScore <= 30) {
    transformationNotes.push("Low risk — minimal transformation needed.");
  }

  // --- Output format ---
  const outputWidth = 1080;
  const outputHeight = 1920;
  const keptDurationMs = estimateKeptDuration(segments, durationMs);

  return {
    hookSuggestion,
    segments,
    cutRecommendations,
    subtitleStrategy,
    titleOptions,
    descriptionOptions,
    hashtagOptions,
    ctaSuggestion,
    transformationNotes,
    outputFormat: {
      width: outputWidth,
      height: outputHeight,
      fps,
      durationEstimateMs: keptDurationMs,
    },
  };
}

export function getPromptVersion(): string {
  return PROMPT_VERSION;
}

// --- Helpers ---

function generateTitleOptions(
  transcript: AnalysisReport["transcript"]
): string[] {
  const options: string[] = [];

  if (transcript && transcript.fullText.length > 10) {
    // Extract first sentence as a title candidate
    const firstSentence = transcript.fullText.split(/[.!?]/)[0].trim();
    if (firstSentence.length > 5 && firstSentence.length < 100) {
      options.push(firstSentence);
    }
  }

  options.push("You won't believe what happens next!");
  options.push("Watch until the end...");

  return options.slice(0, 3);
}

function generateHashtags(
  transcript: AnalysisReport["transcript"],
  ocr: AnalysisReport["ocr"]
): string[] {
  const tags = new Set<string>(["#shorts", "#viral", "#fyp"]);

  if (transcript?.language === "vi") {
    tags.add("#vietnam");
  }

  if (ocr?.watermarkDetected) {
    tags.add("#edit");
    tags.add("#remake");
  }

  return Array.from(tags);
}

function estimateKeptDuration(segments: SegmentPlan[], totalDurationMs: number): number {
  let cutMs = 0;
  for (const seg of segments) {
    if (seg.action === "cut") {
      cutMs += seg.endMs - seg.startMs;
    } else if (seg.action === "speed_up" && seg.speedFactor) {
      cutMs += (seg.endMs - seg.startMs) * (1 - 1 / seg.speedFactor);
    }
  }
  return Math.max(totalDurationMs - cutMs, 0);
}
