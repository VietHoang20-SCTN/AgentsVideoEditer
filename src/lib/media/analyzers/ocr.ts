import { logger } from "@/lib/logger";
import type { OcrResult } from "@/lib/validators/analysis";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);
const log = logger.child({ module: "ocr" });

// Common watermark patterns
const WATERMARK_PATTERNS = [
  /tiktok/i,
  /douyin/i,
  /instagram/i,
  /youtube/i,
  /snapchat/i,
  /capcut/i,
  /filmora/i,
  /kinemaster/i,
  /made with/i,
  /shot on/i,
  /@\w{2,}/,
];

/**
 * Extract frames at intervals, run Tesseract.js OCR, detect watermarks.
 */
export async function analyzeOcr(
  videoPath: string,
  durationMs: number
): Promise<OcrResult | null> {
  const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "xh-ocr-"));

  try {
    const durationSec = durationMs / 1000;
    // Extract one frame every 5 seconds, max 20 frames
    const interval = Math.max(5, durationSec / 20);
    const frameCount = Math.min(20, Math.ceil(durationSec / interval));

    log.info("Extracting frames for OCR", { interval, frameCount });

    // Extract frames
    await execFileAsync(ffmpegPath, [
      "-i", videoPath,
      "-vf", `fps=1/${interval}`,
      "-frames:v", String(frameCount),
      "-q:v", "2",
      path.join(tmpDir, "frame_%04d.png"),
    ]);

    // List extracted frames
    const files = (await fs.readdir(tmpDir))
      .filter((f) => f.startsWith("frame_") && f.endsWith(".png"))
      .sort();

    if (files.length === 0) {
      log.warn("No frames extracted for OCR");
      return null;
    }

    // Run Tesseract on each frame
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");

    const frames: OcrResult["frames"] = [];
    const watermarkTimestamps: number[] = [];

    for (let i = 0; i < files.length; i++) {
      const framePath = path.join(tmpDir, files[i]);
      const timestamp = i * interval;

      try {
        const result = await worker.recognize(framePath);
        const text = result.data.text.trim();
        const confidence = result.data.confidence;

        const hasWatermark = WATERMARK_PATTERNS.some((pattern) =>
          pattern.test(text)
        );

        if (hasWatermark) {
          watermarkTimestamps.push(timestamp);
        }

        frames.push({
          timestamp,
          text,
          confidence,
          hasWatermark,
        });
      } catch (err) {
        log.warn("OCR failed for frame", {
          frame: files[i],
          error: (err as Error).message,
        });
      }
    }

    await worker.terminate();

    log.info("OCR analysis complete", {
      framesProcessed: frames.length,
      watermarksFound: watermarkTimestamps.length,
    });

    return {
      frames,
      watermarkDetected: watermarkTimestamps.length > 0,
      watermarkTimestamps,
    };
  } catch (err) {
    log.error("OCR analysis failed", { error: (err as Error).message });
    return null;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
