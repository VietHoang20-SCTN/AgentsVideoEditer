import { z } from "zod";

// --- Transcript Highlights ---
export const transcriptHighlightSchema = z.object({
  start: z.number().describe("Start time in seconds"),
  end: z.number().describe("End time in seconds"),
  text: z.string(),
});

// --- Segments ---
export const segmentSchema = z.object({
  start: z.number().describe("Start time in seconds"),
  end: z.number().describe("End time in seconds"),
  label: z.string(),
  reason: z.string(),
});

// --- Edit Suggestions ---
export const editSuggestionSchema = z.object({
  type: z.enum(["cut", "trim", "speed_up", "slow_down", "keep", "highlight"]),
  start: z.number(),
  end: z.number(),
  reason: z.string(),
});

// --- Editor Markers ---
export const editorMarkerSchema = z.object({
  time: z.number().describe("Time in seconds"),
  label: z.string(),
  type: z.enum(["hook", "highlight", "cut", "silence", "transition"]).optional(),
});

// --- Full AI Analysis ---
export const aiAnalysisSchema = z.object({
  detectedLanguage: z.string().describe("ISO 639-1 language code"),
  languageName: z.string().describe("Human-readable language name"),
  confidence: z.number().min(0).max(1),
  summary: z.string().describe("Brief summary of video content"),
  transcriptHighlights: z.array(transcriptHighlightSchema),
  segments: z.array(segmentSchema),
  editSuggestions: z.array(editSuggestionSchema),
  editorMarkers: z.array(editorMarkerSchema),
});

export type AIAnalysis = z.infer<typeof aiAnalysisSchema>;
export type TranscriptHighlight = z.infer<typeof transcriptHighlightSchema>;
export type Segment = z.infer<typeof segmentSchema>;
export type EditSuggestion = z.infer<typeof editSuggestionSchema>;
export type EditorMarker = z.infer<typeof editorMarkerSchema>;
