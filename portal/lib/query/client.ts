import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isApiError } from "@/lib/api/client";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      /** Skip the global error toast (the caller shows its own feedback). */
      silent?: boolean;
    };
    queryMeta: {
      silent?: boolean;
    };
  }
}

/**
 * Failures worth a toast. Validation errors belong next to their fields, and 401 is handled by the
 * global sign-out, so neither is toasted here.
 */
function notify(error: unknown): void {
  if (!isApiError(error)) {
    toast.error("Something went wrong. Please try again.");
    return;
  }
  if (error.status === 401 || error.isValidation) return;

  if (error.status === 403) {
    toast.error("You do not have permission to do that.", { id: "forbidden" });
    return;
  }

  toast.error(error.message, { id: `${error.status}:${error.code}` });
}

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (!query.meta?.silent) notify(error);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (!mutation.meta?.silent) notify(error);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Client errors will not heal on retry.
          if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
          return failureCount < 1;
        },
      },
    },
  });
}
