"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { Envelope, Paginated, User, UserFormData } from "@/lib/api/types";
import { queryKeys, type UserListParams } from "@/lib/query/keys";

export const USERS_PER_PAGE = 15;

export function useUsers(params: UserListParams) {
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: async () =>
      (
        await api.get<Paginated<User>>("/users", {
          params: {
            page: params.page ?? 1,
            per_page: params.perPage ?? USERS_PER_PAGE,
            "filter[search]": params.search || undefined,
            "filter[role]": params.role || undefined,
            "filter[status]": params.status || undefined,
            sort: params.sort || undefined,
          },
        })
      ).data,
    placeholderData: keepPreviousData,
  });
}

export function useUser(id: number | string) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: async () => (await api.get<Envelope<User>>(`/users/${id}`)).data.data,
  });
}

/** GET /users/create, or /users/{id}/edit with the user itself: the roles the actor may assign come along. */
export function useUserForm(id?: number | string) {
  return useQuery({
    queryKey: queryKeys.users.form(id),
    queryFn: async () =>
      (await api.get<Envelope<UserFormData>>(id ? `/users/${id}/edit` : "/users/create")).data
        .data,
    staleTime: 0,
  });
}

export interface UserFormPayload {
  name: string;
  username: string;
  email: string | null;
  phone: string | null;
  role: string;
  password?: string;
  is_active: boolean;
  must_change_password: boolean;
  avatar?: File | null;
  removeAvatar?: boolean;
}

/**
 * JSON normally; multipart when an avatar file is attached. PHP only parses multipart bodies on
 * POST, so updates with a file are sent as POST with a `_method=PUT` override (Laravel honours it).
 */
function requestFor(payload: UserFormPayload, method: "POST" | "PUT") {
  const { avatar, removeAvatar, ...fields } = payload;

  if (!avatar) {
    return {
      method,
      data: { ...fields, ...(removeAvatar ? { remove_avatar: true } : {}) } as unknown,
    };
  }

  const form = new FormData();
  if (method === "PUT") form.set("_method", "PUT");

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    form.set(key, typeof value === "boolean" ? (value ? "1" : "0") : (value ?? ""));
  }
  form.set("avatar", avatar);

  return { method: "POST" as const, data: form as unknown };
}

export function useSaveUser(id?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UserFormPayload) => {
      const { method, data } = requestFor(payload, id ? "PUT" : "POST");
      const url = id ? `/users/${id}` : "/users";

      return (await api.request<Envelope<User>>({ url, method, data })).data.data;
    },
    meta: { silent: true },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
  });
}

export function useSetUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) =>
      (await api.patch<Envelope<User>>(`/users/${id}/status`, { is_active: active })).data.data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
  });
}

export function useResetUserPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, password }: { id: number; password: string }) =>
      (await api.post<Envelope<User>>(`/users/${id}/reset-password`, { password })).data.data,
    meta: { silent: true },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
  });
}
