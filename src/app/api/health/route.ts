import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { redis } from '@/lib/queue/connection'
import { env } from '@/lib/env'

export const dynamic = 'force-dynamic'

export async function GET(req?: Request) {
  // Check if caller has a valid metrics token for detailed info
  const authHeader = req?.headers.get("authorization");
  const hasValidToken = env.METRICS_TOKEN && authHeader === `Bearer ${env.METRICS_TOKEN}`;

  // Public response: just status
  if (!hasValidToken) {
    return NextResponse.json({ status: "ok" });
  }

  // Detailed response for authenticated callers
  const checks: Record<string, { status: 'ok' | 'error'; latencyMs?: number; error?: string }> = {}

  // DB check
  const dbStart = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = { status: 'ok', latencyMs: Date.now() - dbStart }
  } catch (err) {
    checks.database = { status: 'error', error: String(err) }
  }

  // Redis check
  const redisStart = Date.now()
  try {
    await redis.ping()
    checks.redis = { status: 'ok', latencyMs: Date.now() - redisStart }
  } catch (err) {
    checks.redis = { status: 'error', error: String(err) }
  }

  const allHealthy = Object.values(checks).every(c => c.status === 'ok')
  return NextResponse.json(
    {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
      version: process.env.npm_package_version ?? 'unknown',
    },
    { status: allHealthy ? 200 : 503 }
  )
}
