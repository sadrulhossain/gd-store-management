"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { StoreIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormField, fieldA11y } from "@/components/common/form-field";
import { PasswordInput } from "@/components/common/password-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLogin } from "@/features/auth/api";
import { useStoreName } from "@/features/settings/api";
import { isApiError } from "@/lib/api/client";
import { applyServerErrors } from "@/lib/forms";
import { safeNextPath } from "@/lib/routes";

const schema = z.object({
  username: z.string().trim().min(1, "Enter your username."),
  password: z.string().min(1, "Enter your password."),
});

type Values = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const storeName = useStoreName();
  const login = useLogin();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const me = await login.mutateAsync(values);
      router.replace(
        me.user.must_change_password ? "/change-password" : safeNextPath(search.get("next")),
      );
    } catch (error) {
      if (!isApiError(error)) {
        setError("root", { message: "Something went wrong. Please try again." });
        return;
      }

      if (error.isValidation) {
        applyServerErrors(error, setError, ["username", "password"]);
      } else if (error.status === 429) {
        const wait = error.retryAfter ? ` Try again in ${error.retryAfter} seconds.` : "";
        setError("root", { message: `Too many sign-in attempts.${wait}` });
      } else if (error.status === 401) {
        // Deliberately generic: the API does not reveal whether the username exists.
        setError("root", { message: "Incorrect username or password." });
      } else {
        setError("root", { message: error.message });
      }
    }
  });

  return (
    <Card className="w-full max-w-sm shadow-lg">
      <CardHeader className="items-center text-center justify-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <StoreIcon className="size-6" aria-hidden />
        </div>
      </CardHeader>
      <CardHeader className="items-center text-center justify-center">
        <CardTitle className="text-xl">{storeName}</CardTitle>
        <CardDescription>Sign in to continue</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {errors.root && (
            <p role="alert" className="rounded-lg bg-danger/12 px-3 py-2 text-sm text-danger">
              {errors.root.message}
            </p>
          )}

          <FormField label="Username" htmlFor="username" error={errors.username?.message} required>
            <Input
              {...fieldA11y("username", errors.username?.message)}
              autoComplete="username"
              autoCapitalize="none"
              autoFocus
              {...register("username")}
            />
          </FormField>

          <FormField label="Password" htmlFor="password" error={errors.password?.message} required>
            <PasswordInput
              {...fieldA11y("password", errors.password?.message)}
              autoComplete="current-password"
              {...register("password")}
            />
          </FormField>

          <Button type="submit" className="w-full" loading={login.isPending}>
            Sign in
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
