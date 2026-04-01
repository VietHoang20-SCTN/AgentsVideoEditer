import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRegistry = {
  metrics: vi.fn(),
  contentType: 'text/plain; version=0.0.4; charset=utf-8',
}

vi.mock('@/lib/metrics', () => ({ registry: mockRegistry }))

describe('GET /api/metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns 200 with Prometheus text format', async () => {
    mockRegistry.metrics.mockResolvedValue(
      '# HELP http_requests_total Total HTTP requests\n# TYPE http_requests_total counter\nhttp_requests_total 42\n'
    )

    const { GET } = await import('@/app/api/metrics/route')
    const res = await GET()

    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain('# HELP')
    expect(text).toContain('# TYPE')
  })

  it('sets correct content-type header', async () => {
    mockRegistry.metrics.mockResolvedValue('# HELP test_metric A metric\n# TYPE test_metric gauge\n')

    const { GET } = await import('@/app/api/metrics/route')
    const res = await GET()

    const ct = res.headers.get('content-type') ?? ''
    expect(ct).toContain('text/plain')
  })

  it('content-type matches registry.contentType', async () => {
    mockRegistry.metrics.mockResolvedValue('# HELP test_metric A metric\n# TYPE test_metric gauge\n')

    const { GET } = await import('@/app/api/metrics/route')
    const res = await GET()

    const ct = res.headers.get('content-type') ?? ''
    expect(ct).toBe(mockRegistry.contentType)
  })

  it('response body contains metric values from registry', async () => {
    const metricsPayload =
      '# HELP job_queue_depth Current queue depth\n# TYPE job_queue_depth gauge\njob_queue_depth 7\n'
    mockRegistry.metrics.mockResolvedValue(metricsPayload)

    const { GET } = await import('@/app/api/metrics/route')
    const res = await GET()
    const text = await res.text()

    expect(text).toBe(metricsPayload)
  })
})
