import { Queue } from "bullmq";
import { redis } from "./connection";

export const analysisQueue = new Queue("analysis", { connection: redis });
export const planningQueue = new Queue("planning", { connection: redis });
export const renderQueue = new Queue("render", { connection: redis });
