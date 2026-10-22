import { NextResponse, type NextRequest } from "next/server";
import { callApi, forwardHeaders, jsonError, passthroughHeaders } from "@/lib/server/laravel";
import { refreshSession } from "@/lib/server/refresh";
import { clearMustChange, clearSession, readSession, setSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/** Reachable without a session. */
const PUBLIC_PATHS = new Set(["settings/public"]);
/** Handled by dedicated route handlers (or internal only): never proxied blindly. */
const BLOCKED_PATHS = new Set(["auth/login", "auth/logout", "auth/refresh"]);
const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH", "DELETE"]);

type Context = RouteContext<"/bff/[...path]">;

/**
 * Catch-all proxy to the Laravel API. Adds the bearer token from the httpOnly cookie. On a 401 it
 * refreshes the session once (single-flight, see lib/server/refresh.ts) and replays the request;
 * if the refresh fails the cookies are cleared and the browser gets 401.
 */
async function proxy(request: NextRequest, context: Context): Promise<Response> {
  const { path } = await context.params;
  const target = path.map(encodeURIComponent).join("/");

  if (BLOCKED_PATHS.has(target)) {
    return jsonError(404, "not_found", "Resource not found.");
  }

  const isPublic = PUBLIC_PATHS.has(target);
  const { access, refresh } = readSession(request);

  // Buffered so the request can be replayed after a refresh (uploads are capped at a few MB).
  const body = METHODS_WITH_BODY.has(request.method) ? await request.arrayBuffer() : undefined;

  const send = (token?: string) =>
    callApi(`/${target}${request.nextUrl.search}`, {
      method: request.method,
      headers: forwardHeaders(request, token),
      body,
    });

  const unauthenticated = () => {
    const response = NextResponse.json(
      { message: "Unauthenticated.", code: "unauthenticated" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
    clearSession(response);
    return response;
  };

  try {
    let token = access;
    let renewed: Awaited<ReturnType<typeof refreshSession>> = null;

    // The access cookie expired in the browser: renew before calling the API.
    if (!token && refresh && !isPublic) {
      renewed = await refreshSession(refresh);
      if (!renewed) return unauthenticated();
      token = renewed.access_token;
    }

    if (!token && !isPublic) return unauthenticated();

    let upstream = await send(token);

    if (upstream.status === 401 && !isPublic) {
      if (!refresh || renewed) return unauthenticated();

      renewed = await refreshSession(refresh);
      if (!renewed) return unauthenticated();

      upstream = await send(renewed.access_token);
      // Still 401 with a fresh token: the account is no longer allowed in.
      if (upstream.status === 401) return unauthenticated();
    }

    const response = new NextResponse(upstream.body, {
      status: upstream.status,
      headers: passthroughHeaders(upstream),
    });

    if (renewed) setSession(response, renewed);
    if (target === "auth/password" && upstream.ok) clearMustChange(response);

    return response;
  } catch {
    return jsonError(502, "upstream_unavailable", "The server is unreachable. Please try again.");
  }
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
