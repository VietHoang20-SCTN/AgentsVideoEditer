import { logger } from "@/lib/logger";
import type { AudioStats } from "@/lib/validators/analysis";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const log = logger.child({ module: "audio" });

/**
 * Analyze audio using FFmpeg volumedetect and silencedetect filters.
 */
export async function analyzeAudio(
  videoPath: string
): Promise<AudioStats | null> {
  const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";

  try {
    log.info("Running audio analysis", { videoPath });

    // Run volumedetect
    let meanVolume = 0;
    let maxVolume = 0;
    try {
      const { stderr: volStderr } = await execFileAsync(ffmpegPath, [
        "-i", videoPath,
        "-af", "volumedetect",
        "-f", "null",
        "-",
      ], { maxBuffer: 10 * 1024 * 1024 });

      const meanMatch = volStderr.match(/mean_volume:\s*([-\d.]+)\s*dB/);
      const maxMatch = volStderr.match(/max_volume:\s*([-\d.]+)\s*dB/);
      meanVolume = meanMatch ? parseFloat(meanMatch[1]) : 0;
      maxVolume = maxMatch ? parseFloat(maxMatch[1]) : 0;
    } catch (err) {
      log.warn("Volume detection failed", { error: (err as Error).message });
    }

    // Run silencedetect
    const silentSegments: AudioStats["silentSegments"] = [];
    try {
      const { stderr: silStderr } = await execFileAsync(ffmpegPath, [
        "-i", videoPath,
        "-af", "silencedetect=noise=-30dB:d=0.5",
        "-f", "null",
        "-",
      ], { maxBuffer: 10 * 1024 * 1024 });

      // Parse silence_start / silence_end pairs
      const startRegex = /silence_start:\s*([\d.]+)/g;
      const endRegex = /silence_end:\s*([\d.]+)\s*\|\s*silence_duration:\s*([\d.]+)/g;

      const starts: number[] = [];
      let match;
      while ((match = startRegex.exec(silStderr)) !== null) {
        starts.push(parseFloat(match[1]));
      }

      let idx = 0;
      while ((match = endRegex.exec(silStderr)) !== null) {
        const end = parseFloat(match[1]);
        const duration = parseFloat(match[2]);
        const start = idx < starts.length ? starts[idx] : end - duration;
        silentSegments.push({ start, end, duration });
        idx++;
      }
    } catch (err) {
      log.warn("Silence detection failed", { error: (err as Error).message });
    }

    log.info("Audio analysis complete", {
      meanVolume,
      maxVolume,
      silentSegments: silentSegments.length,
    });

    return {
      meanVolume,
      maxVolume,
      silentSegments,
    };
  } catch (err) {
    log.error("Audio analysis failed", { error: (err as Error).message });
    return null;
  }
}
