"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { AvatarUploader } from "@/components/common/avatar-uploader";
import { FormField, fieldA11y } from "@/components/common/form-field";
import { PasswordInput } from "@/components/common/password-input";
import { roleLabel } from "@/components/common/role-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useMe } from "@/features/auth/api";
import { useAssignableRoles } from "@/features/roles/api";
import { useSaveUser } from "@/features/users/api";
import {
  createUserSchema,
  editUserSchema,
  USER_FORM_FIELDS,
  type UserFormValues,
} from "@/features/users/user-schema";
import { isApiError } from "@/lib/api/client";
import type { User } from "@/lib/api/types";
import { applyServerErrors, blankToNull } from "@/lib/forms";

interface UserFormProps {
  /** Present when editing. */
  user?: User;
}

export function UserForm({ user }: UserFormProps) {
  const router = useRouter();
  const editing = Boolean(user);
  const me = useMe().data;
  const isSelf = editing && me?.user.id === user?.id;
  const assignable = useAssignableRoles();
  const save = useSaveUser(user?.id);

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,

    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(editing ? editUserSchema : createUserSchema) as Resolver<UserFormValues>,
    defaultValues: {
      name: user?.name ?? "",
      username: user?.username ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
      role: user?.role ?? "",
      password: "",
      is_active: user?.is_active ?? true,
      must_change_password: user?.must_change_password ?? true,
      avatar: null,
      removeAvatar: false,
    },
  });

  const watchedName = useWatch({ control, name: "name" });
  const watchedRemoved = useWatch({ control, name: "removeAvatar" });

  // Keep the user's current role selectable even if the actor could not assign it.
  const roleOptions = Array.from(
    new Set([...(user?.role ? [user.role] : []), ...assignable.roles]),
  );

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await save.mutateAsync({
        name: values.name.trim(),
        username: values.username.trim(),
        email: blankToNull(values.email),
        phone: blankToNull(values.phone),
        role: values.role,
        ...(editing ? {} : { password: values.password }),
        is_active: values.is_active,
        must_change_password: values.must_change_password,
        avatar: values.avatar,
        removeAvatar: values.removeAvatar,
      });

      toast.success(editing ? "User updated." : "User created.");
      router.push(`/users/${saved.id}`);
    } catch (error) {
      const unmapped = applyServerErrors(error, setError, USER_FORM_FIELDS);

      if (unmapped.length > 0) setError("root", { message: unmapped.join(" ") });
      else if (isApiError(error) && !error.isValidation)
        setError("root", { message: error.message });
      else if (!isApiError(error))
        setError("root", { message: "Something went wrong. Please try again." });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {errors.root && (
        <p role="alert" className="rounded-lg bg-danger/12 px-3 py-2 text-sm text-danger">
          {errors.root.message}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Basic details shown across the portal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Controller
            control={control}
            name="avatar"
            render={({ field }) => (
              <AvatarUploader
                name={watchedName}
                currentUrl={user?.avatar_url}
                file={field.value}
                removed={watchedRemoved}
                onFileChange={field.onChange}
                onRemovedChange={(removed) => setValue("removeAvatar", removed)}
                error={errors.avatar?.message}
              />
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Full name" htmlFor="name" error={errors.name?.message} required>
              <Input
                {...fieldA11y("name", errors.name?.message)}
                autoComplete="off"
                {...register("name")}
              />
            </FormField>
            <FormField
              label="Username"
              htmlFor="username"
              error={errors.username?.message}
              hint="Used to sign in. Not case-sensitive."
              required
            >
              <Input
                {...fieldA11y("username", errors.username?.message)}
                autoComplete="off"
                autoCapitalize="none"
                {...register("username")}
              />
            </FormField>
            <FormField label="Email" htmlFor="email" error={errors.email?.message}>
              <Input
                {...fieldA11y("email", errors.email?.message)}
                type="email"
                autoComplete="off"
                {...register("email")}
              />
            </FormField>
            <FormField label="Phone" htmlFor="phone" error={errors.phone?.message}>
              <Input
                {...fieldA11y("phone", errors.phone?.message)}
                type="tel"
                autoComplete="off"
                {...register("phone")}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Access</CardTitle>
          <CardDescription>The role decides what this person can see and do.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Role"
              htmlFor="role"
              error={errors.role?.message}
              hint={isSelf ? "You cannot change your own role." : undefined}
              required
            >
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSelf || assignable.isLoading}
                  >
                    <SelectTrigger {...fieldA11y("role", errors.role?.message)} className="w-full">
                      <SelectValue placeholder="Choose a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((name) => (
                        <SelectItem
                          key={name}
                          value={name}
                          disabled={!assignable.roles.includes(name)}
                        >
                          {roleLabel(name)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            {!editing && (
              <FormField
                label="Temporary password"
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
            )}
          </div>

          <div className="space-y-3">
            <Controller
              control={control}
              name="is_active"
              render={({ field }) => (
                <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <span>
                    <span className="block text-sm font-medium">Active</span>
                    <span className="block text-sm text-muted-foreground">
                      {isSelf
                        ? "You cannot deactivate yourself."
                        : "Inactive users cannot sign in."}
                    </span>
                  </span>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSelf}
                  />
                </label>
              )}
            />
            <Controller
              control={control}
              name="must_change_password"
              render={({ field }) => (
                <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <span>
                    <span className="block text-sm font-medium">
                      Require password change at next sign-in
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      Recommended for new accounts and after resets.
                    </span>
                  </span>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </label>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          {editing ? "Save changes" : "Create user"}
        </Button>
      </div>
    </form>
  );
}
