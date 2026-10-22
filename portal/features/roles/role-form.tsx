"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ErrorState } from "@/components/common/error-state";
import { FormField, fieldA11y } from "@/components/common/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissionGroups, useSaveRole } from "@/features/roles/api";
import { PermissionMatrix } from "@/features/roles/permission-matrix";
import { isApiError } from "@/lib/api/client";
import type { Role } from "@/lib/api/types";
import { applyServerErrors } from "@/lib/forms";
import { usePermission } from "@/lib/permissions";

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Use at least 2 characters.")
    .max(50, "Use at most 50 characters.")
    .regex(/^[a-z0-9][a-z0-9_-]*$/, "Lowercase letters, numbers, hyphens and underscores only."),
});

type Values = z.infer<typeof schema>;

interface RoleFormProps {
  /** Present when editing. */
  role?: Role;
}

export function RoleForm({ role }: RoleFormProps) {
  const router = useRouter();
  const { can } = usePermission();
  const groups = usePermissionGroups();
  const save = useSaveRole(role?.id);

  const isOwner = role?.name === "owner";
  const isSystem = role?.is_system ?? false;
  const canSave = role ? can("roles.update") : can("roles.create");

  const [selected, setSelected] = useState<Set<string>>(new Set(role?.permissions ?? []));
  const [rootError, setRootError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: role?.name ?? "" } });

  const onSubmit = handleSubmit(async (values) => {
    setRootError(null);

    try {
      const saved = await save.mutateAsync({
        ...(isSystem ? {} : { name: values.name }),
        ...(isOwner ? {} : { permissions: [...selected].sort() }),
      });

      toast.success(role ? "Role updated. Changes apply on the next request." : "Role created.");
      router.push(role ? "/roles" : `/roles/${saved.id}`);
    } catch (error) {
      const unmapped = applyServerErrors(error, setError, ["name"]);
      const permissionError = isApiError(error)
        ? Object.entries(error.errors).find(([key]) => key.startsWith("permissions"))?.[1][0]
        : undefined;

      setRootError(
        permissionError ??
          unmapped[0] ??
          (isApiError(error) && !error.isValidation ? error.message : null),
      );
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {rootError && (
        <p role="alert" className="rounded-lg bg-danger/12 px-3 py-2 text-sm text-danger">
          {rootError}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Role</CardTitle>
          <CardDescription>
            {isSystem
              ? "This is a built-in role. Its name is fixed."
              : "A short name, for example stock-keeper or cashier."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormField
            label="Name"
            htmlFor="role-name"
            error={errors.name?.message}
            required
            className="max-w-sm"
          >
            <Input
              {...fieldA11y("role-name", errors.name?.message)}
              disabled={isSystem}
              autoComplete="off"
              autoCapitalize="none"
              {...register("name")}
            />
          </FormField>
        </CardContent>
      </Card>

      <section aria-labelledby="permissions-heading" className="space-y-3">
        <div>
          <h2 id="permissions-heading" className="text-lg font-semibold">
            Permissions
          </h2>
          <p className="text-sm text-muted-foreground">
            {isOwner
              ? "The Owner role always has every permission and cannot be reduced."
              : `${selected.size} selected. Users with this role get exactly these permissions.`}
          </p>
        </div>

        {groups.isPending ? (
          <Skeleton className="h-64 w-full" aria-busy="true" />
        ) : groups.isError ? (
          <ErrorState message={groups.error.message} onRetry={() => groups.refetch()} />
        ) : (
          <PermissionMatrix
            groups={groups.data}
            selected={
              isOwner
                ? new Set(
                    groups.data.flatMap((group) =>
                      group.permissions.map((permission) => permission.name),
                    ),
                  )
                : selected
            }
            onChange={setSelected}
            disabled={isOwner || !canSave}
          />
        )}
      </section>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push("/roles")}>
          {canSave && !isOwner ? "Cancel" : "Back"}
        </Button>
        {canSave && !isOwner && (
          <Button type="submit" loading={save.isPending}>
            {role ? "Save changes" : "Create role"}
          </Button>
        )}
      </div>
    </form>
  );
}
