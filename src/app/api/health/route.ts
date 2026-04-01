import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { redis } from '@/lib/queue/connection'

export const dynamic = 'force-dynamic'

export async function GET() {
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
