"use client";

import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/features/users/api";
import { UserForm } from "@/features/users/user-form";
import { isApiError } from "@/lib/api/client";

export function UserEdit({ id }: { id: string }) {
  const user = useUser(id);

  if (user.isPending) {
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (user.isError) {
    const notFound = isApiError(user.error) && user.error.status === 404;

    return (
      <ErrorState
        title={notFound ? "User not found" : "Could not load this user"}
        message={notFound ? "This user does not exist or was deleted." : user.error.message}
        onRetry={notFound ? undefined : () => user.refetch()}
      />
    );
  }

  return (
    <>
      <PageHeader
        title={`Edit ${user.data.name}`}
        description="Change profile details, role and status."
      />
      {/* Keyed so the form resets if the record is refetched with different data. */}
      <UserForm key={user.data.updated_at ?? user.data.id} user={user.data} />
    </>
  );
}
