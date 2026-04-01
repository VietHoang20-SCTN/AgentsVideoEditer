import { logger } from "@/lib/logger";
import type { SceneResult } from "@/lib/validators/analysis";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const log = logger.child({ module: "scenes" });

const DEFAULT_THRESHOLD = 0.3;

/**
 * Detect scene changes using FFmpeg's scene detection filter.
 * Parses `select='gt(scene,THRESHOLD)',showinfo` output.
 */
export async function analyzeScenes(
  videoPath: string,
  threshold: number = DEFAULT_THRESHOLD
): Promise<SceneResult | null> {
  const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";

  try {
    log.info("Running scene detection", { videoPath, threshold });

    const { stderr } = await execFileAsync(ffmpegPath, [
      "-i", videoPath,
      "-vf", `select='gt(scene,${threshold})',showinfo`,
      "-f", "null",
      "-",
    ], { maxBuffer: 10 * 1024 * 1024 });

    // Parse showinfo output lines like:
    // [Parsed_showinfo_1 @ ...] n:  42 pts: 123456 pts_time:1.234 ...
    const scenes: { timestamp: number; score: number; frameIndex: number }[] = [];
    const lines = stderr.split("\n");

    for (const line of lines) {
      const showInfoMatch = line.match(
        /\[Parsed_showinfo_\d+\s*@\s*[^\]]+\]\s*n:\s*(\d+)\s.*pts_time:([\d.]+)/
      );
      if (showInfoMatch) {
        const frameIndex = parseInt(showInfoMatch[1], 10);
        const timestamp = parseFloat(showInfoMatch[2]);

        // Try to extract scene score from the select filter debug
        const scoreMatch = line.match(/scene_score=([\d.]+)/);
        const score = scoreMatch ? parseFloat(scoreMatch[1]) : threshold;

        scenes.push({ timestamp, score, frameIndex });
      }
    }

    log.info("Scene detection complete", { sceneCount: scenes.length });

    return {
      threshold,
      scenes,
    };
  } catch (err) {
    log.error("Scene detection failed", { error: (err as Error).message });
    return null;
  }
}
