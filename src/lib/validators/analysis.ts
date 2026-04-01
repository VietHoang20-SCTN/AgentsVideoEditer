import { z } from "zod";

// --- Transcript ---
export const transcriptSegmentSchema = z.object({
  start: z.number(),
  end: z.number(),
  text: z.string(),
});

export const transcriptResultSchema = z.object({
  language: z.string().optional(),
  segments: z.array(transcriptSegmentSchema),
  fullText: z.string(),
});

export type TranscriptResult = z.infer<typeof transcriptResultSchema>;

// --- Scenes ---
export const sceneSchema = z.object({
  timestamp: z.number(),
  score: z.number(),
  frameIndex: z.number().optional(),
});

export const sceneResultSchema = z.object({
  threshold: z.number(),
  scenes: z.array(sceneSchema),
});

export type SceneResult = z.infer<typeof sceneResultSchema>;

// --- OCR ---
export const ocrFrameSchema = z.object({
  timestamp: z.number(),
  text: z.string(),
  confidence: z.number(),
  hasWatermark: z.boolean(),
});

export const ocrResultSchema = z.object({
  frames: z.array(ocrFrameSchema),
  watermarkDetected: z.boolean(),
  watermarkTimestamps: z.array(z.number()),
});

export type OcrResult = z.infer<typeof ocrResultSchema>;

// --- Audio ---
export const audioStatsSchema = z.object({
  meanVolume: z.number(),
  maxVolume: z.number(),
  silentSegments: z.array(
    z.object({
      start: z.number(),
      end: z.number(),
      duration: z.number(),
    })
  ),
});

export type AudioStats = z.infer<typeof audioStatsSchema>;

// --- Full Report ---
export const analysisReportSchema = z.object({
  transcript: transcriptResultSchema.nullable(),
  scenes: sceneResultSchema.nullable(),
  ocr: ocrResultSchema.nullable(),
  audio: audioStatsSchema.nullable(),
});

export type AnalysisReport = z.infer<typeof analysisReportSchema>;
