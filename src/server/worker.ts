import "dotenv/config";
import { logger } from "@/lib/logger";
import { startAnalysisWorker } from "@/server/jobs/analysis.job";
import { startPlanningWorker } from "@/server/jobs/planning.job";
import { startRenderWorker } from "@/server/jobs/render.job";

const log = logger.child({ module: "worker" });

log.info("Starting worker process...");

const analysisWorker = startAnalysisWorker();
const planningWorker = startPlanningWorker();
const renderWorker = startRenderWorker();

log.info("All workers started (analysis, planning, render), waiting for jobs...");

// Graceful shutdown
async function shutdown(signal: string) {
  log.info("Received shutdown signal, closing workers...", { signal });

  await Promise.all([
    analysisWorker.close(),
    planningWorker.close(),
    renderWorker.close(),
  ]);

  log.info("Workers closed, exiting");
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
