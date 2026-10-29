"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type {
  Envelope,
  PermissionFormData,
  PermissionGroup,
  PermissionItem,
  Role,
  RoleFormData,
} from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";

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

/** The Permissions page itself: the catalogue is its main data, not a dropdown list. */
export function usePermissionGroups() {
  return useQuery({
    queryKey: queryKeys.permissions.all,
    queryFn: async () => (await api.get<Envelope<PermissionGroup[]>>("/permissions")).data.data,
  });
}

/** GET /permissions/create, or /permissions/{id}/edit with the permission itself. */
export function usePermissionForm(id?: number) {
  return useQuery({
    queryKey: queryKeys.permissions.form(id),
    queryFn: async () =>
      (
        await api.get<Envelope<PermissionFormData>>(
          id ? `/permissions/${id}/edit` : "/permissions/create",
        )
      ).data.data,
    staleTime: 0,
  });
}

/** GET /roles/create, or /roles/{id}/edit with the role itself. */
export function useRoleForm(id?: number | string) {
  return useQuery({
    queryKey: queryKeys.roles.form(id),
    queryFn: async () =>
      (await api.get<Envelope<RoleFormData>>(id ? `/roles/${id}/edit` : "/roles/create")).data
        .data,
    staleTime: 0,
  });
}

export interface PermissionPayload {
  name?: string;
  module?: string;
  description?: string | null;
}

export function useSavePermission(id?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: PermissionPayload) =>
      (id
        ? await api.put<Envelope<PermissionItem>>(`/permissions/${id}`, payload)
        : await api.post<Envelope<PermissionItem>>("/permissions", payload)
      ).data.data,
    meta: { silent: true },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.all });
    },
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
