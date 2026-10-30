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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {SettingPayload, useSaveSetting, useSettingForm} from "@/features/settings/api";
import { isApiError } from "@/lib/api/client";
import type { Setting, SettingFormData } from "@/lib/api/types";
import { applyServerErrors } from "@/lib/forms";

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
  value: z.string().trim().min(1, "Enter the value.").max(100, "Use at most 100 characters."),
  is_public: z.boolean(),
});

type Values = z.infer<typeof schema>;

export interface SettingDialogTarget {
  /** Item being edited; undefined when creating. */
  setting?: Setting;
}

interface SettingFormDialogProps {
  target: SettingDialogTarget | null;
  onOpenChange: (open: boolean) => void;
}

export function SettingFormDialog({ target, onOpenChange }: SettingFormDialogProps) {
  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {/* Mounted per target so the form always starts from that item's values. */}
        {target && (
          <SettingFormLoader
            key={target.setting?.id ?? "new"}
            target={target}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** One request (create or edit) brings the item and every list the form shows. */
function SettingFormLoader({ target, onDone }: { target: SettingDialogTarget; onDone: () => void }) {
  const form = useSettingForm(target.setting?.id);

  if (form.isPending || form.isError) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>{target.setting ? "Edit setting item" : "New setting item"}</DialogTitle>
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

  return <SettingForm target={target} data={form.data} onDone={onDone} />;
}

function SettingForm({
  target,
  data,
  onDone,
}: {
  target: SettingDialogTarget;
  data: SettingFormData;
  onDone: () => void;
}) {
  const setting = data.setting;
  const editing = Boolean(setting);
  const save = useSaveSetting(setting?.id);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: setting?.title ?? "",
      key: setting?.key ?? "",
      value: setting?.value ?? "",
      is_public: setting?.is_public ?? false,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await save.mutateAsync({
          title: values.title.trim(),
          key: values.key.trim(),
          value: values.value.trim(),
          is_public: values.is_public,
      } as SettingPayload);

      toast.success(editing ? "Setting item updated." : "Setting item created.");
      onDone();
    } catch (error) {
      const unmapped = applyServerErrors(error, setError, [
        "title",
        "key",
        "value",
        "is_public",
      ]);
      const message =
        unmapped[0] ?? (isApiError(error) && !error.isValidation ? error.message : null);
      if (message) setError("root", { message });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>{editing ? "Edit setting item" : "New setting item"}</DialogTitle>
        <DialogDescription>
            "Settings item: you can change the value, allow public view or make it private."
        </DialogDescription>
      </DialogHeader>

      {errors.root && (
        <p role="alert" className="rounded-lg bg-danger/12 px-3 py-2 text-sm text-danger">
          {errors.root.message}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        <FormField label="Title" htmlFor="setting-title" error={errors.title?.message} required>
          <Input
            {...fieldA11y("setting-title", errors.title?.message)}
            autoComplete="off"
            {...register("title")}
          />
        </FormField>
        <FormField
          label="Key"
          htmlFor="setting-key"
          error={errors.key?.message}
          hint={editing ? "Fixed after creation." : "Unique id, e.g. reports.sales"}
          required
        >
          <Input
            {...fieldA11y("setting-key", errors.key?.message)}
            disabled={editing}
            autoComplete="off"
            autoCapitalize="none"
            {...register("key")}
          />
        </FormField>
          <FormField label="Value" htmlFor="setting-value" error={errors.value?.message} required>
              <Input
                  {...fieldA11y("setting-value", errors.value?.message)}
                  autoComplete="off"
                  {...register("value")}
              />
          </FormField>
      </div>

      <Controller
        control={control}
        name="is_public"
        render={({ field }) => (
          <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <span className="text-sm font-medium">Public</span>
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
