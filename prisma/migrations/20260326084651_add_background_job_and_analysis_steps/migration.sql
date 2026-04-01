-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('ANALYSIS', 'PLANNING', 'RENDER');

-- AlterTable
ALTER TABLE "AnalysisReport" ADD COLUMN     "audioStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "durationMs" INTEGER,
ADD COLUMN     "ocrStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "scenesStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "summaryJson" JSONB,
ADD COLUMN     "transcriptStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "BackgroundJob" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "queueJobId" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "stepResults" JSONB,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BackgroundJob_projectId_type_status_idx" ON "BackgroundJob"("projectId", "type", "status");

-- AddForeignKey
ALTER TABLE "BackgroundJob" ADD CONSTRAINT "BackgroundJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
