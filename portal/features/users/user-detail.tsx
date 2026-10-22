"use client";

import { KeyRoundIcon, PencilIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { RoleBadge, StatusBadge } from "@/components/common/role-badge";
import { UserAvatar } from "@/components/common/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/features/auth/api";
import { useDeleteUser, useUser } from "@/features/users/api";
import { ResetPasswordDialog } from "@/features/users/reset-password-dialog";
import { isApiError } from "@/lib/api/client";
import { Can } from "@/lib/permissions";

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children}</dd>
    </div>
  );
}

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleString() : "—");

export function UserDetail({ id }: { id: string }) {
  const router = useRouter();
  const user = useUser(id);
  const me = useMe().data;
  const remove = useDeleteUser();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [resetting, setResetting] = useState(false);

  if (user.isPending) {
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-56 w-full" />
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

  const data = user.data;
  const isSelf = me?.user.id === data.id;

  return (
    <>
      <PageHeader
        title={data.name}
        description={`@${data.username}`}
        actions={
          <>
            <Can permission="users.reset_password">
              {!isSelf && (
                <Button variant="outline" onClick={() => setResetting(true)}>
                  <KeyRoundIcon aria-hidden /> Reset password
                </Button>
              )}
            </Can>
            <Can permission="users.update">
              <Button asChild>
                <Link href={`/users/${data.id}/edit`}>
                  <PencilIcon aria-hidden /> Edit
                </Link>
              </Button>
            </Can>
            <Can permission="users.delete">
              {!isSelf && (
                <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2Icon aria-hidden /> Delete
                </Button>
              )}
            </Can>
          </>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-6 sm:flex-row">
          <UserAvatar name={data.name} src={data.avatar_url} className="size-24 text-2xl" />
          <dl className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Role">
              <RoleBadge role={data.role} />
            </Detail>
            <Detail label="Status">
              <StatusBadge active={data.is_active} />
            </Detail>
            <Detail label="Password">
              {data.must_change_password ? "Change required at next sign-in" : "Set by the user"}
            </Detail>
            <Detail label="Email">{data.email ?? "—"}</Detail>
            <Detail label="Phone">{data.phone ?? "—"}</Detail>
            <Detail label="Last sign-in">
              {data.last_login_at ? formatDate(data.last_login_at) : "Never"}
            </Detail>
            <Detail label="Created">{formatDate(data.created_at)}</Detail>
            <Detail label="Updated">{formatDate(data.updated_at)}</Detail>
          </dl>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete user?"
        description={
          <>
            <strong>{data.name}</strong> will lose access immediately. Their history stays in the
            activity log, and their username cannot be reused.
          </>
        }
        confirmLabel="Delete user"
        destructive
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(data.id, {
            onSuccess: () => {
              toast.success(`${data.name} deleted.`);
              router.replace("/users");
            },
          })
        }
      />

      <ResetPasswordDialog user={resetting ? data : null} onOpenChange={setResetting} />
    </>
  );
}
