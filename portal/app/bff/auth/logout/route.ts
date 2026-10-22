import { NextResponse, type NextRequest } from "next/server";
import { callApi, forwardHeaders } from "@/lib/server/laravel";
import { refreshSession } from "@/lib/server/refresh";
import { clearSession, readSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/** Revokes the tokens at the API (best effort) and always clears the cookies. */
export async function POST(request: NextRequest) {
  const { access, refresh } = readSession(request);

  const revoke = (token: string) =>
    callApi("/auth/logout", { method: "POST", headers: forwardHeaders(request, token) });

  try {
    let token = access;

    // An expired access token cannot revoke itself; renew it first so the refresh token is revoked too.
    if (!token && refresh) token = (await refreshSession(refresh))?.access_token;

    if (token) {
      const result = await revoke(token);

      if (result.status === 401 && refresh) {
        const renewed = await refreshSession(refresh);
        if (renewed) await revoke(renewed.access_token);
      }
    }
  } catch {
    // The API being down must not trap the user in a signed-in state in this browser.
  }

  const response = NextResponse.json(
    { data: { message: "Logged out." } },
    { headers: { "Cache-Control": "no-store" } },
  );
  clearSession(response);

  return response;
}
