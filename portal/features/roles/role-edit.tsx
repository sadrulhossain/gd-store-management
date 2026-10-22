"use client";

import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { roleLabel } from "@/components/common/role-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRole } from "@/features/roles/api";
import { RoleForm } from "@/features/roles/role-form";
import { isApiError } from "@/lib/api/client";

export function RoleEdit({ id }: { id: string }) {
  const role = useRole(id);

  if (role.isPending) {
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (role.isError) {
    const notFound = isApiError(role.error) && role.error.status === 404;

    return (
      <ErrorState
        title={notFound ? "Role not found" : "Could not load this role"}
        message={notFound ? "This role does not exist." : role.error.message}
        onRetry={notFound ? undefined : () => role.refetch()}
      />
    );
  }

  return (
    <>
      <PageHeader
        title={roleLabel(role.data.name)}
        description="Choose what people with this role may do."
      />
      <RoleForm key={role.data.updated_at ?? role.data.id} role={role.data} />
    </>
  );
}
