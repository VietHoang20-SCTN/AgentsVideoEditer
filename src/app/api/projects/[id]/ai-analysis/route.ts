import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/server/api/response";
import { prisma } from "@/lib/db/prisma";
import { withTiming } from "@/lib/api/with-timing";
import { withErrorHandler } from "@/lib/api/errors";

// GET - Return AI analysis data from the analysis report
async function handleGET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const { id: projectId } = await params;

  // Verify project exists and belongs to user
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  });

  if (!project) return apiError("Project not found", 404);

  // Get the analysis report
  const report = await prisma.analysisReport.findUnique({
    where: { projectId },
    select: {
      aiAnalysisJson: true,
      aiAnalysisStatus: true,
    },
  });

  if (!report) {
    return apiError("Analysis report not found. Run analysis first.", 404);
  }

  return apiSuccess({
    status: report.aiAnalysisStatus,
    data: report.aiAnalysisJson ?? null,
  });
}

export const GET = withTiming(
  withErrorHandler(handleGET as Parameters<typeof withTiming>[0]),
  "ai-analysis-get"
);
