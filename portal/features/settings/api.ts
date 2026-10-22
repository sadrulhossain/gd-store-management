"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { Envelope } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

/** Public store settings (name, currency, timezone, date format); available before sign-in. */
export function usePublicSettings() {
  return useQuery({
    queryKey: queryKeys.settings.public,
    queryFn: async () =>
      (await api.get<Envelope<Record<string, string | null>>>("/settings/public")).data.data,
    staleTime: 5 * 60_000,
    meta: { silent: true },
  });
}

export function useStoreName(): string {
  return usePublicSettings().data?.store_name || "Store Management";
}
