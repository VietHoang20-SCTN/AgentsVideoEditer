import { describe, it, expect, vi } from 'vitest'

// vi.hoisted ensures mockEnv is available when vi.mock factory is hoisted to the top
const mockEnv = vi.hoisted(() => ({
  OPENAI_API_KEY: undefined as string | undefined,
  DATABASE_URL: 'postgresql://localhost/test',
  REDIS_URL: 'redis://localhost:6379',
  NEXTAUTH_SECRET: 'test-secret',
  NEXTAUTH_URL: 'http://localhost:3000',
  UPLOAD_DIR: './uploads',
  FFMPEG_PATH: 'ffmpeg',
  FFPROBE_PATH: 'ffprobe',
  WORKER_ANALYSIS_CONCURRENCY: 1,
  WORKER_PLANNING_CONCURRENCY: 1,
  WORKER_RENDER_CONCURRENCY: 1,
  DISK_QUOTA_BYTES: 5368709120,
  STORAGE_PROVIDER: 'local' as const,
}))

// Mock @/lib/env BEFORE importing ai/index, because env.ts runs Zod at module load time.
vi.mock('@/lib/env', () => ({
  env: mockEnv,
}))

import { OpenAINotConfiguredError } from '@/lib/ai/index'

describe('OpenAINotConfiguredError', () => {
  it('is an instance of Error', () => {
    const err = new OpenAINotConfiguredError()
    expect(err instanceof Error).toBe(true)
  })

  it('has statusCode 501', () => {
    const err = new OpenAINotConfiguredError()
    expect(err.statusCode).toBe(501)
  })

  it('has name OpenAINotConfiguredError', () => {
    const err = new OpenAINotConfiguredError()
    expect(err.name).toBe('OpenAINotConfiguredError')
  })

  it('has descriptive message mentioning OPENAI_API_KEY', () => {
    const err = new OpenAINotConfiguredError()
    expect(err.message).toMatch(/OPENAI_API_KEY/i)
  })
})
