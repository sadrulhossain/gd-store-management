"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/lib/api/client";
import type { AuthUser, Envelope, Me } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/keys";
import { useAppDispatch } from "@/store/hooks";
import { sessionCleared, sessionLoaded } from "@/store/auth-slice";

export interface LoginValues {
  username: string;
  password: string;
}

export interface ChangePasswordValues {
  current_password: string;
  password: string;
  password_confirmation: string;
}

/** The signed-in user. Mirrors into the auth slice so guards and <Can> can read it synchronously. */
export function useMe() {
  const dispatch = useAppDispatch();

  const query = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: async () => (await api.get<Envelope<Me>>("/auth/me")).data.data,
    staleTime: 60_000,
    // A 401 is handled globally (sign-out); no retry noise.
    retry: false,
    meta: { silent: true },
  });

  useEffect(() => {
    if (query.data) dispatch(sessionLoaded(query.data));
  }, [query.data, dispatch]);

  return query;
}

export function useLogin() {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  return useMutation({
    mutationFn: async (values: LoginValues) =>
      (await api.post<Envelope<Me>>("/auth/login", values)).data.data,
    meta: { silent: true },
    onSuccess: (me) => {
      queryClient.setQueryData(queryKeys.auth.me, me);
      dispatch(sessionLoaded(me));
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      await api.post("/auth/logout");
    },
    meta: { silent: true },
    onSettled: () => {
      dispatch(sessionCleared());
      queryClient.clear();
      router.replace("/login");
    },
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: ChangePasswordValues) => {
      await api.put("/auth/password", values);
    },
    meta: { silent: true },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.auth.me }),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: {
      name: string;
      email: string | null;
      phone: string | null;
      avatar?: File | null;
      removeAvatar?: boolean;
    }) => {
      const form = new FormData();
      // Multipart + method override: PHP only parses multipart bodies on POST.
      form.set("_method", "PATCH");
      form.set("name", values.name);
      form.set("email", values.email ?? "");
      form.set("phone", values.phone ?? "");
      if (values.avatar) form.set("avatar", values.avatar);
      if (values.removeAvatar) form.set("remove_avatar", "1");

      return (await api.post<Envelope<AuthUser>>("/auth/profile", form)).data.data;
    },
    meta: { silent: true },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.auth.me }),
  });
}
