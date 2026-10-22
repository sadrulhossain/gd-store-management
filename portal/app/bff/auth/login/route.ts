import { NextResponse, type NextRequest } from "next/server";
import { callApi, forwardHeaders, jsonError, passthroughHeaders } from "@/lib/server/laravel";
import { setSession, type Tokens } from "@/lib/server/session";

export const dynamic = "force-dynamic";

interface LoginPayload extends Tokens {
  must_change_password: boolean;
}

/**
 * Exchanges credentials for tokens, keeps the tokens in httpOnly cookies and returns only the
 * signed-in user's profile (/auth/me) to the browser. Tokens never reach JavaScript.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();

  let login: Response;
  try {
    login = await callApi("/auth/login", {
      method: "POST",
      headers: forwardHeaders(request),
      body,
    });
  } catch {
    return jsonError(502, "upstream_unavailable", "The server is unreachable. Please try again.");
  }

  if (!login.ok) {
    return new NextResponse(login.body, {
      status: login.status,
      headers: passthroughHeaders(login),
    });
  }

  const { data } = (await login.json()) as { data: LoginPayload };

  let me: Response;
  try {
    me = await callApi("/auth/me", {
      method: "GET",
      headers: forwardHeaders(request, data.access_token),
    });
  } catch {
    return jsonError(502, "upstream_unavailable", "The server is unreachable. Please try again.");
  }

  const response = new NextResponse(me.body, {
    status: me.status,
    headers: passthroughHeaders(me),
  });

  if (me.ok) setSession(response, data, data.must_change_password);

  return response;
}
