import { serverEnv } from "./env";
import type { Tokens } from "./session";

/**
 * Refresh tokens rotate: each one works exactly once. If several requests hit a 401 at the same
 * moment and each refreshed on its own, all but the first would fail and the user would be
 * signed out. So refreshes are single-flight, keyed by the refresh token being spent.
 *
 * The result is also kept for a short grace window: requests that were already in flight with the
 * old cookie (sent before the browser received the new one) reuse the same new tokens rather than
 * presenting a token that has just been revoked.
 *
 * Scope: one Node process (the portal runs a single instance). Behind several instances, replace
 * this map with a shared store.
 */
const GRACE_MS = 30_000;
const FAILURE_TTL_MS = 5_000;
const REQUEST_TIMEOUT_MS = 15_000;

interface Entry {
  promise: Promise<Tokens | null>;
  expiresAt: number;
}

const globalKey = "__storeRefreshFlights" as const;
const globals = globalThis as typeof globalThis & { [globalKey]?: Map<string, Entry> };
const flights = (globals[globalKey] ??= new Map<string, Entry>());

function purge(now: number): void {
  for (const [key, entry] of flights) {
    if (entry.expiresAt <= now) flights.delete(key);
  }
}

async function requestNewTokens(refreshToken: string): Promise<Tokens | null> {
  const response = await fetch(`${serverEnv.apiUrl}/auth/refresh`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
    // Without a deadline a dead keep-alive socket (e.g. after a long idle) would leave this promise
    // pending forever, and every later refresh with the same token would join it.
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (response.status === 401 || response.status === 422) return null;
  if (!response.ok) throw new Error(`Token refresh failed with status ${response.status}`);

  const { data } = (await response.json()) as { data: Tokens };
  return data;
}

/**
 * @returns the new tokens, or `null` when the refresh token is no longer valid.
 * @throws when the API is unreachable or errors (callers answer 502, keeping the session).
 */
export function refreshSession(refreshToken: string): Promise<Tokens | null> {
  const now = Date.now();
  purge(now);

  const existing = flights.get(refreshToken);
  if (existing) return existing.promise;

  const entry: Entry = { promise: Promise.resolve(null), expiresAt: Number.POSITIVE_INFINITY };
  entry.promise = requestNewTokens(refreshToken).then(
    (tokens) => {
      entry.expiresAt = Date.now() + (tokens ? GRACE_MS : FAILURE_TTL_MS);
      return tokens;
    },
    (error: unknown) => {
      // A transport failure must not poison later attempts.
      flights.delete(refreshToken);
      throw error;
    },
  );
  flights.set(refreshToken, entry);

  return entry.promise;
}

/** Test helper. */
export function resetRefreshFlights(): void {
  flights.clear();
}
