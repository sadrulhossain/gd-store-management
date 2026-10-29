"use client";

import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { roleLabel } from "@/components/common/role-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRoleForm } from "@/features/roles/api";
import { RoleForm } from "@/features/roles/role-form";
import { isApiError } from "@/lib/api/client";

export function RoleEdit({ id }: { id: string }) {
  const form = useRoleForm(id);

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
        title={notFound ? "Role not found" : "Could not load this role"}
        message={notFound ? "This role does not exist." : form.error.message}
        onRetry={notFound ? undefined : () => form.refetch()}
      />
    );
  }

  const { role, permissions } = form.data;
  if (!role) return null;

  return (
    <>
      <PageHeader
        title={roleLabel(role.name)}
        description="Choose what people with this role may do."
      />
      <RoleForm key={role.updated_at ?? role.id} role={role} permissions={permissions} />
    </>
  );
}
