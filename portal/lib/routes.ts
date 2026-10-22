/**
 * Which permission a portal page needs. The shell shows the 403 page when it is missing.
 * Presentation only: the API enforces the same permissions on every endpoint.
 *
 * Adding a module: add its path here (see README: "Adding a module").
 */
type Rule = { permission: string } & (
  { prefix: string; pattern?: never } | { pattern: RegExp; prefix?: never }
);

const ROUTE_RULES: readonly Rule[] = [
  { prefix: "/dashboard", permission: "dashboard.view" },
  { pattern: /^\/users\/[^/]+\/edit$/, permission: "users.update" },
  { prefix: "/users/new", permission: "users.create" },
  { prefix: "/users", permission: "users.view" },
  { prefix: "/roles/new", permission: "roles.create" },
  { prefix: "/roles", permission: "roles.view" },
  { prefix: "/permissions", permission: "permissions.view" },
  { prefix: "/menus", permission: "menus.view" },
];

export function requiredPermissionFor(pathname: string): string | null {
  // Patterns (specific pages) win over prefixes; among prefixes the longest wins.
  const pattern = ROUTE_RULES.find((rule) => rule.pattern?.test(pathname));
  if (pattern) return pattern.permission;

  const match = ROUTE_RULES.filter(
    (rule): rule is Rule & { prefix: string } => rule.prefix !== undefined,
  )
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  return match?.permission ?? null;
}

/** Only same-site relative paths may be used as a post-login destination (no open redirects). */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\"))
    return fallback;
  if (next.startsWith("/login") || next.startsWith("/bff")) return fallback;

  return next;
}
