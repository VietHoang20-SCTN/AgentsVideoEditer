import { NextRequest, NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Edge-safe auth handler — no Prisma, no Node.js-only modules.
const { auth } = NextAuth(authConfig);

export async function proxy(request: NextRequest) {
  const start = Date.now();

  // Read or generate a request ID for tracing
  const requestId =
    request.headers.get("x-request-id") ?? crypto.randomUUID();

  // Clone request with request-id set so downstream handlers can read it
  const requestWithId = new NextRequest(request, {
    headers: new Headers({
      ...Object.fromEntries(request.headers.entries()),
      "x-request-id": requestId,
    }),
  });

  // Run NextAuth session check for non-API routes
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");
  let response: NextResponse;

  if (!isApiRoute) {
    // Let NextAuth handle session-based redirects for page routes
    const authResponse = await auth(
      // @ts-expect-error NextAuth middleware signature accepts NextRequest
      requestWithId
    );
    response = (authResponse as NextResponse | null) ?? NextResponse.next();
  } else {
    response = NextResponse.next();
  }

  // Propagate tracing + timing headers on every response
  response.headers.set("x-request-id", requestId);
  response.headers.set("x-response-time", `${Date.now() - start}ms`);

  return response;
}

export const config = {
  matcher: [
    // API routes — request-id + response-time tracing
    "/api/:path*",
    // Page routes — also apply auth (mirrors original matcher logic)
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
