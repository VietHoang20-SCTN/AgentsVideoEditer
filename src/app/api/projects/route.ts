import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/server/api/response";
import { ProjectService } from "@/server/services/project.service";
import { createProjectSchema } from "@/lib/validators/project";
import { withTiming } from "@/lib/api/with-timing";
import { withErrorHandler } from "@/lib/api/errors";

async function handleGET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

  const result = await ProjectService.list(session.user.id, page, limit);
  return apiSuccess(result);
}

async function handlePOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const body = await req.json();
  const data = createProjectSchema.parse(body);
  const project = await ProjectService.create(session.user.id, data);
  return apiSuccess(project, 201);
}

export const GET = withTiming(
  withErrorHandler(handleGET as Parameters<typeof withTiming>[0]),
  "projects-list"
);

export const POST = withTiming(
  withErrorHandler(handlePOST as Parameters<typeof withTiming>[0]),
  "projects-create"
);
