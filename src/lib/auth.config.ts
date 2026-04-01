import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible auth config.
 *
 * This file must NOT import anything that uses Node.js built-ins (Prisma,
 * bcryptjs, pg, etc.) because it is imported by middleware which runs in
 * the Edge Runtime.
 *
 * The full auth configuration (with PrismaAdapter and Credentials provider)
 * lives in src/lib/auth.ts and is only used in Node.js contexts (API routes,
 * server components, server actions).
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/register");
      const isDashboard =
        nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/projects");

      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      if (isDashboard && !isLoggedIn) {
        return Response.redirect(new URL("/login", nextUrl));
      }

      return true;
    },
  },
};
