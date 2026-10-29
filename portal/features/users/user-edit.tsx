"use client";

import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserForm } from "@/features/users/api";
import { UserForm } from "@/features/users/user-form";
import { isApiError } from "@/lib/api/client";

export function UserEdit({ id }: { id: string }) {
  const form = useUserForm(id);

  if (form.isPending) {
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (form.isError) {
    const notFound = isApiError(form.error) && form.error.status === 404;

    return (
      <ErrorState
        title={notFound ? "User not found" : "Could not load this user"}
        message={notFound ? "This user does not exist or was deleted." : form.error.message}
        onRetry={notFound ? undefined : () => form.refetch()}
      />
    );
  }

  const { user, roles } = form.data;
  if (!user) return null;

  return (
    <>
      <PageHeader
        title={`Edit ${user.name}`}
        description="Change profile details, role and status."
      />
      {/* Keyed so the form resets if the record is refetched with different data. */}
      <UserForm key={user.updated_at ?? user.id} user={user} roles={roles} />
    </>
  );
}
