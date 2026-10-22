/** Server-side configuration. Never import this from client components. */

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return value.toLowerCase() === "true";
}

export const serverEnv = {
  /** Laravel API over the internal Docker network (through the gateway). */
  get apiUrl(): string {
    return (process.env.API_INTERNAL_URL ?? "http://store-nginx:8080/api/v1").replace(/\/+$/, "");
  },
  /** Cookies are `Secure` in production unless explicitly disabled. */
  get cookieSecure(): boolean {
    return readBoolean(process.env.COOKIE_SECURE, process.env.NODE_ENV === "production");
  },
  /** Must match the API's REFRESH_TOKEN_TTL_DAYS so the cookie outlives (never undercuts) the token. */
  get refreshTtlSeconds(): number {
    const days = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 14);
    return Math.max(1, Number.isFinite(days) ? days : 14) * 86_400;
  },
};
