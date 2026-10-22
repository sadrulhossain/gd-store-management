import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, createApiClient, setUnauthorizedHandler, toApiError } from "@/lib/api/client";

function axiosFailure(
  status: number,
  data: unknown,
  headers: Record<string, string> = {},
  url = "/users",
) {
  const config = { url, headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
  return new AxiosError("failed", "ERR_BAD_REQUEST", config, null, {
    status,
    statusText: "",
    data,
    headers,
    config,
  });
}

describe("toApiError()", () => {
  it("keeps the API's message, code and field errors", () => {
    const error = toApiError(
      axiosFailure(422, {
        message: "Invalid.",
        code: "validation_failed",
        errors: { username: ["Taken."] },
      }),
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 422,
      code: "validation_failed",
      errors: { username: ["Taken."] },
    });
    expect(error.isValidation).toBe(true);
  });

  it("reads Retry-After for throttled requests", () => {
    const error = toApiError(
      axiosFailure(
        429,
        { message: "Slow down.", code: "too_many_requests" },
        { "retry-after": "42" },
      ),
    );

    expect(error.retryAfter).toBe(42);
  });

  it("describes a network failure without a status", () => {
    const error = toApiError(new AxiosError("Network Error", "ERR_NETWORK"));

    expect(error).toMatchObject({ status: 0, code: "network_error" });
  });
});

describe("api client 401 handling", () => {
  afterEach(() => setUnauthorizedHandler(null));

  async function failWith(status: number, url: string) {
    const client = createApiClient();
    client.defaults.adapter = () =>
      Promise.reject(axiosFailure(status, { message: "x", code: "x" }, {}, url));

    await client.get(url).catch(() => undefined);
  }

  it("triggers the global sign-out handler on a 401", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    await failWith(401, "/users");

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not sign out for a failed login (401 is expected there)", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    await failWith(401, "/auth/login");

    expect(handler).not.toHaveBeenCalled();
  });

  it("does not sign out for other errors", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    await failWith(403, "/users");
    await failWith(500, "/users");

    expect(handler).not.toHaveBeenCalled();
  });
});
