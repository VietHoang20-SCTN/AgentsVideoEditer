import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/server/api/response";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { withTiming } from "@/lib/api/with-timing";
import { withErrorHandler } from "@/lib/api/errors";

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

async function handleGET() {
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

async function handlePUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

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
}

export const GET = withTiming(
  withErrorHandler(handleGET as Parameters<typeof withTiming>[0]),
  "user-settings-get"
);

export const PUT = withTiming(
  withErrorHandler(handlePUT as Parameters<typeof withTiming>[0]),
  "user-settings-put"
);
