"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect, useState, type ReactNode } from "react";
import { Provider as ReduxProvider } from "react-redux";
import { Toaster } from "@/components/ui/sonner";
import { setUnauthorizedHandler } from "@/lib/api/client";
import { makeQueryClient } from "@/lib/query/client";
import { applyTheme, systemPrefersDark } from "@/lib/theme/apply";
import { makeStore } from "@/store";
import { useAppSelector } from "@/store/hooks";
import { sessionCleared } from "@/store/auth-slice";
import type { UiState } from "@/store/ui-slice";

interface ProvidersProps {
  children: ReactNode;
  /** Preferences read from cookies on the server, so the first render already matches. */
  initialUi: Partial<UiState>;
}

export function Providers({ children, initialUi }: ProvidersProps) {
  const [queryClient] = useState(makeQueryClient);
  const [store] = useState(() => makeStore(initialUi));

  useEffect(() => {
    // Global 401 handler: the BFF already tried (and failed) to refresh, so the session is over.
    setUnauthorizedHandler(() => {
      store.dispatch(sessionCleared());
      queryClient.clear();

      if (window.location.pathname !== "/login") {
        const next = window.location.pathname + window.location.search;
        // A full reload is deliberate: it drops every in-memory cache and store. This runs outside React.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = `/login?next=${encodeURIComponent(next)}`;
      }
    });

    return () => setUnauthorizedHandler(null);
  }, [queryClient, store]);

  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeSync />
        {children}
        <ThemedToaster />
        {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ReduxProvider>
  );
}

/** Follows the OS theme while the preference is "system". */
function ThemeSync() {
  const theme = useAppSelector((state) => state.ui.theme);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    query.addEventListener("change", onChange);

    return () => query.removeEventListener("change", onChange);
  }, [theme]);

  return null;
}

function ThemedToaster() {
  const theme = useAppSelector((state) => state.ui.theme);
  const resolved =
    theme === "system"
      ? typeof window !== "undefined" && systemPrefersDark()
        ? "dark"
        : "light"
      : theme;

  return <Toaster theme={resolved} position="top-right" richColors closeButton />;
}
