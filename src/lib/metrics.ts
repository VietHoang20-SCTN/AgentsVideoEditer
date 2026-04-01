import { Registry, collectDefaultMetrics, Gauge, Counter, Histogram } from 'prom-client'

export const registry = new Registry()
collectDefaultMetrics({ register: registry })

export const jobQueueDepth = new Gauge({
  name: 'xiaohuang_job_queue_depth',
  help: 'Current BullMQ queue depth',
  labelNames: ['queue'] as const,
  registers: [registry]
})

export const jobDuration = new Histogram({
  name: 'xiaohuang_job_duration_seconds',
  help: 'Job processing duration in seconds',
  labelNames: ['queue', 'status'] as const,
  buckets: [1, 5, 15, 30, 60, 120, 300],
  registers: [registry]
})

export const httpRequestsTotal = new Counter({
  name: 'xiaohuang_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'] as const,
  registers: [registry]
})
