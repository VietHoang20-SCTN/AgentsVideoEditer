import { logger } from "@/lib/logger";

type RouteHandler = (req: Request, ctx: unknown) => Promise<Response>;

/**
 * Wraps a Next.js route handler to log request duration and status.
 *
 * Usage:
 *   export const POST = withTiming(async (request, ctx) => {
 *     // ...handler body...
 *   }, 'analyze')
 */
export function withTiming(handler: RouteHandler, routeName: string): RouteHandler {
  return async function (req: Request, ctx: unknown): Promise<Response> {
    const start = Date.now();
    try {
      const result = await handler(req, ctx);
      logger.info("API request completed", {
        route: routeName,
        durationMs: Date.now() - start,
        status: result?.status,
      });
      return result;
    } catch (err) {
      logger.error("API request failed", {
        route: routeName,
        durationMs: Date.now() - start,
        err: err instanceof Error ? { message: err.message, stack: err.stack } : String(err),
      });
      throw err;
    }
  };
}
