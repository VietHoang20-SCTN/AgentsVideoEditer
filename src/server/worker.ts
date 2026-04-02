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

  const timeout = setTimeout(() => {
    log.error("Graceful shutdown timed out after 30s, forcing exit");
    process.exit(1);
  }, 30_000);

  try {
    await Promise.all([
      analysisWorker.close(),
      planningWorker.close(),
      renderWorker.close(),
    ]);
    clearTimeout(timeout);
    log.info("All workers shut down gracefully");
    process.exit(0);
  } catch (err) {
    clearTimeout(timeout);
    log.error("Error during shutdown", { error: err });
    process.exit(1);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
