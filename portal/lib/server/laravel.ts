import type { NextRequest } from "next/server";
import { serverEnv } from "./env";

const REQUEST_TIMEOUT_MS = 30_000;

/** Headers worth forwarding to the API. Cookies and the Authorization header are never forwarded. */
export function forwardHeaders(request: NextRequest, accessToken?: string): Headers {
  const headers = new Headers({ Accept: "application/json" });

  for (const name of ["content-type", "accept-language", "user-agent"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  // The API throttles by client IP; pass along what the gateway recorded.
  const forwardedFor = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
  if (forwardedFor) headers.set("x-forwarded-for", forwardedFor);

  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);

  return headers;
}

export function callApi(path: string, init: RequestInit & { headers: Headers }): Promise<Response> {
  return fetch(`${serverEnv.apiUrl}${path}`, {
    ...init,
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

/** Response headers that are safe and useful to hand back to the browser. */
export function passthroughHeaders(response: Response): Headers {
  const headers = new Headers({ "Cache-Control": "no-store" });

  for (const name of ["content-type", "retry-after"]) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }

  return headers;
}

export function jsonError(status: number, code: string, message: string): Response {
  return Response.json({ message, code }, { status, headers: { "Cache-Control": "no-store" } });
}
