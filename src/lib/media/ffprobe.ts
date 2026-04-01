import ffmpeg from "fluent-ffmpeg";

// Configure paths from environment variables
if (process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
}
if (process.env.FFPROBE_PATH) {
  ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);
}

export interface VideoMetadata {
  durationMs: number;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  codec: string;
  audioCodec: string | null;
}

/**
 * Safely parse frame rate strings like "30/1", "30000/1001", or "30".
 * Replaces unsafe eval() usage.
 */
function parseFrameRate(rFrameRate: string | undefined): number {
  if (!rFrameRate) return 0;
  const parts = rFrameRate.split("/");
  if (parts.length === 2) {
    const numerator = Number(parts[0]);
    const denominator = Number(parts[1]);
    if (denominator === 0 || isNaN(numerator) || isNaN(denominator)) return 0;
    return numerator / denominator;
  }
  const value = Number(rFrameRate);
  return isNaN(value) ? 0 : value;
}

export function extractMetadata(filePath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);

      const videoStream = data.streams.find((s) => s.codec_type === "video");
      const audioStream = data.streams.find((s) => s.codec_type === "audio");

      if (!videoStream) return reject(new Error("No video stream found"));

      const fps = parseFrameRate(videoStream.r_frame_rate);

      resolve({
        durationMs: Math.round((data.format.duration || 0) * 1000),
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        fps: Math.round(fps * 100) / 100,
        bitrate: data.format.bit_rate ? Math.round(Number(data.format.bit_rate)) : 0,
        codec: videoStream.codec_name || "unknown",
        audioCodec: audioStream?.codec_name || null,
      });
    });
  });
}
