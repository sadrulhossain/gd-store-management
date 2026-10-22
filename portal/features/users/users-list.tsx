"use client";

import {
  KeyRoundIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DataTable, type Column } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { RoleBadge, roleLabel } from "@/components/common/role-badge";
import { UserAvatar } from "@/components/common/user-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchInput } from "@/components/common/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useMe } from "@/features/auth/api";
import { useRoles } from "@/features/roles/api";
import { useDeleteUser, useSetUserStatus, useUsers, USERS_PER_PAGE } from "@/features/users/api";
import { ResetPasswordDialog } from "@/features/users/reset-password-dialog";
import type { User } from "@/lib/api/types";
import { Can, usePermission } from "@/lib/permissions";

const ALL = "all";
const SYSTEM_ROLES = ["owner", "manager", "employee"];

function useUrlParams() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(search.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    // Any filter change returns to the first page.
    if (!("page" in changes)) next.delete("page");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return { search, update };
}

export function UsersList() {
  const { search: params, update } = useUrlParams();
  const { can } = usePermission();
  const me = useMe().data;

  const page = Math.max(1, Number(params.get("page")) || 1);
  const sort = params.get("sort") ?? "-created_at";
  const role = params.get("role") ?? "";
  const status = params.get("status") ?? "";
  const query = params.get("q") ?? "";

  // Bumped by "Clear" so the (uncontrolled-by-URL) search box remounts empty.
  const [searchKey, setSearchKey] = useState(0);
  const clearFilters = () => {
    setSearchKey((key) => key + 1);
    update({ q: null, role: null, status: null });
  };

  const users = useUsers({ page, search: query, role, status, sort });
  // The roles endpoint needs roles.view; managers fall back to the built-in roles.
  const roles = useRoles(can("roles.view"));
  const roleOptions = roles.data?.map((item) => item.name) ?? SYSTEM_ROLES;

  const setStatus = useSetUserStatus();
  const remove = useDeleteUser();
  const [toDelete, setToDelete] = useState<User | null>(null);
  const [toDeactivate, setToDeactivate] = useState<User | null>(null);
  const [toReset, setToReset] = useState<User | null>(null);

  const hasFilters = Boolean(query || role || status);

  const columns: Column<User>[] = [
    {
      key: "name",
      header: "User",
      sortKey: "name",
      cell: (user) => (
        <div className="flex items-center gap-3">
          <UserAvatar name={user.name} src={user.avatar_url} />
          <div className="min-w-0">
            <Link href={`/users/${user.id}`} className="block truncate font-medium hover:underline">
              {user.name}
            </Link>
            <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      className: "hidden md:table-cell",
      cell: (user) => (
        <div className="min-w-0 text-sm">
          <p className="truncate">
            {user.email ?? <span className="text-muted-foreground">—</span>}
          </p>
          <p className="truncate text-xs text-muted-foreground">{user.phone ?? ""}</p>
        </div>
      ),
    },
    { key: "role", header: "Role", cell: (user) => <RoleBadge role={user.role} /> },
    {
      key: "status",
      header: "Status",
      cell: (user) => {
        const isSelf = me?.user.id === user.id;

        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={user.is_active}
              disabled={!can("users.update") || setStatus.isPending || (isSelf && user.is_active)}
              aria-label={`${user.is_active ? "Deactivate" : "Activate"} ${user.name}`}
              onCheckedChange={(checked) => {
                if (checked)
                  setStatus.mutate(
                    { id: user.id, active: true },
                    { onSuccess: () => toast.success(`${user.name} activated.`) },
                  );
                else setToDeactivate(user);
              }}
            />
            <span className="hidden text-xs text-muted-foreground lg:inline">
              {user.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        );
      },
    },
    {
      key: "last_login",
      header: "Last sign-in",
      sortKey: "last_login_at",
      className: "hidden lg:table-cell",
      cell: (user) => (
        <span className="text-sm text-muted-foreground">
          {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : "Never"}
        </span>
      ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-12 text-right",
      cell: (user) => {
        const isSelf = me?.user.id === user.id;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${user.name}`}>
                <MoreHorizontalIcon aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/users/${user.id}`}>View details</Link>
              </DropdownMenuItem>
              {can("users.update") && (
                <DropdownMenuItem asChild>
                  <Link href={`/users/${user.id}/edit`}>
                    <PencilIcon aria-hidden /> Edit
                  </Link>
                </DropdownMenuItem>
              )}
              {can("users.reset_password") && !isSelf && (
                <DropdownMenuItem onSelect={() => setToReset(user)}>
                  <KeyRoundIcon aria-hidden /> Reset password
                </DropdownMenuItem>
              )}
              {can("users.delete") && !isSelf && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => setToDelete(user)}>
                    <Trash2Icon aria-hidden /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const meta = users.data?.meta;

  return (
    <>
      <PageHeader
        title="Users"
        description="Manage who can sign in and what they can do."
        actions={
          <Can permission="users.create">
            <Button asChild>
              <Link href="/users/new">
                <PlusIcon aria-hidden /> New user
              </Link>
            </Button>
          </Can>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          key={searchKey}
          defaultValue={query}
          placeholder="Search name, username, email or phone"
          label="Search users"
          onSearch={(value) => update({ q: value || null })}
        />
        <Select
          value={role || ALL}
          onValueChange={(value) => update({ role: value === ALL ? null : value })}
        >
          <SelectTrigger className="sm:w-40" aria-label="Filter by role">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All roles</SelectItem>
            {roleOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {roleLabel(name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status || ALL}
          onValueChange={(value) => update({ status: value === ALL ? null : value })}
        >
          <SelectTrigger className="sm:w-40" aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters}>
            <XIcon aria-hidden /> Clear
          </Button>
        )}
      </div>

      <DataTable
        caption="Users"
        columns={columns}
        rows={users.data?.data}
        rowKey={(user) => user.id}
        isLoading={users.isPending}
        error={
          users.isError ? (
            <ErrorState message={users.error.message} onRetry={() => users.refetch()} />
          ) : undefined
        }
        empty={
          <EmptyState
            icon={UsersIcon}
            title={hasFilters ? "No users match your filters" : "No users yet"}
            description={
              hasFilters
                ? "Try a different search or clear the filters."
                : "Create the first user to get started."
            }
            action={
              hasFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        }
        sort={sort}
        onSortChange={(next) => update({ sort: next })}
        skeletonRows={USERS_PER_PAGE > 8 ? 8 : USERS_PER_PAGE}
        pagination={
          meta && {
            page: meta.current_page,
            lastPage: meta.last_page,
            total: meta.total,
            from: meta.from,
            to: meta.to,
            onPageChange: (next) => update({ page: String(next) }),
          }
        }
      />

      <ConfirmDialog
        open={toDeactivate !== null}
        onOpenChange={(open) => !open && setToDeactivate(null)}
        title="Deactivate user?"
        description={
          <>
            <strong>{toDeactivate?.name}</strong> will be signed out everywhere and will not be able
            to sign in until you activate them again.
          </>
        }
        confirmLabel="Deactivate"
        destructive
        loading={setStatus.isPending}
        onConfirm={() =>
          toDeactivate &&
          setStatus.mutate(
            { id: toDeactivate.id, active: false },
            {
              onSuccess: () => {
                toast.success(`${toDeactivate.name} deactivated.`);
                setToDeactivate(null);
              },
            },
          )
        }
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete user?"
        description={
          <>
            <strong>{toDelete?.name}</strong> will lose access immediately. Their history stays in
            the activity log, and their username cannot be reused.
          </>
        }
        confirmLabel="Delete user"
        destructive
        loading={remove.isPending}
        onConfirm={() =>
          toDelete &&
          remove.mutate(toDelete.id, {
            onSuccess: () => {
              toast.success(`${toDelete.name} deleted.`);
              setToDelete(null);
            },
          })
        }
      />

      <ResetPasswordDialog user={toReset} onOpenChange={(open) => !open && setToReset(null)} />
    </>
  );
}
