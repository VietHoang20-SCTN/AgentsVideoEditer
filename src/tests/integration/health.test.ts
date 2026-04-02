import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrismaInstance = { $queryRaw: vi.fn() }
const mockRedisInstance = { ping: vi.fn() }

vi.mock('@/lib/db/prisma', () => ({ prisma: mockPrismaInstance }))
vi.mock('@/lib/queue/connection', () => ({ redis: mockRedisInstance }))
vi.mock('@/lib/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://localhost/test',
    REDIS_URL: 'redis://localhost:6379',
    NEXTAUTH_SECRET: 'test-secret-that-is-at-least-32-chars!!',
    NEXTAUTH_URL: 'http://localhost:3000',
    UPLOAD_DIR: './uploads',
    OPENAI_API_KEY: undefined,
    AI_BASE_URL: undefined,
    AI_API_KEY: undefined,
    FFMPEG_PATH: 'ffmpeg',
    FFPROBE_PATH: 'ffprobe',
    WORKER_ANALYSIS_CONCURRENCY: 1,
    WORKER_PLANNING_CONCURRENCY: 1,
    WORKER_RENDER_CONCURRENCY: 1,
    DISK_QUOTA_BYTES: 5368709120,
    STORAGE_PROVIDER: 'local',
    METRICS_TOKEN: 'test-metrics-token',
  },
}))

// Helper: build an authenticated request for the health endpoint
function makeHealthRequest() {
  return new Request('http://localhost/api/health', {
    headers: { authorization: 'Bearer test-metrics-token' },
  })
}

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns 200 when DB and Redis are healthy', async () => {
    mockPrismaInstance.$queryRaw.mockResolvedValue([{ '?column?': 1 }])
    mockRedisInstance.ping.mockResolvedValue('PONG')

    const { GET } = await import('@/app/api/health/route')
    const res = await GET(makeHealthRequest())

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.checks.database.status).toBe('ok')
    expect(body.checks.redis.status).toBe('ok')
  })

  it('returns 503 and degraded status when DB fails', async () => {
    mockPrismaInstance.$queryRaw.mockRejectedValue(new Error('DB down'))
    mockRedisInstance.ping.mockResolvedValue('PONG')

    const { GET } = await import('@/app/api/health/route')
    const res = await GET(makeHealthRequest())

    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.status).toBe('degraded')
    expect(body.checks.database.status).toBe('error')
    expect(body.checks.redis.status).toBe('ok')
  })

  it('returns 503 and degraded status when Redis fails', async () => {
    mockPrismaInstance.$queryRaw.mockResolvedValue([{ '?column?': 1 }])
    mockRedisInstance.ping.mockRejectedValue(new Error('Redis down'))

    const { GET } = await import('@/app/api/health/route')
    const res = await GET(makeHealthRequest())

    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.status).toBe('degraded')
    expect(body.checks.database.status).toBe('ok')
    expect(body.checks.redis.status).toBe('error')
  })

  it('returns 503 when both DB and Redis fail', async () => {
    mockPrismaInstance.$queryRaw.mockRejectedValue(new Error('DB down'))
    mockRedisInstance.ping.mockRejectedValue(new Error('Redis down'))

    const { GET } = await import('@/app/api/health/route')
    const res = await GET(makeHealthRequest())

    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.status).toBe('degraded')
    expect(body.checks.database.status).toBe('error')
    expect(body.checks.redis.status).toBe('error')
  })

  it('includes timestamp and version fields', async () => {
    mockPrismaInstance.$queryRaw.mockResolvedValue([{ '?column?': 1 }])
    mockRedisInstance.ping.mockResolvedValue('PONG')

    const { GET } = await import('@/app/api/health/route')
    const res = await GET(makeHealthRequest())
    const body = await res.json()

    expect(body).toHaveProperty('timestamp')
    expect(body).toHaveProperty('version')
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp)
  })

  it('includes latencyMs for healthy checks', async () => {
    mockPrismaInstance.$queryRaw.mockResolvedValue([{ '?column?': 1 }])
    mockRedisInstance.ping.mockResolvedValue('PONG')

    const { GET } = await import('@/app/api/health/route')
    const res = await GET(makeHealthRequest())
    const body = await res.json()

    expect(typeof body.checks.database.latencyMs).toBe('number')
    expect(typeof body.checks.redis.latencyMs).toBe('number')
  })

  it('includes error string for failing checks', async () => {
    mockPrismaInstance.$queryRaw.mockRejectedValue(new Error('connection refused'))
    mockRedisInstance.ping.mockResolvedValue('PONG')

    const { GET } = await import('@/app/api/health/route')
    const res = await GET(makeHealthRequest())
    const body = await res.json()

    expect(typeof body.checks.database.error).toBe('string')
    expect(body.checks.database.error).toContain('connection refused')
  })
})
