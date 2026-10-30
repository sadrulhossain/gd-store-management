"use client";

import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type {AdminMenu, Envelope, MenuFormData, Setting, SettingFormData} from "@/lib/api/types";
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

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings.list(),
    queryFn: async () => (await api.get<Envelope<Setting[]>>("/settings")).data.data,
  });
}

/** One call for the whole form: GET /settings/create, or /settings/{id}/edit with the item itself. */
export function useSettingForm(id?: number) {
  return useQuery({
    queryKey: queryKeys.settings.form(id),
    queryFn: async () =>
        (await api.get<Envelope<SettingFormData>>(id ? `/settings/${id}/edit` : "/settings/create")).data
            .data,
    staleTime: 0,
  });
}

export interface SettingPayload {
  title: string;
  key: string;
  value: string;
  is_public: boolean;
  public: string;
}

/** Settings feed the sidebar via /auth/me, so every change refreshes both. */
function useInvalidateSettings() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.settings.public });
  };
}

export function useSaveSetting(id?: number) {
  const invalidate = useInvalidateSettings();

  return useMutation({
    mutationFn: async (payload: SettingPayload) =>
        (id
                ? await api.put<Envelope<Setting>>(`/settings/${id}`, payload)
                : await api.post<Envelope<Setting>>("/settings", payload)
        ).data.data,
    meta: { silent: true },
    onSuccess: invalidate,
  });
}

export function useToggleSetting() {
  const invalidate = useInvalidateSettings();

  return useMutation({
    mutationFn: async ({ id, is_public }: { id: number; is_public: boolean }) =>
        (await api.put<Envelope<Setting>>(`/settings/${id}`, { is_public: is_public })).data.data,
    onSuccess: invalidate,
  });
}
