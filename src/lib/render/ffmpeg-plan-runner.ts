import { execFile } from "child_process";
import { promisify } from "util";
import { logger } from "@/lib/logger";

const execFileAsync = promisify(execFile);
const log = logger.child({ module: "ffmpeg-runner" });

export interface RenderSegment {
  startMs: number;
  endMs: number;
  action: "keep" | "cut" | "speed_up" | "slow_down";
  speedFactor?: number;
}

export interface RenderPlan {
  segments: RenderSegment[];
  outputFormat: {
    width: number;
    height: number;
    fps: number;
  };
  subtitleStrategy: {
    enabled: boolean;
  };
}

export interface RenderResult {
  outputPath: string;
  durationMs: number;
  logs: string[];
}

/**
 * Build a chained atempo filter string.
 * atempo only supports values in [0.5, 100]. For factors outside that range,
 * chain multiple atempo filters whose product equals the desired speed.
 * e.g. 4x → atempo=2.0,atempo=2.0
 *      0.25x → atempo=0.5,atempo=0.5
 */
function buildAtempoChain(inLabel: string, speedFactor: number, outLabel: string): string {
  let remaining = speedFactor;

  // Build list of per-filter values
  const atempoValues: number[] = [];
  if (remaining > 1) {
    while (remaining > 100) {
      atempoValues.push(100);
      remaining /= 100;
    }
    atempoValues.push(Math.min(remaining, 100));
  } else {
    // slow down
    while (remaining < 0.5) {
      atempoValues.push(0.5);
      remaining /= 0.5;
    }
    atempoValues.push(Math.max(remaining, 0.5));
  }

  // Build the filter chain: [in]atempo=v1,atempo=v2[out]
  const chain = atempoValues.map((v) => `atempo=${v.toFixed(6)}`).join(",");
  return `[${inLabel}]${chain}[${outLabel}]`;
}

/**
 * Execute a deterministic FFmpeg render from a plan JSON.
 * Produces a vertical (9:16) short-form video by:
 * 1. Building a filter_complex that keeps/speeds segments
 * 2. Scaling and cropping to output dimensions
 * 3. Writing the final mp4
 */
export async function executeRenderPlan(
  inputPath: string,
  outputPath: string,
  plan: RenderPlan
): Promise<RenderResult> {
  const startTime = Date.now();
  const logs: string[] = [];
  const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";

  // Build segments to keep (filter out cuts)
  const keptSegments = plan.segments.filter((s) => s.action !== "cut");

  if (keptSegments.length === 0) {
    // If everything is cut, keep the whole video
    keptSegments.push({
      startMs: 0,
      endMs: 0, // 0 means to end
      action: "keep",
    });
  }

  const { width, height, fps } = plan.outputFormat;
  const n = keptSegments.length;
  const filterParts: string[] = [];
  const concatInputs: string[] = [];

  // Split input streams so each trim segment gets its own copy.
  // FFmpeg does not allow the same pad (e.g. [0:v]) to be used as input
  // for more than one filter at a time — split/asplit solves this.
  if (n === 1) {
    // copy is a no-op passthrough; avoids the "unused stream" warning from split=1
    filterParts.push(`[0:v]copy[vsplit0]`);
    filterParts.push(`[0:a]acopy[asplit0]`);
  } else {
    const vOuts = Array.from({ length: n }, (_, i) => `[vsplit${i}]`).join("");
    const aOuts = Array.from({ length: n }, (_, i) => `[asplit${i}]`).join("");
    filterParts.push(`[0:v]split=${n}${vOuts}`);
    filterParts.push(`[0:a]asplit=${n}${aOuts}`);
  }

  keptSegments.forEach((seg, i) => {
    const startSec = seg.startMs / 1000;
    const endSec = seg.endMs > 0 ? seg.endMs / 1000 : undefined;
    const trimEnd = endSec !== undefined ? `:end=${endSec}` : "";

    // Trim each split copy
    filterParts.push(
      `[vsplit${i}]trim=start=${startSec}${trimEnd},setpts=PTS-STARTPTS[vt${i}]`
    );
    filterParts.push(
      `[asplit${i}]atrim=start=${startSec}${trimEnd},asetpts=PTS-STARTPTS[at${i}]`
    );

    let vLabel = `vt${i}`;
    let aLabel = `at${i}`;

    // Speed adjustment — use chained atempo for values outside [0.5, 100]
    if (seg.action === "speed_up" && seg.speedFactor && seg.speedFactor > 1) {
      const pts = (1 / seg.speedFactor).toFixed(6);
      filterParts.push(`[${vLabel}]setpts=${pts}*PTS[vs${i}]`);
      filterParts.push(buildAtempoChain(aLabel, seg.speedFactor, `as${i}`));
      vLabel = `vs${i}`;
      aLabel = `as${i}`;
    } else if (
      seg.action === "slow_down" &&
      seg.speedFactor &&
      seg.speedFactor > 0 &&
      seg.speedFactor < 1
    ) {
      const pts = (1 / seg.speedFactor).toFixed(6);
      filterParts.push(`[${vLabel}]setpts=${pts}*PTS[vs${i}]`);
      filterParts.push(buildAtempoChain(aLabel, seg.speedFactor, `as${i}`));
      vLabel = `vs${i}`;
      aLabel = `as${i}`;
    }

    concatInputs.push(`[${vLabel}][${aLabel}]`);
  });

  // Concat all kept segments
  filterParts.push(
    `${concatInputs.join("")}concat=n=${n}:v=1:a=1[vc][ac]`
  );

  // Scale and crop to output dimensions (center crop: landscape → portrait)
  filterParts.push(
    `[vc]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}[vout]`
  );

  const filterComplex = filterParts.join(";\n");

  const args = [
    "-y",
    "-i", inputPath,
    "-filter_complex", filterComplex,
    "-map", "[vout]",
    "-map", "[ac]",
    "-r", String(fps),
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "23",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    outputPath,
  ];

  logs.push(`FFmpeg command: ${ffmpegPath} ${args.join(" ")}`);
  log.info("Starting render", { outputPath });

  try {
    const { stdout, stderr } = await execFileAsync(ffmpegPath, args, {
      timeout: 300000, // 5 min timeout
      maxBuffer: 10 * 1024 * 1024,
    });

    if (stdout) logs.push(`stdout: ${stdout.substring(0, 2000)}`);
    if (stderr) logs.push(`stderr: ${stderr.substring(0, 2000)}`);

    const durationMs = Date.now() - startTime;
    log.info("Render complete", { outputPath, durationMs });

    return { outputPath, durationMs, logs };
  } catch (err) {
    const errMsg = (err as Error).message;
    logs.push(`Error: ${errMsg}`);
    log.error("Render failed", { error: errMsg });
    throw new Error(`FFmpeg render failed: ${errMsg}`);
  }
}
