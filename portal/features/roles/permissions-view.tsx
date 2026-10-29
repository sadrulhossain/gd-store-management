"use client";

import { PencilIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissionGroups } from "@/features/roles/api";
import {
  PermissionFormDialog,
  type PermissionDialogTarget,
} from "@/features/roles/permission-form-dialog";
import { Can } from "@/lib/permissions";

export function PermissionsView() {
  const groups = usePermissionGroups();
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<PermissionDialogTarget | null>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term || !groups.data) return groups.data ?? [];

    return groups.data
      .map((group) => ({
        ...group,
        permissions: group.permissions.filter(
          (permission) =>
            permission.name.toLowerCase().includes(term) ||
            (permission.description ?? "").toLowerCase().includes(term) ||
            group.label.toLowerCase().includes(term),
        ),
      }))
      .filter((group) => group.permissions.length > 0);
  }, [groups.data, query]);

  return (
    <>
      <PageHeader
        title="Permissions"
        description="Every permission the system knows about, grouped by module. Assign them to roles on the Roles page."
        actions={
          <Can permission="permissions.create">
            <Button onClick={() => setDialog({})}>
              <PlusIcon aria-hidden /> New permission
            </Button>
          </Can>
        }
      />

      <div className="relative max-w-sm">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter permissions"
          aria-label="Filter permissions"
          className="pl-9"
        />
      </div>

      {groups.isPending ? (
        <div className="grid gap-4 lg:grid-cols-2" aria-busy="true">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-40 w-full" />
          ))}
        </div>
      ) : groups.isError ? (
        <ErrorState message={groups.error.message} onRetry={() => groups.refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No permissions match" description="Try a different search term." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((group) => (
            <Card key={group.module}>
              <CardHeader>
                <CardTitle className="text-base">{group.label}</CardTitle>
                <CardDescription>{group.permissions.length} permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {group.permissions.map((permission) => (
                    <li
                      key={permission.name}
                      className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="text-sm">{permission.description}</span>
                      <span className="flex items-center gap-1">
                        <code className="text-xs text-muted-foreground">{permission.name}</code>
                        <Can permission="permissions.update">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit ${permission.name}`}
                            onClick={() => setDialog({ permission })}
                          >
                            <PencilIcon aria-hidden />
                          </Button>
                        </Can>
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PermissionFormDialog target={dialog} onOpenChange={(open) => !open && setDialog(null)} />
    </>
  );
}
