"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormField, fieldA11y } from "@/components/common/form-field";
import { PasswordInput } from "@/components/common/password-input";
import { Button } from "@/components/ui/button";
import { useChangePassword } from "@/features/auth/api";
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from "@/features/auth/password-schema";
import { isApiError } from "@/lib/api/client";
import { applyServerErrors } from "@/lib/forms";

const FIELDS = ["current_password", "password", "password_confirmation"] as const;

interface ChangePasswordFormProps {
  onChanged?: () => void;
  submitLabel?: string;
}

/** Shared by the forced first-login screen and the profile page. */
export function ChangePasswordForm({
  onChanged,
  submitLabel = "Update password",
}: ChangePasswordFormProps) {
  const change = useChangePassword();

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current_password: "", password: "", password_confirmation: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await change.mutateAsync(values);
      toast.success("Password updated.");
      reset();
      onChanged?.();
    } catch (error) {
      const unmapped = applyServerErrors(error, setError, FIELDS);
      if (unmapped.length > 0) setError("root", { message: unmapped[0] });
      else if (!isApiError(error) || !error.isValidation) {
        setError("root", {
          message: isApiError(error) ? error.message : "Something went wrong. Please try again.",
        });
      }
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {errors.root && (
        <p role="alert" className="rounded-lg bg-danger/12 px-3 py-2 text-sm text-danger">
          {errors.root.message}
        </p>
      )}

      <FormField
        label="Current password"
        htmlFor="current_password"
        error={errors.current_password?.message}
        required
      >
        <PasswordInput
          {...fieldA11y("current_password", errors.current_password?.message)}
          autoComplete="current-password"
          {...register("current_password")}
        />
      </FormField>

      <FormField
        label="New password"
        htmlFor="password"
        error={errors.password?.message}
        hint="At least 8 characters, with a letter and a number."
        required
      >
        <PasswordInput
          {...fieldA11y("password", errors.password?.message)}
          autoComplete="new-password"
          {...register("password")}
        />
      </FormField>

      <FormField
        label="Confirm new password"
        htmlFor="password_confirmation"
        error={errors.password_confirmation?.message}
        required
      >
        <PasswordInput
          {...fieldA11y("password_confirmation", errors.password_confirmation?.message)}
          autoComplete="new-password"
          {...register("password_confirmation")}
        />
      </FormField>

      <Button type="submit" loading={change.isPending}>
        {submitLabel}
      </Button>
    </form>
  );
}
