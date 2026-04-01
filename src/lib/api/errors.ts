import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function apiError(message: string, status = 500, code?: string) {
  return NextResponse.json(
    { success: false, error: message, ...(code ? { code } : {}) },
    { status }
  )
}

export function withErrorHandler(
  handler: (req: Request, ctx: any) => Promise<Response>
) {
  return async (req: Request, ctx: any): Promise<Response> => {
    try {
      return await handler(req, ctx)
    } catch (err) {
      if (err instanceof AppError) {
        return apiError(err.message, err.statusCode, err.code)
      }
      if (err && typeof err === 'object' && 'statusCode' in err) {
        return apiError((err as any).message, (err as any).statusCode)
      }
      logger.error({ err }, 'Unhandled API error')
      return apiError('Internal server error', 500)
    }
  }
}
