-- CreateEnum (idempotent)
DO $$ BEGIN
  CREATE TYPE "StepStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'SKIPPED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- AlterTable: AnalysisReport — drop defaults first, then cast TEXT → StepStatus enum, then restore defaults
ALTER TABLE "AnalysisReport"
  ALTER COLUMN "transcriptStatus" DROP DEFAULT,
  ALTER COLUMN "scenesStatus" DROP DEFAULT,
  ALTER COLUMN "ocrStatus" DROP DEFAULT,
  ALTER COLUMN "audioStatus" DROP DEFAULT;

ALTER TABLE "AnalysisReport"
  ALTER COLUMN "transcriptStatus" TYPE "StepStatus" USING upper("transcriptStatus")::"StepStatus",
  ALTER COLUMN "scenesStatus" TYPE "StepStatus" USING upper("scenesStatus")::"StepStatus",
  ALTER COLUMN "ocrStatus" TYPE "StepStatus" USING upper("ocrStatus")::"StepStatus",
  ALTER COLUMN "audioStatus" TYPE "StepStatus" USING upper("audioStatus")::"StepStatus";

ALTER TABLE "AnalysisReport"
  ALTER COLUMN "transcriptStatus" SET DEFAULT 'PENDING'::"StepStatus",
  ALTER COLUMN "scenesStatus" SET DEFAULT 'PENDING'::"StepStatus",
  ALTER COLUMN "ocrStatus" SET DEFAULT 'PENDING'::"StepStatus",
  ALTER COLUMN "audioStatus" SET DEFAULT 'PENDING'::"StepStatus";

-- AlterTable: BackgroundJob — make queueJobId NOT NULL
ALTER TABLE "BackgroundJob"
  ALTER COLUMN "queueJobId" SET NOT NULL;

-- CreateIndex: unique constraint on queueJobId
CREATE UNIQUE INDEX "BackgroundJob_queueJobId_key" ON "BackgroundJob"("queueJobId");

-- AlterTable: User — add diskUsageBytes column
ALTER TABLE "User" ADD COLUMN "diskUsageBytes" BIGINT NOT NULL DEFAULT 0;
