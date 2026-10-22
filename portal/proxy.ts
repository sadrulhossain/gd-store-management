import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, MUST_CHANGE_COOKIE, REFRESH_COOKIE } from "@/lib/auth/cookie-names";

/**
 * Route protection (Next.js 16 `proxy`, formerly `middleware`).
 *
 * This only looks at the presence of the session cookies to decide where a navigation should go.
 * It is a routing aid, not authorisation: the API validates every token and permission.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Development-only pages (the UI kit) do not exist in production: answer a real 404 for everyone,
  // signed in or not (a page-level notFound() would stream a "soft" 404 with status 200).
  if (
    process.env.NODE_ENV === "production" &&
    (pathname === "/dev" || pathname.startsWith("/dev/"))
  ) {
    return NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 });
  }

  const hasSession = request.cookies.has(REFRESH_COOKIE) || request.cookies.has(ACCESS_COOKIE);
  const mustChange = request.cookies.get(MUST_CHANGE_COOKIE)?.value === "1";

  const redirect = (to: string, withNext = false) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search =
      withNext && pathname !== "/" ? `?next=${encodeURIComponent(pathname + search)}` : "";
    return NextResponse.redirect(url);
  };

  if (!hasSession) {
    return pathname === "/login" ? NextResponse.next() : redirect("/login", true);
  }

  if (pathname === "/login") return redirect(mustChange ? "/change-password" : "/dashboard");
  if (mustChange && pathname !== "/change-password") return redirect("/change-password");
  if (!mustChange && pathname === "/change-password") return redirect("/dashboard");
  if (pathname === "/") return redirect("/dashboard");

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals, the BFF, uploads, health checks and files with an extension.
  matcher: ["/((?!_next/static|_next/image|bff|storage|healthz|.*\\..*).*)"],
};
