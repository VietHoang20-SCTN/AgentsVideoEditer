import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string(),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),
  NEXTAUTH_URL: z.string().url(),
  UPLOAD_DIR: z.string().default("./uploads"),
  OPENAI_API_KEY: z.string().optional().or(z.literal("").transform(() => undefined)),
  AI_BASE_URL: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  AI_API_KEY: z.string().optional().or(z.literal("").transform(() => undefined)),
  FFMPEG_PATH: z.string().default("ffmpeg"),
  FFPROBE_PATH: z.string().default("ffprobe"),
  WORKER_ANALYSIS_CONCURRENCY: z.coerce.number().int().min(1).max(10).default(1),
  WORKER_PLANNING_CONCURRENCY: z.coerce.number().int().min(1).max(10).default(1),
  WORKER_RENDER_CONCURRENCY: z.coerce.number().int().min(1).max(4).default(1),
  DISK_QUOTA_BYTES: z.coerce.number().default(5 * 1024 * 1024 * 1024),
  STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
  METRICS_TOKEN: z.string().optional(),
});

const result = envSchema.safeParse(process.env);
if (!result.success) {
  console.error("❌ Invalid environment variables:");
  console.error(result.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = result.data;
