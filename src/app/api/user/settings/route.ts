import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/server/api/response";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const updateSettingsSchema = z.object({
  aiApiKey: z.string().optional().nullable(),
  aiBaseUrl: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : v))
    .refine((v) => v === null || v === undefined || /^https?:\/\/.+/.test(v), {
      message: "Base URL must be a valid http/https URL",
    }),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { aiApiKey: true, aiBaseUrl: true },
  });
  if (!user) return apiError("User not found", 404);

  return apiSuccess({
    aiApiKey: user.aiApiKey ? "***" + user.aiApiKey.slice(-4) : null,
    aiBaseUrl: user.aiBaseUrl,
    hasApiKey: !!user.aiApiKey,
  });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  try {
    const body = await req.json();
    const data = updateSettingsSchema.parse(body);

    const updated = await prisma.user.upsert({
      where: { id: session.user.id },
      create: {
        id: session.user.id,
        email: session.user.email ?? "",
        aiApiKey: data.aiApiKey === "" ? null : (data.aiApiKey ?? null),
        aiBaseUrl: data.aiBaseUrl ?? null,
      },
      update: {
        aiApiKey: data.aiApiKey === "" ? null : (data.aiApiKey ?? null),
        aiBaseUrl: data.aiBaseUrl ?? null,
      },
      select: { aiApiKey: true, aiBaseUrl: true },
    });

    return apiSuccess({
      aiApiKey: updated.aiApiKey ? "***" + updated.aiApiKey.slice(-4) : null,
      aiBaseUrl: updated.aiBaseUrl,
      hasApiKey: !!updated.aiApiKey,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0].message);
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error("[PUT /api/user/settings] error:", message);
    return apiError(`Internal server error: ${message}`, 500);
  }
}
