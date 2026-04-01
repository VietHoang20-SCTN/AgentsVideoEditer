import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/server/api/response";
import { prisma } from "@/lib/db/prisma";

// GET - Return AI analysis data from the analysis report
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  try {
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
  } catch (error) {
    console.error("[GET /projects/:id/ai-analysis]", error);
    return apiError("Failed to fetch AI analysis", 500);
  }
}
