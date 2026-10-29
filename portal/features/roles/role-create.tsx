"use client";

import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useRoleForm } from "@/features/roles/api";
import { RoleForm } from "@/features/roles/role-form";

export function RoleCreate() {
  const form = useRoleForm();

  return (
    <>
      <PageHeader title="New role" description="Name the role and choose its permissions." />
      {form.isPending ? (
        <Skeleton className="h-96 w-full" aria-busy="true" />
      ) : form.isError ? (
        <ErrorState message={form.error.message} onRetry={() => form.refetch()} />
      ) : (
        <RoleForm permissions={form.data.permissions} />
      )}
    </>
  );
}
