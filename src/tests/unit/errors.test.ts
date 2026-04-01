import { describe, it, expect, vi } from 'vitest'

// Mock next/server so NextResponse.json() works in node test environment
vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      }),
  },
}))

import { AppError, apiError, withErrorHandler } from '@/lib/api/errors'

describe('AppError', () => {
  it('stores message, statusCode, and code', () => {
    const err = new AppError('Forbidden', 403, 'FORBIDDEN')
    expect(err.message).toBe('Forbidden')
    expect(err.statusCode).toBe(403)
    expect(err.code).toBe('FORBIDDEN')
  })

  it('defaults to statusCode 500', () => {
    const err = new AppError('oops')
    expect(err.statusCode).toBe(500)
  })

  it('is an instance of Error', () => {
    const err = new AppError('test', 422)
    expect(err instanceof Error).toBe(true)
  })

  it('has name AppError', () => {
    const err = new AppError('test')
    expect(err.name).toBe('AppError')
  })

  it('code is optional and can be undefined', () => {
    const err = new AppError('test', 500)
    expect(err.code).toBeUndefined()
  })
})

describe('apiError', () => {
  it('returns response with correct HTTP status', async () => {
    const res = apiError('Not found', 404)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Not found')
  })

  it('defaults to status 500', async () => {
    const res = apiError('Server error')
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Server error')
  })

  it('includes code in body when provided', async () => {
    const res = apiError('Validation failed', 422, 'VALIDATION_ERROR')
    const body = await res.json()
    expect(body.code).toBe('VALIDATION_ERROR')
  })

  it('omits code from body when not provided', async () => {
    const res = apiError('Not found', 404)
    const body = await res.json()
    expect(body.code).toBeUndefined()
  })

  it('includes success: false in body', async () => {
    const res = apiError('error', 400)
    const body = await res.json()
    expect(body.success).toBe(false)
  })
})

describe('withErrorHandler', () => {
  it('passes through successful response', async () => {
    const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    const wrapped = withErrorHandler(handler)
    const res = await wrapped(new Request('http://localhost/api/test'), {})
    expect(res.status).toBe(200)
  })

  it('converts AppError to correct HTTP status', async () => {
    const handler = vi.fn().mockRejectedValue(new AppError('Forbidden', 403))
    const wrapped = withErrorHandler(handler)
    const res = await wrapped(new Request('http://localhost/api/test'), {})
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Forbidden')
  })

  it('converts AppError with code to response body with code', async () => {
    const handler = vi.fn().mockRejectedValue(new AppError('Not found', 404, 'NOT_FOUND'))
    const wrapped = withErrorHandler(handler)
    const res = await wrapped(new Request('http://localhost/api/test'), {})
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.code).toBe('NOT_FOUND')
  })

  it('handles statusCode-bearing non-AppError objects (e.g. OpenAINotConfiguredError)', async () => {
    const customErr = { message: 'Not configured', statusCode: 501 }
    const handler = vi.fn().mockRejectedValue(customErr)
    const wrapped = withErrorHandler(handler)
    const res = await wrapped(new Request('http://localhost/api/test'), {})
    expect(res.status).toBe(501)
    const body = await res.json()
    expect(body.error).toBe('Not configured')
  })

  it('returns 500 for unknown errors', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('unexpected failure'))
    const wrapped = withErrorHandler(handler)
    const res = await wrapped(new Request('http://localhost/api/test'), {})
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Internal server error')
  })
})
