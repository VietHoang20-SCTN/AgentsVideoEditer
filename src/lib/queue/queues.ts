import { Queue } from "bullmq";
import { redis } from "./connection";

// stalledInterval and maxStalledCount are WorkerOptions, not DefaultJobOptions.
// DefaultJobOptions only covers per-job settings (attempts, backoff, removeOnComplete, etc.)
const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 5_000,
  },
};

export const analysisQueue = new Queue("analysis", {
  connection: redis,
  defaultJobOptions,
});
export const planningQueue = new Queue("planning", {
  connection: redis,
  defaultJobOptions,
});
export const renderQueue = new Queue("render", {
  connection: redis,
  defaultJobOptions,
});
