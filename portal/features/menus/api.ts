"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { AdminMenu, Envelope } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

export function useAdminMenus() {
  return useQuery({
    queryKey: queryKeys.menus.admin(),
    queryFn: async () => (await api.get<Envelope<AdminMenu[]>>("/menus")).data.data,
  });
}

export function useMenuIcons() {
  return useQuery({
    queryKey: queryKeys.menus.icons(),
    queryFn: async () => (await api.get<Envelope<string[]>>("/menus/icons")).data.data,
    staleTime: 10 * 60_000,
  });
}

export interface MenuPayload {
  parent_id?: number | null;
  key?: string;
  title?: string;
  icon?: string | null;
  path?: string | null;
  permission_name?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

/** Menus feed the sidebar via /auth/me, so every change refreshes both. */
function useInvalidateMenus() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.menus.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
  };
}

export function useSaveMenu(id?: number) {
  const invalidate = useInvalidateMenus();

  return useMutation({
    mutationFn: async (payload: MenuPayload) =>
      (id
        ? await api.put<Envelope<AdminMenu>>(`/menus/${id}`, payload)
        : await api.post<Envelope<AdminMenu>>("/menus", payload)
      ).data.data,
    meta: { silent: true },
    onSuccess: invalidate,
  });
}

export function useToggleMenu() {
  const invalidate = useInvalidateMenus();

  return useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) =>
      (await api.put<Envelope<AdminMenu>>(`/menus/${id}`, { is_active: active })).data.data,
    onSuccess: invalidate,
  });
}

export function useDeleteMenu() {
  const invalidate = useInvalidateMenus();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/menus/${id}`);
    },
    onSuccess: invalidate,
  });
}

export interface ReorderItem {
  id: number;
  parent_id: number | null;
  sort_order: number;
}

export function useReorderMenus() {
  const invalidate = useInvalidateMenus();

  return useMutation({
    mutationFn: async (items: ReorderItem[]) => {
      await api.put("/menus/reorder", { items });
    },
    onSuccess: invalidate,
  });
}
