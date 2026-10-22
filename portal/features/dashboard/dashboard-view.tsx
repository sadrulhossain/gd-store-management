"use client";

import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { roleLabel } from "@/components/common/role-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMe } from "@/features/auth/api";
import { useStoreName } from "@/features/settings/api";
import type { MenuNode } from "@/lib/api/types";
import { MenuIcon } from "@/components/common/menu-icon";

function leaves(nodes: MenuNode[]): MenuNode[] {
  return nodes.flatMap((node) =>
    node.children.length > 0 ? leaves(node.children) : node.path ? [node] : [],
  );
}

export function DashboardView() {
  const { data: me } = useMe();
  const storeName = useStoreName();

  if (!me) return null;

  const shortcuts = leaves(me.menu).filter((node) => node.path !== "/dashboard");

  return (
    <>
      <PageHeader
        title={`Welcome, ${me.user.name.split(" ")[0]}`}
        description={`${storeName} · signed in as ${me.role ? roleLabel(me.role) : "user"}`}
      />

      {shortcuts.length > 0 && (
        <section aria-labelledby="shortcuts-heading" className="space-y-3">
          <h2 id="shortcuts-heading" className="text-sm font-medium text-muted-foreground">
            Jump to
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shortcuts.map((node) => {
              return (
                <Link
                  key={node.key}
                  href={node.path as string}
                  className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <Card className="h-full transition-shadow group-hover:shadow-md">
                    <CardHeader className="flex-row items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                        <MenuIcon icon={node.icon} className="size-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{node.title}</CardTitle>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your account</CardTitle>
          <CardDescription>
            What you can currently access is controlled by your role.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground">Role</p>
            <p className="font-medium">{me.role ? roleLabel(me.role) : "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Permissions</p>
            <p className="font-medium">{me.permissions.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Last sign-in</p>
            <p className="font-medium">
              {me.user.last_login_at
                ? new Date(me.user.last_login_at).toLocaleString()
                : "First sign-in"}
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
