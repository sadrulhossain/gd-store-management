import type { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, MUST_CHANGE_COOKIE, REFRESH_COOKIE } from "@/lib/auth/cookie-names";
import { serverEnv } from "./env";

export interface Tokens {
  access_token: string;
  refresh_token: string;
  /** Access token lifetime in seconds. */
  expires_in: number;
}

function baseOptions() {
  return {
    httpOnly: true,
    secure: serverEnv.cookieSecure,
    sameSite: "lax" as const,
    path: "/",
  };
}

export function readSession(request: NextRequest): { access?: string; refresh?: string } {
  return {
    access: request.cookies.get(ACCESS_COOKIE)?.value,
    refresh: request.cookies.get(REFRESH_COOKIE)?.value,
  };
}

/**
 * Store tokens in httpOnly cookies. The access cookie expires slightly before the token so the
 * BFF refreshes proactively instead of forwarding a token the API is about to reject.
 */
export function setSession(
  response: NextResponse,
  tokens: Tokens,
  mustChangePassword?: boolean,
): void {
  response.cookies.set(ACCESS_COOKIE, tokens.access_token, {
    ...baseOptions(),
    maxAge: Math.max(1, tokens.expires_in - 15),
  });
  response.cookies.set(REFRESH_COOKIE, tokens.refresh_token, {
    ...baseOptions(),
    maxAge: serverEnv.refreshTtlSeconds,
  });

  if (mustChangePassword === true) {
    response.cookies.set(MUST_CHANGE_COOKIE, "1", {
      ...baseOptions(),
      maxAge: serverEnv.refreshTtlSeconds,
    });
  } else if (mustChangePassword === false) {
    clearMustChange(response);
  }
}

export function clearMustChange(response: NextResponse): void {
  response.cookies.set(MUST_CHANGE_COOKIE, "", { ...baseOptions(), maxAge: 0 });
}

export function clearSession(response: NextResponse): void {
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, MUST_CHANGE_COOKIE]) {
    response.cookies.set(name, "", { ...baseOptions(), maxAge: 0 });
  }
}
