import { Badge } from "@/components/ui/badge";

const VARIANTS = { owner: "default", manager: "info", employee: "secondary" } as const;

export function roleLabel(role: string): string {
  return role
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function RoleBadge({ role }: { role: string | null | undefined }) {
  if (!role) return <span className="text-muted-foreground">—</span>;

  return (
    <Badge variant={VARIANTS[role as keyof typeof VARIANTS] ?? "outline"}>{roleLabel(role)}</Badge>
  );
}

export function StatusBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? "success" : "outline"}>{active ? "Active" : "Inactive"}</Badge>;
}
