import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/server/api/response";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return apiError("User not found", 404);

  const usedBytes = Number(user.diskUsageBytes);
  const quotaBytes = env.DISK_QUOTA_BYTES;
  const percentUsed = Math.round((usedBytes / quotaBytes) * 100);

  return apiSuccess({ usedBytes, quotaBytes, percentUsed });
}
