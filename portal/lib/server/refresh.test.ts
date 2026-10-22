import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { refreshSession, resetRefreshFlights } from "@/lib/server/refresh";

const tokens = { access_token: "new-access", refresh_token: "new-refresh", expires_in: 900 };

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("refreshSession()", () => {
  beforeEach(() => resetRefreshFlights());
  afterEach(() => vi.unstubAllGlobals());

  it("calls the API once for concurrent requests spending the same refresh token", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { data: tokens }));
    vi.stubGlobal("fetch", fetchMock);

    const results = await Promise.all(
      Array.from({ length: 8 }, () => refreshSession("old-refresh")),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    for (const result of results) expect(result).toEqual(tokens);
  });

  it("lets a late request carrying the already-rotated token reuse the result", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { data: tokens }));
    vi.stubGlobal("fetch", fetchMock);

    await refreshSession("old-refresh");
    const late = await refreshSession("old-refresh");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(late).toEqual(tokens);
  });

  it("refreshes separately for different refresh tokens", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { data: tokens }));
    vi.stubGlobal("fetch", fetchMock);

    await Promise.all([refreshSession("a"), refreshSession("b")]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("sends the refresh token to the API's refresh endpoint", async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
      jsonResponse(200, { data: tokens }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await refreshSession("spent-token");

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/auth\/refresh$/);
    expect(JSON.parse(String(init?.body))).toEqual({ refresh_token: "spent-token" });
  });

  it("returns null when the API rejects the refresh token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(401, { code: "invalid_refresh_token" })),
    );

    await expect(refreshSession("revoked")).resolves.toBeNull();
  });

  it("throws on a server error so the session is kept", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(500, { message: "boom" })),
    );

    await expect(refreshSession("any")).rejects.toThrow(/500/);
  });

  it("does not cache a transport failure: the next attempt calls the API again", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(jsonResponse(200, { data: tokens }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(refreshSession("retry-me")).rejects.toThrow("network down");
    await expect(refreshSession("retry-me")).resolves.toEqual(tokens);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
