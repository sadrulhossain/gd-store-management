"use client";

import type { ReactNode } from "react";
import { useAppSelector } from "@/store/hooks";

type Permissions = readonly string[] | ReadonlySet<string>;

function has(granted: Permissions, name: string): boolean {
  return Array.isArray(granted)
    ? granted.includes(name)
    : (granted as ReadonlySet<string>).has(name);
}

/**
 * Presentation-only check: does this permission list satisfy the requirement?
 * `required` may be one permission or a list; `mode` decides whether all or any must be held.
 * The API remains the authority; never rely on this to protect data.
 */
export function can(
  granted: Permissions,
  required: string | readonly string[],
  mode: "all" | "any" = "all",
): boolean {
  const list = typeof required === "string" ? [required] : required;
  if (list.length === 0) return true;

  return mode === "any"
    ? list.some((name) => has(granted, name))
    : list.every((name) => has(granted, name));
}

/** Permission checks for the signed-in user, read from the auth slice. */
export function usePermission() {
  const permissions = useAppSelector((state) => state.auth.permissions);
  const role = useAppSelector((state) => state.auth.role);
  const status = useAppSelector((state) => state.auth.status);

  return {
    permissions,
    role,
    /** False until the session has been loaded (avoid flashing "forbidden"). */
    ready: status === "authenticated",
    can: (required: string | readonly string[], mode: "all" | "any" = "all") =>
      can(permissions, required, mode),
  };
}

interface CanProps {
  /** One permission, or several combined according to `any`. */
  permission: string | readonly string[];
  /** Require just one of the listed permissions instead of all of them. */
  any?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

/** Renders children only when the user holds the permission. Presentation only. */
export function Can({ permission, any = false, fallback = null, children }: CanProps) {
  const { can: allowed } = usePermission();

  return <>{allowed(permission, any ? "any" : "all") ? children : fallback}</>;
}
