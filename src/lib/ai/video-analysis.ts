import { logger } from "@/lib/logger";
import { getAIClientConfig, OpenAINotConfiguredError } from "@/lib/ai";
import { aiAnalysisSchema, type AIAnalysis } from "@/lib/validators/ai-analysis";
import type { AnalysisReport } from "@/lib/validators/analysis";

const log = logger.child({ module: "video-analysis" });

/**
 * Build a compact text context string from an analysis report.
 * This is fed into the AI prompt so the model understands the video content.
 */
export function buildAnalysisContext(report: AnalysisReport): string {
  const parts: string[] = [];

  // Transcript segments
  if (report.transcript) {
    const { transcript } = report;
    parts.push("## Transcript");
    if (transcript.language) {
      parts.push(`Language: ${transcript.language}`);
    }
    if (transcript.segments.length > 0) {
      for (const seg of transcript.segments) {
        parts.push(`[${seg.start.toFixed(1)}s - ${seg.end.toFixed(1)}s] ${seg.text}`);
      }
    }
    if (transcript.fullText) {
      parts.push(`\nFull text: ${transcript.fullText}`);
    }
  }

  // OCR text
  if (report.ocr) {
    const { ocr } = report;
    parts.push("\n## OCR Text");
    if (ocr.frames.length > 0) {
      for (const frame of ocr.frames) {
        parts.push(`[${frame.timestamp.toFixed(1)}s] ${frame.text} (confidence: ${frame.confidence.toFixed(2)})`);
      }
    }
    if (ocr.watermarkDetected) {
      parts.push(`Watermark detected at: ${ocr.watermarkTimestamps.map((t) => `${t.toFixed(1)}s`).join(", ")}`);
    }
  }

  // Scene cuts
  if (report.scenes) {
    const { scenes } = report;
    parts.push("\n## Scene Cuts");
    parts.push(`Threshold: ${scenes.threshold}`);
    parts.push(`Total scenes: ${scenes.scenes.length}`);
    if (scenes.scenes.length > 0) {
      const timestamps = scenes.scenes.map((s) => `${s.timestamp.toFixed(1)}s`).join(", ");
      parts.push(`Cut points: ${timestamps}`);
    }
  }

  // Audio data
  if (report.audio) {
    const { audio } = report;
    parts.push("\n## Audio");
    parts.push(`Mean volume: ${audio.meanVolume.toFixed(1)} dB`);
    parts.push(`Max volume: ${audio.maxVolume.toFixed(1)} dB`);
    if (audio.silentSegments.length > 0) {
      parts.push(`Silent segments (${audio.silentSegments.length}):`);
      for (const seg of audio.silentSegments) {
        parts.push(`  [${seg.start.toFixed(1)}s - ${seg.end.toFixed(1)}s] duration: ${seg.duration.toFixed(1)}s`);
      }
    }
  }

  return parts.join("\n");
}

const SYSTEM_PROMPT = `You are an expert video editor AI assistant. Analyze the provided video analysis data and return a structured JSON response.

Your response MUST be valid JSON with this exact structure:
{
  "detectedLanguage": "ISO 639-1 language code (e.g. 'en', 'vi', 'zh')",
  "languageName": "Human-readable language name (e.g. 'English', 'Vietnamese')",
  "confidence": 0.0 to 1.0,
  "summary": "Brief 1-3 sentence summary of the video content",
  "transcriptHighlights": [
    { "start": 0, "end": 5, "text": "Notable quote or key moment" }
  ],
  "segments": [
    { "start": 0, "end": 10, "label": "Intro", "reason": "Opening hook with presenter introduction" }
  ],
  "editSuggestions": [
    { "type": "cut|trim|speed_up|slow_down|keep|highlight", "start": 0, "end": 5, "reason": "Why this edit" }
  ],
  "editorMarkers": [
    { "time": 0, "label": "Hook point", "type": "hook|highlight|cut|silence|transition" }
  ]
}

Rules:
- Detect the primary language from transcript/OCR text
- Identify the most engaging moments for short-form content
- Suggest cuts for silence, dead air, or low-value segments
- Mark hook points in the first 3 seconds
- Suggest speed changes for slow segments
- Keep edit suggestions actionable and specific
- Return ONLY valid JSON, no markdown fences or extra text`;

/**
 * Generate AI-powered video analysis from a context string.
 * Uses the OpenAI-compatible API to produce structured editing suggestions.
 */
export async function generateAIAnalysis(
  context: string,
  userSettings?: { aiApiKey?: string; aiBaseUrl?: string },
): Promise<AIAnalysis> {
  const { apiKey, baseURL } = getAIClientConfig(
    userSettings
      ? { aiApiKey: userSettings.aiApiKey, aiBaseUrl: userSettings.aiBaseUrl }
      : undefined,
  );

  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });

  log.info("Generating AI video analysis", { contextLength: context.length });

  const completion = await openai.chat.completions.create({
    model: process.env.AI_MODEL || "cx/gpt-5.4",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Analyze the following video data and provide structured editing recommendations:\n\n${context}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("AI returned empty response");
  }

  log.info("AI analysis response received, parsing");

  const parsed = JSON.parse(raw);
  return parseAIAnalysisResponse(parsed);
}

/**
 * Validate and parse a raw AI analysis response using the Zod schema.
 * Throws a ZodError if the response doesn't match the expected structure.
 */
export function parseAIAnalysisResponse(raw: unknown): AIAnalysis {
  return aiAnalysisSchema.parse(raw);
}
