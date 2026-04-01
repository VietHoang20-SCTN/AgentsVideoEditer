import { describe, it, expect, vi, beforeEach } from 'vitest'
import { rateLimit } from '@/lib/rate-limit'
import type { RateLimitResult } from '@/lib/rate-limit'

// Mock ioredis client
const mockRedis = {
  incr: vi.fn(),
  expire: vi.fn(),
}

describe('rateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows request when under limit', async () => {
    mockRedis.incr.mockResolvedValue(1)
    mockRedis.expire.mockResolvedValue(1)

    const result: RateLimitResult = await rateLimit(
      mockRedis as any,
      'ratelimit:user1:upload',
      10,
      60
    )

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(9)
    expect(result.resetAt).toBeGreaterThan(Math.floor(Date.now() / 1000))
  })

  it('allows request exactly at the limit', async () => {
    mockRedis.incr.mockResolvedValue(10)
    mockRedis.expire.mockResolvedValue(1)

    const result = await rateLimit(mockRedis as any, 'ratelimit:user1:upload', 10, 60)

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(0)
  })

  it('blocks request when over limit', async () => {
    mockRedis.incr.mockResolvedValue(11)
    // count > 1, so expire is not called

    const result = await rateLimit(mockRedis as any, 'ratelimit:user1:upload', 10, 60)

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('blocks request when well over limit', async () => {
    mockRedis.incr.mockResolvedValue(100)

    const result = await rateLimit(mockRedis as any, 'ratelimit:user1:upload', 10, 60)

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('calls expire only on first request (count === 1)', async () => {
    mockRedis.incr.mockResolvedValue(1)
    mockRedis.expire.mockResolvedValue(1)

    await rateLimit(mockRedis as any, 'ratelimit:user1:upload', 10, 60)

    expect(mockRedis.expire).toHaveBeenCalledTimes(1)
    expect(mockRedis.expire).toHaveBeenCalledWith('ratelimit:user1:upload', 60)
  })

  it('does NOT call expire on subsequent requests (count > 1)', async () => {
    mockRedis.incr.mockResolvedValue(3)

    await rateLimit(mockRedis as any, 'ratelimit:user1:upload', 10, 60)

    expect(mockRedis.expire).not.toHaveBeenCalled()
  })

  it('returns resetAt approximately windowSecs from now', async () => {
    mockRedis.incr.mockResolvedValue(1)
    mockRedis.expire.mockResolvedValue(1)

    const before = Math.floor(Date.now() / 1000)
    const result = await rateLimit(mockRedis as any, 'ratelimit:user1:upload', 10, 60)
    const after = Math.floor(Date.now() / 1000)

    expect(result.resetAt).toBeGreaterThanOrEqual(before + 60)
    expect(result.resetAt).toBeLessThanOrEqual(after + 60)
  })

  it('uses the key exactly as provided for incr', async () => {
    mockRedis.incr.mockResolvedValue(1)
    mockRedis.expire.mockResolvedValue(1)

    const key = 'ratelimit:someUser:someAction'
    await rateLimit(mockRedis as any, key, 5, 30)

    expect(mockRedis.incr).toHaveBeenCalledWith(key)
  })

  it('remaining is clamped to 0 when count exceeds limit', async () => {
    mockRedis.incr.mockResolvedValue(999)

    const result = await rateLimit(mockRedis as any, 'ratelimit:user1:upload', 10, 60)

    expect(result.remaining).toBe(0)
  })
})
