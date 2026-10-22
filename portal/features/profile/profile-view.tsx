"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  AVATAR_MAX_BYTES,
  AVATAR_TYPES,
  AvatarUploader,
} from "@/components/common/avatar-uploader";
import { FormField, fieldA11y } from "@/components/common/form-field";
import { PageHeader } from "@/components/common/page-header";
import { RoleBadge } from "@/components/common/role-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMe, useUpdateProfile } from "@/features/auth/api";
import { ChangePasswordForm } from "@/features/auth/change-password-form";
import { isApiError } from "@/lib/api/client";
import type { AuthUser } from "@/lib/api/types";
import { applyServerErrors, blankToNull } from "@/lib/forms";

const schema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(255),
  email: z.string().trim().max(255).email("Enter a valid email address.").or(z.literal("")),
  phone: z
    .string()
    .trim()
    .max(32, "Use at most 32 characters.")
    .regex(/^[0-9+()\-\s]*$/, "Digits, spaces and + ( ) - only."),
  avatar: z
    .instanceof(File)
    .refine(
      (file) => (AVATAR_TYPES as readonly string[]).includes(file.type),
      "Use a JPEG, PNG or WebP image.",
    )
    .refine((file) => file.size <= AVATAR_MAX_BYTES, "The image must be 2 MB or smaller.")
    .nullable(),
  removeAvatar: z.boolean(),
});

type Values = z.infer<typeof schema>;

function ProfileForm({ user }: { user: AuthUser }) {
  const update = useUpdateProfile();
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,

    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user.name,
      email: user.email ?? "",
      phone: user.phone ?? "",
      avatar: null,
      removeAvatar: false,
    },
  });

  const watchedName = useWatch({ control, name: "name" });
  const watchedRemoved = useWatch({ control, name: "removeAvatar" });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await update.mutateAsync({
        name: values.name.trim(),
        email: blankToNull(values.email),
        phone: blankToNull(values.phone),
        avatar: values.avatar,
        removeAvatar: values.removeAvatar,
      });
      setValue("avatar", null);
      setValue("removeAvatar", false);
      toast.success("Profile updated.");
    } catch (error) {
      const unmapped = applyServerErrors(error, setError, ["name", "email", "phone", "avatar"]);
      if (unmapped.length > 0) setError("root", { message: unmapped.join(" ") });
      else if (!isApiError(error) || !error.isValidation) {
        setError("root", {
          message: isApiError(error) ? error.message : "Something went wrong. Please try again.",
        });
      }
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {errors.root && (
        <p role="alert" className="rounded-lg bg-danger/12 px-3 py-2 text-sm text-danger">
          {errors.root.message}
        </p>
      )}

      <Controller
        control={control}
        name="avatar"
        render={({ field }) => (
          <AvatarUploader
            name={watchedName}
            currentUrl={user.avatar_url}
            file={field.value}
            removed={watchedRemoved}
            onFileChange={field.onChange}
            onRemovedChange={(removed) => setValue("removeAvatar", removed)}
            error={errors.avatar?.message}
          />
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Full name" htmlFor="profile-name" error={errors.name?.message} required>
          <Input
            {...fieldA11y("profile-name", errors.name?.message)}
            autoComplete="name"
            {...register("name")}
          />
        </FormField>
        <FormField
          label="Username"
          htmlFor="profile-username"
          hint="Only an administrator can change this."
        >
          <Input id="profile-username" value={user.username} disabled readOnly />
        </FormField>
        <FormField label="Email" htmlFor="profile-email" error={errors.email?.message}>
          <Input
            {...fieldA11y("profile-email", errors.email?.message)}
            type="email"
            autoComplete="email"
            {...register("email")}
          />
        </FormField>
        <FormField label="Phone" htmlFor="profile-phone" error={errors.phone?.message}>
          <Input
            {...fieldA11y("profile-phone", errors.phone?.message)}
            type="tel"
            autoComplete="tel"
            {...register("phone")}
          />
        </FormField>
      </div>

      <Button type="submit" loading={update.isPending}>
        Save profile
      </Button>
    </form>
  );
}

export function ProfileView() {
  const me = useMe().data;

  if (!me) return <Skeleton className="h-96 w-full" />;

  return (
    <>
      <PageHeader
        title="My profile"
        description="Your details, photo and password."
        actions={<RoleBadge role={me.role} />}
      />

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                This is how you appear to other people in the portal.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm key={me.user.updated_at ?? me.user.id} user={me.user} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>Change password</CardTitle>
              <CardDescription>
                You will stay signed in here and be signed out on your other devices.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChangePasswordForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
