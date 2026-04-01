import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/server/api/response";
import { ProjectService } from "@/server/services/project.service";
import { createProjectSchema } from "@/lib/validators/project";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const projects = await ProjectService.list(session.user.id);
  return apiSuccess(projects);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  try {
    const body = await req.json();
    const data = createProjectSchema.parse(body);
    const project = await ProjectService.create(session.user.id, data);
    return apiSuccess(project, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0].message);
    }
    console.error("[POST /api/projects] error:", error);
    return apiError("Internal server error", 500);
  }
}
