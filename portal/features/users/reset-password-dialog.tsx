"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FormField, fieldA11y } from "@/components/common/form-field";
import { PasswordInput } from "@/components/common/password-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { newPasswordSchema } from "@/features/auth/password-schema";
import { useResetUserPassword } from "@/features/users/api";
import type { User } from "@/lib/api/types";
import { applyServerErrors } from "@/lib/forms";

const schema = z.object({ password: newPasswordSchema });
type Values = z.infer<typeof schema>;

interface ResetPasswordDialogProps {
  user: User | null;
  onOpenChange: (open: boolean) => void;
}

/** Administrator password reset: the user must choose their own password at next sign-in. */
export function ResetPasswordDialog({ user, onOpenChange }: ResetPasswordDialogProps) {
  const reset = useResetUserPassword();
  const {
    register,
    handleSubmit,
    setError,
    reset: resetForm,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: "" } });

  const close = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!user) return;

    try {
      await reset.mutateAsync({ id: user.id, password: values.password });
      toast.success(`Password reset for ${user.name}. They must change it at next sign-in.`);
      close(false);
    } catch (error) {
      applyServerErrors(error, setError, ["password"]);
    }
  });

  return (
    <Dialog open={user !== null} onOpenChange={close}>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              Set a temporary password for <strong>{user?.name}</strong>. They will be signed out
              everywhere and asked to choose a new password at their next sign-in.
            </DialogDescription>
          </DialogHeader>

          <FormField
            label="Temporary password"
            htmlFor="reset-password"
            error={errors.password?.message}
            hint="At least 8 characters, with a letter and a number."
            required
          >
            <PasswordInput
              {...fieldA11y("reset-password", errors.password?.message)}
              autoComplete="new-password"
              {...register("password")}
            />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={reset.isPending}>
              Reset password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
