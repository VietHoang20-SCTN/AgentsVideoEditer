import { registry } from '@/lib/metrics'
import { env } from '@/lib/env'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req?: Request) {
  if (env.METRICS_TOKEN) {
    const authHeader = req?.headers.get("authorization");
    if (authHeader !== `Bearer ${env.METRICS_TOKEN}`) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  const metrics = await registry.metrics()
  return new Response(metrics, { headers: { 'Content-Type': registry.contentType } })
}
