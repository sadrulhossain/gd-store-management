"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { Envelope, PermissionGroup, Role } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";
import { usePermission } from "@/lib/permissions";

export function useRoles(enabled = true) {
  return useQuery({
    queryKey: queryKeys.roles.list(),
    queryFn: async () => (await api.get<Envelope<Role[]>>("/roles")).data.data,
    enabled,
  });
}

export function useRole(id: number | string) {
  return useQuery({
    queryKey: queryKeys.roles.detail(id),
    queryFn: async () => (await api.get<Envelope<Role>>(`/roles/${id}`)).data.data,
  });
}

export function usePermissionGroups() {
  return useQuery({
    queryKey: queryKeys.permissions.all,
    queryFn: async () => (await api.get<Envelope<PermissionGroup[]>>("/permissions")).data.data,
    staleTime: 5 * 60_000,
  });
}

export interface RolePayload {
  name?: string;
  permissions?: string[];
}

export function useSaveRole(id?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RolePayload) =>
      (id
        ? await api.put<Envelope<Role>>(`/roles/${id}`, payload)
        : await api.post<Envelope<Role>>("/roles", payload)
      ).data.data,
    meta: { silent: true },
    onSuccess: () => {
      // Permissions changed: the cached /auth/me of the current user may be stale too.
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/roles/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.roles.all }),
  });
}

const SYSTEM_ROLE_ORDER = ["owner", "manager", "employee"];

/**
 * Roles the signed-in user may hand out. Mirrors the API rule (the API enforces it):
 * an Owner may assign any role; a Manager only Employee; others none.
 */
export function useAssignableRoles(): { roles: string[]; isLoading: boolean } {
  const { role } = usePermission();
  const owner = role === "owner";
  const all = useRoles(owner);

  if (owner) {
    const names = (all.data ?? []).map((item) => item.name);
    const sorted = [...names].sort((a, b) => {
      const ai = SYSTEM_ROLE_ORDER.indexOf(a);
      const bi = SYSTEM_ROLE_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.localeCompare(b);
    });

    return { roles: sorted, isLoading: all.isLoading };
  }

  return { roles: role === "manager" ? ["employee"] : [], isLoading: false };
}
