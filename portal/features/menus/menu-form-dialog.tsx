"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useMenuForm, useSaveMenu } from "@/features/menus/api";
import { isApiError } from "@/lib/api/client";
import type { AdminMenu, MenuFormData } from "@/lib/api/types";
import { applyServerErrors, blankToNull } from "@/lib/forms";
import { MenuIcon } from "@/components/common/menu-icon";

const NONE = "none";

const schema = z.object({
  title: z.string().trim().min(1, "Enter a title.").max(100, "Use at most 100 characters."),
  key: z
    .string()
    .trim()
    .min(1, "Enter a key.")
    .max(100)
    .regex(
      /^[a-z0-9][a-z0-9._-]*$/,
      "Lowercase letters, numbers, dots, hyphens and underscores only.",
    ),
  path: z
    .string()
    .trim()
    .max(255)
    .regex(/^(\/[A-Za-z0-9/_\-[\]]*)?$/, "Start with / and use letters, numbers, - and _."),
  icon: z.string(),
  permission_name: z.string(),
  parent_id: z.string(),
  is_active: z.boolean(),
});

type Values = z.infer<typeof schema>;

export interface MenuDialogTarget {
  /** Item being edited; undefined when creating. */
  menu?: AdminMenu;
  /** Pre-selected parent when creating a child. */
  parentId?: number | null;
}

interface MenuFormDialogProps {
  target: MenuDialogTarget | null;
  onOpenChange: (open: boolean) => void;
}

export function MenuFormDialog({ target, onOpenChange }: MenuFormDialogProps) {
  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {/* Mounted per target so the form always starts from that item's values. */}
        {target && (
          <MenuFormLoader
            key={target.menu?.id ?? "new"}
            target={target}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** One request (create or edit) brings the item and every list the form shows. */
function MenuFormLoader({ target, onDone }: { target: MenuDialogTarget; onDone: () => void }) {
  const form = useMenuForm(target.menu?.id);

  if (form.isPending || form.isError) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>{target.menu ? "Edit menu item" : "New menu item"}</DialogTitle>
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

  return <MenuForm target={target} data={form.data} onDone={onDone} />;
}

function MenuForm({
  target,
  data,
  onDone,
}: {
  target: MenuDialogTarget;
  data: MenuFormData;
  onDone: () => void;
}) {
  const menu = data.menu;
  const editing = Boolean(menu);
  const isSystem = menu?.is_system ?? false;
  const save = useSaveMenu(menu?.id);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: menu?.title ?? "",
      key: menu?.key ?? "",
      path: menu?.path ?? "",
      icon: menu?.icon ?? NONE,
      permission_name: menu?.permission_name ?? NONE,
      parent_id: String(menu ? (menu.parent_id ?? NONE) : (target.parentId ?? NONE)),
      is_active: menu?.is_active ?? true,
    },
  });

  // A parent with children cannot become a child (the API allows two levels only).
  const canReparent = !menu || (menu.children ?? []).length === 0;

  const onSubmit = handleSubmit(async (values) => {
    try {
      await save.mutateAsync({
        title: values.title.trim(),
        icon: values.icon === NONE ? null : values.icon,
        is_active: values.is_active,
        // System items keep their identity; the API ignores these for them.
        ...(isSystem
          ? {}
          : {
              key: values.key.trim(),
              path: blankToNull(values.path),
              permission_name: values.permission_name === NONE ? null : values.permission_name,
              parent_id: values.parent_id === NONE ? null : Number(values.parent_id),
            }),
      });

      toast.success(editing ? "Menu item updated." : "Menu item created.");
      onDone();
    } catch (error) {
      const unmapped = applyServerErrors(error, setError, [
        "title",
        "key",
        "path",
        "icon",
        "permission_name",
        "parent_id",
      ]);
      const message =
        unmapped[0] ?? (isApiError(error) && !error.isValidation ? error.message : null);
      if (message) setError("root", { message });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>{editing ? "Edit menu item" : "New menu item"}</DialogTitle>
        <DialogDescription>
          {isSystem
            ? "Built-in item: you can change how it looks, not what it points to."
            : "Items appear in the sidebar for users who hold the linked permission."}
        </DialogDescription>
      </DialogHeader>

      {errors.root && (
        <p role="alert" className="rounded-lg bg-danger/12 px-3 py-2 text-sm text-danger">
          {errors.root.message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Title" htmlFor="menu-title" error={errors.title?.message} required>
          <Input
            {...fieldA11y("menu-title", errors.title?.message)}
            autoComplete="off"
            {...register("title")}
          />
        </FormField>
        <FormField
          label="Key"
          htmlFor="menu-key"
          error={errors.key?.message}
          hint={editing ? "Fixed after creation." : "Unique id, e.g. reports.sales"}
          required
        >
          <Input
            {...fieldA11y("menu-key", errors.key?.message)}
            disabled={editing}
            autoComplete="off"
            autoCapitalize="none"
            {...register("key")}
          />
        </FormField>
      </div>

      <FormField
        label="Path"
        htmlFor="menu-path"
        error={errors.path?.message}
        hint="Leave empty for a group heading."
      >
        <Input
          {...fieldA11y("menu-path", errors.path?.message)}
          disabled={isSystem}
          placeholder="/reports"
          autoComplete="off"
          {...register("path")}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Icon" htmlFor="menu-icon" error={errors.icon?.message}>
          <Controller
            control={control}
            name="icon"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="menu-icon" className="w-full">
                  <SelectValue placeholder="No icon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No icon</SelectItem>
                  {data.menu_icons.map((name) => {
                    return (
                      <SelectItem key={name} value={name}>
                        <MenuIcon icon={name} /> {name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>

        <FormField label="Parent" htmlFor="menu-parent" error={errors.parent_id?.message}>
          <Controller
            control={control}
            name="parent_id"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isSystem || !canReparent}
              >
                <SelectTrigger id="menu-parent" className="w-full">
                  <SelectValue placeholder="Top level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Top level</SelectItem>
                  {data.parents.map((parent) => (
                    <SelectItem key={parent.id} value={String(parent.id)}>
                      {parent.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
      </div>

      <FormField
        label="Required permission"
        htmlFor="menu-permission"
        error={errors.permission_name?.message}
        hint="Users without it will not see this item. Leave empty to show it to everyone."
      >
        <Controller
          control={control}
          name="permission_name"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} disabled={isSystem}>
              <SelectTrigger id="menu-permission" className="w-full">
                <SelectValue placeholder="Everyone" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value={NONE}>Everyone</SelectItem>
                {data.permissions.flatMap((group) =>
                  group.permissions.map((permission) => (
                    <SelectItem key={permission.name} value={permission.name}>
                      {permission.name}
                    </SelectItem>
                  )),
                )}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <Controller
        control={control}
        name="is_active"
        render={({ field }) => (
          <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <span className="text-sm font-medium">Active</span>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </label>
        )}
      />

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          {editing ? "Save changes" : "Create item"}
        </Button>
      </DialogFooter>
    </form>
  );
}
