import axios, { type AxiosError, type AxiosInstance } from "axios";
import type { FieldErrors } from "./types";

/** Normalised API failure, whatever the cause (HTTP error, validation, network). */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly errors: FieldErrors = {},
    readonly retryAfter: number | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isValidation(): boolean {
    return this.status === 422;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function errorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  return isApiError(error) || error instanceof Error ? error.message || fallback : fallback;
}

interface ErrorBody {
  message?: string;
  code?: string;
  errors?: FieldErrors;
}

export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;

  if (axios.isAxiosError(error)) {
    const response = (error as AxiosError<ErrorBody>).response;

    if (!response) {
      return new ApiError(
        "Cannot reach the server. Check your connection and try again.",
        0,
        "network_error",
      );
    }

    const body = response.data && typeof response.data === "object" ? response.data : {};
    const retry = Number(response.headers?.["retry-after"]);

    return new ApiError(
      body.message ?? "Request failed.",
      response.status,
      body.code ?? "error",
      body.errors ?? {},
      Number.isFinite(retry) && retry > 0 ? retry : null,
    );
  }

  return new ApiError(error instanceof Error ? error.message : "Unexpected error.", 0, "unknown");
}

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

/** Registered once by the app providers: clears client state and sends the user to /login. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

/** Requests whose 401 is an expected outcome and must not trigger the global sign-out. */
const SILENT_401 = ["/auth/login", "/auth/logout"];

export function createApiClient(): AxiosInstance {
  const instance = axios.create({
    baseURL: "/bff",
    headers: { Accept: "application/json" },
    timeout: 30_000,
  });

  instance.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      const apiError = toApiError(error);
      const url = axios.isAxiosError(error) ? (error.config?.url ?? "") : "";

      if (apiError.status === 401 && !SILENT_401.some((path) => url.startsWith(path))) {
        onUnauthorized?.();
      }

      return Promise.reject(apiError);
    },
  );

  return instance;
}

/** The browser only ever talks to the portal's own /bff routes. */
export const api = createApiClient();
