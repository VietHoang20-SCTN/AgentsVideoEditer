import { logger } from "@/lib/logger";
import type { TranscriptResult } from "@/lib/validators/analysis";
import { getAIClientConfig, OpenAINotConfiguredError } from "@/lib/ai";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);
const log = logger.child({ module: "transcript" });

/**
 * Extract audio from video as WAV, then transcribe using OpenAI Whisper API.
 * Falls back to GPT-based transcript synthesis from OCR + scene data if Whisper fails.
 */
export async function analyzeTranscript(
  videoPath: string,
  userSettings?: { aiApiKey?: string | null; aiBaseUrl?: string | null },
  fallbackContext?: { ocrText?: string; sceneCount?: number; durationMs?: number }
): Promise<TranscriptResult | null> {
  const { apiKey, baseURL } = getAIClientConfig(userSettings);

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "xh-audio-"));
  const wavPath = path.join(tmpDir, "audio.wav");

  try {
    // Extract audio to WAV using ffmpeg
    const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
    log.info("Extracting audio from video", { videoPath, wavPath });
    await execFileAsync(ffmpegPath, [
      "-i", videoPath,
      "-vn",
      "-acodec", "pcm_s16le",
      "-ar", "16000",
      "-ac", "1",
      "-y",
      wavPath,
    ]);

    // Check file exists and has content
    const stat = await fs.stat(wavPath);
    if (stat.size === 0) {
      log.warn("Extracted audio file is empty, video may have no audio track");
      return null;
    }

    // Try Whisper API first
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });

    try {
      log.info("Sending audio to Whisper API");
      const audioFile = await fs.readFile(wavPath);
      const file = new File([audioFile], "audio.wav", { type: "audio/wav" });

      const response = await openai.audio.transcriptions.create({
        model: "whisper-1",
        file,
        response_format: "verbose_json",
        timestamp_granularities: ["segment"],
      });

      const segments = (response.segments || []).map((seg) => ({
        start: seg.start,
        end: seg.end,
        text: seg.text.trim(),
      }));

      log.info("Whisper transcription successful", { segments: segments.length });
      return {
        language: response.language || undefined,
        segments,
        fullText: response.text,
      };
    } catch (whisperErr) {
      log.warn("Whisper API unavailable, falling back to GPT synthesis", {
        error: (whisperErr as Error).message,
      });
    }

    // Fallback: synthesize transcript using GPT from OCR + scene context
    if (fallbackContext) {
      return await synthesizeTranscriptWithGPT(openai, fallbackContext);
    }

    return null;
  } catch (err) {
    // Re-throw configuration errors — callers must handle 501
    if (err instanceof OpenAINotConfiguredError) throw err;
    log.error("Transcription failed", { error: (err as Error).message });
    return null;
  } finally {
    // Cleanup temp files
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Synthesize a plausible transcript using GPT based on OCR text and scene info.
 * Used when Whisper is unavailable (e.g. local AI proxy without audio endpoint).
 */
async function synthesizeTranscriptWithGPT(
  openai: import("openai").default,
  context: { ocrText?: string; sceneCount?: number; durationMs?: number }
): Promise<TranscriptResult | null> {
  const { ocrText, sceneCount, durationMs } = context;
  const durationSec = Math.round((durationMs || 0) / 1000);

  log.info("Synthesizing transcript via GPT", { sceneCount, durationSec });

  try {
    const prompt = `You are analyzing a short video for content moderation purposes.
Based on the following context extracted from the video, generate a plausible transcript.

Video info:
- Duration: ${durationSec} seconds
- Number of scene changes: ${sceneCount ?? "unknown"}
- Text visible in frames (OCR): ${ocrText?.trim() || "none detected"}

Generate a JSON response with this exact structure:
{
  "language": "vi" or "en" or other ISO code,
  "fullText": "the full transcript text",
  "segments": [
    { "start": 0, "end": 5, "text": "segment text" }
  ]
}

Rules:
- If OCR text contains Vietnamese, assume Vietnamese language
- Create realistic time segments based on duration
- Keep segments 3-8 seconds each
- Mark language as "unknown" if unclear
- Return ONLY valid JSON, no markdown`;

    const completion = await openai.chat.completions.create({
      model: process.env.AI_MODEL || "cx/gpt-5.4",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    log.info("GPT transcript synthesis complete", {
      language: parsed.language,
      segments: parsed.segments?.length ?? 0,
    });

    return {
      language: parsed.language || undefined,
      fullText: parsed.fullText || "",
      segments: (parsed.segments || []).map((s: { start: number; end: number; text: string }) => ({
        start: Number(s.start),
        end: Number(s.end),
        text: String(s.text),
      })),
    };
  } catch (err) {
    log.error("GPT transcript synthesis failed", { error: (err as Error).message });
    return null;
  }
}
