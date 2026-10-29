"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ErrorState } from "@/components/common/error-state";
import { FormField, fieldA11y } from "@/components/common/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissionForm, useSavePermission } from "@/features/roles/api";
import { isApiError } from "@/lib/api/client";
import type { PermissionFormData, PermissionItem } from "@/lib/api/types";
import { applyServerErrors, blankToNull } from "@/lib/forms";

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a name.")
    .max(100, "Use at most 100 characters.")
    .regex(/^[a-z0-9_]+\.[a-z0-9_]+$/, "Use module.action, e.g. reports.export."),
  module: z
    .string()
    .trim()
    .min(1, "Enter a module.")
    .max(100)
    .regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers and underscores only."),
  description: z.string().trim().max(255, "Use at most 255 characters."),
});

type Values = z.infer<typeof schema>;

export interface PermissionDialogTarget {
  /** Permission being edited; undefined when creating. */
  permission?: PermissionItem;
  /** Pre-filled module when adding from a group. */
  module?: string;
}

interface PermissionFormDialogProps {
  target: PermissionDialogTarget | null;
  onOpenChange: (open: boolean) => void;
}

export function PermissionFormDialog({ target, onOpenChange }: PermissionFormDialogProps) {
  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {/* Mounted per target so the form always starts from that permission's values. */}
        {target && (
          <PermissionFormLoader
            key={target.permission?.id ?? "new"}
            target={target}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** One request (create or edit) brings the permission and the module list. */
function PermissionFormLoader({
  target,
  onDone,
}: {
  target: PermissionDialogTarget;
  onDone: () => void;
}) {
  const form = usePermissionForm(target.permission?.id);

  if (form.isPending || form.isError) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>{target.permission ? "Edit permission" : "New permission"}</DialogTitle>
          <DialogDescription className="sr-only">Loading the form.</DialogDescription>
        </DialogHeader>
        {form.isError ? (
          <ErrorState message={form.error.message} onRetry={() => form.refetch()} />
        ) : (
          <div className="space-y-4" aria-busy="true">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        )}
      </>
    );
  }

  return <PermissionForm target={target} data={form.data} onDone={onDone} />;
}

function PermissionForm({
  target,
  data,
  onDone,
}: {
  target: PermissionDialogTarget;
  data: PermissionFormData;
  onDone: () => void;
}) {
  const permission = data.permission;
  const editing = Boolean(permission);
  const save = useSavePermission(permission?.id);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: permission?.name ?? (target.module ? `${target.module}.` : ""),
      module: permission?.module ?? target.module ?? "",
      description: permission?.description ?? "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await save.mutateAsync({
        // The name is fixed after creation: routes, menus and roles refer to it.
        ...(editing ? {} : { name: values.name.trim() }),
        module: values.module.trim(),
        description: blankToNull(values.description),
      });

      toast.success(editing ? "Permission updated." : "Permission created.");
      onDone();
    } catch (error) {
      const unmapped = applyServerErrors(error, setError, ["name", "module", "description"]);
      const message =
        unmapped[0] ?? (isApiError(error) && !error.isValidation ? error.message : null);
      if (message) setError("root", { message });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>{editing ? "Edit permission" : "New permission"}</DialogTitle>
        <DialogDescription>
          {editing
            ? "You can change the module and description. The name is fixed."
            : "A new permission can be assigned to roles. Guard routes with it in code."}
        </DialogDescription>
      </DialogHeader>

      {errors.root && (
        <p role="alert" className="rounded-lg bg-danger/12 px-3 py-2 text-sm text-danger">
          {errors.root.message}
        </p>
      )}

      <FormField
        label="Name"
        htmlFor="permission-name"
        error={errors.name?.message}
        hint={editing ? "Fixed after creation." : "module.action, e.g. reports.export"}
        required
      >
        <Input
          {...fieldA11y("permission-name", errors.name?.message)}
          disabled={editing}
          autoComplete="off"
          autoCapitalize="none"
          {...register("name")}
        />
      </FormField>

      <FormField
        label="Module"
        htmlFor="permission-module"
        error={errors.module?.message}
        hint="Permissions are grouped by module."
        required
      >
        <Input
          {...fieldA11y("permission-module", errors.module?.message)}
          list="permission-modules"
          autoComplete="off"
          autoCapitalize="none"
          {...register("module")}
        />
        <datalist id="permission-modules">
          {data.modules.map((item) => (
            <option key={item.module} value={item.module}>
              {item.label}
            </option>
          ))}
        </datalist>
      </FormField>

      <FormField
        label="Description"
        htmlFor="permission-description"
        error={errors.description?.message}
      >
        <Input
          {...fieldA11y("permission-description", errors.description?.message)}
          autoComplete="off"
          {...register("description")}
        />
      </FormField>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          {editing ? "Save changes" : "Create permission"}
        </Button>
      </DialogFooter>
    </form>
  );
}
