"use client";

import { PencilIcon, PlusIcon, ShieldIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DataTable, type Column } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { roleLabel } from "@/components/common/role-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDeleteRole, useRoles } from "@/features/roles/api";
import type { Role } from "@/lib/api/types";
import { Can, usePermission } from "@/lib/permissions";

export function RolesList() {
  const roles = useRoles();
  const remove = useDeleteRole();
  const { can } = usePermission();
  const [toDelete, setToDelete] = useState<Role | null>(null);

  const columns: Column<Role>[] = [
    {
      key: "name",
      header: "Role",
      cell: (role) => (
        <div className="flex items-center gap-2">
          <Link href={`/roles/${role.id}`} className="font-medium hover:underline">
            {roleLabel(role.name)}
          </Link>
          {role.is_system && <Badge variant="secondary">Built-in</Badge>}
        </div>
      ),
    },
    { key: "users", header: "Users", cell: (role) => role.users_count ?? 0 },
    { key: "permissions", header: "Permissions", cell: (role) => role.permissions_count ?? 0 },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      cell: (role) => {
        const deletable = !role.is_system && (role.users_count ?? 0) === 0;

        return (
          <div className="flex justify-end gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/roles/${role.id}`}>
                <PencilIcon aria-hidden /> {can("roles.update") ? "Edit" : "View"}
              </Link>
            </Button>
            {can("roles.delete") && (
              <Button
                variant="ghost"
                size="sm"
                className="text-danger hover:text-danger"
                disabled={!deletable}
                title={
                  role.is_system
                    ? "Built-in roles cannot be deleted."
                    : (role.users_count ?? 0) > 0
                      ? "Reassign this role's users first."
                      : undefined
                }
                onClick={() => setToDelete(role)}
                aria-label={`Delete ${role.name}`}
              >
                <Trash2Icon aria-hidden />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Roles"
        description="Roles group permissions. Every user has exactly one role."
        actions={
          <Can permission="roles.create">
            <Button asChild>
              <Link href="/roles/new">
                <PlusIcon aria-hidden /> New role
              </Link>
            </Button>
          </Can>
        }
      />

      <DataTable
        caption="Roles"
        columns={columns}
        rows={roles.data}
        rowKey={(role) => role.id}
        isLoading={roles.isPending}
        error={
          roles.isError ? (
            <ErrorState message={roles.error.message} onRetry={() => roles.refetch()} />
          ) : undefined
        }
        empty={
          <EmptyState
            icon={ShieldIcon}
            title="No roles"
            description="Create a role to group permissions."
          />
        }
        skeletonRows={3}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete role?"
        description={
          <>
            The <strong>{toDelete?.name}</strong> role will be removed. This cannot be undone.
          </>
        }
        confirmLabel="Delete role"
        destructive
        loading={remove.isPending}
        onConfirm={() =>
          toDelete &&
          remove.mutate(toDelete.id, {
            onSuccess: () => {
              toast.success("Role deleted.");
              setToDelete(null);
            },
          })
        }
      />
    </>
  );
}
