"use client";

import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserForm } from "@/features/users/api";
import { UserForm } from "@/features/users/user-form";

export function UserCreate() {
  const form = useUserForm();

  return (
    <>
      <PageHeader
        title="New user"
        description="Create an account and choose what they can access."
      />
      {form.isPending ? (
        <Skeleton className="h-96 w-full" aria-busy="true" />
      ) : form.isError ? (
        <ErrorState message={form.error.message} onRetry={() => form.refetch()} />
      ) : (
        <UserForm roles={form.data.roles} />
      )}
    </>
  );
}
