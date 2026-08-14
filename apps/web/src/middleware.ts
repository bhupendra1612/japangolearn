import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { courseCatalogEnabled, teacherStudioEnabled } from "@/lib/marketplace";

/**
 * Marketplace paths, blocked at the edge while the feature is deferred.
 *
 * The in-route guards call notFound(), which renders the not-found page but
 * still answers 200 — a soft 404 that search engines may index. Rewriting here
 * produces a real 404, and because a server action posts to its own page path,
 * it also blocks the actions rather than only the pages.
 */
const gatedPrefixes = [
  ...(courseCatalogEnabled ? [] : ["/courses", "/dashboard/courses"]),
  ...(teacherStudioEnabled ? [] : ["/dashboard/teacher"]),
];

function isGated(pathname: string) {
  return gatedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function middleware(request: NextRequest) {
  if (isGated(request.nextUrl.pathname)) {
    return NextResponse.rewrite(new URL("/not-found", request.url), { status: 404 });
  }

  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
