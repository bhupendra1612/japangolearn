// Next.js 16 deprecates `middleware.ts` in favour of `proxy.ts`, but `proxy`
// always runs on the Node.js runtime, which OpenNext Cloudflare only supports
// experimentally ("not officially maintained"). Keep the edge-runtime
// middleware until OpenNext supports Node proxy as stable.
import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
