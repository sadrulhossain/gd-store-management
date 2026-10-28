"use client";

import { MenuIcon } from "lucide-react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ErrorState } from "@/components/common/error-state";
import { ForbiddenView } from "@/components/errors/forbidden-view";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { DesktopSidebar, MobileSidebar } from "@/components/layout/sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useMe } from "@/features/auth/api";
import { isApiError } from "@/lib/api/client";
import { can } from "@/lib/permissions";
import { requiredPermissionFor } from "@/lib/routes";
import { useAppDispatch } from "@/store/hooks";
import { setMobileNavOpen } from "@/store/ui-slice";

function ShellSkeleton() {
  return (
    <div className="flex min-h-dvh" aria-busy="true" aria-label="Loading">
      <div className="hidden w-64 shrink-0 space-y-3 border-r bg-sidebar p-4 md:block">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="flex-1 space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

/** Signed-in frame: sidebar, top bar, breadcrumbs and the page permission guard. */
export function AppShell({ children }: { children: ReactNode }) {
  const me = useMe();
  const pathname = usePathname();
  const dispatch = useAppDispatch();

  if (me.isPending) return <ShellSkeleton />;

  if (me.isError) {
    // A 401 is redirecting to /login already; anything else is a server problem.
    if (isApiError(me.error) && me.error.status === 401) return <ShellSkeleton />;

    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <ErrorState
          title="Could not load your session"
          message={me.error.message}
          onRetry={() => me.refetch()}
        />
      </div>
    );
  }

  const { user, role, permissions, menu } = me.data;
  const required = requiredPermissionFor(pathname);
  const allowed = required === null || can(permissions, required);

  return (
    <TooltipProvider delayDuration={200}>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <div className="flex min-h-dvh">
        <DesktopSidebar menu={menu} />
        <MobileSidebar menu={menu} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-topbar px-4 sm:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Open navigation"
              onClick={() => dispatch(setMobileNavOpen(true))}
            >
              <MenuIcon aria-hidden />
            </Button>
            <div className="min-w-0 flex-1">
              <Breadcrumbs menu={menu} />
            </div>
            <ThemeToggle />
            <UserMenu user={user} role={role} />
          </header>

          <main
            id="main"
            tabIndex={-1}
            className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 outline-none sm:p-6"
          >
            {allowed ? children : <ForbiddenView />}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
