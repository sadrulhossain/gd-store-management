import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";

  return (
    parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0]
  ).toUpperCase();
}

interface UserAvatarProps {
  name: string;
  /** Path under the portal origin, e.g. /storage/avatars/<uuid>.webp. */
  src?: string | null;
  className?: string;
}

export function UserAvatar({ name, src, className }: UserAvatarProps) {
  return (
    <Avatar className={cn("size-8", className)}>
      {src && <AvatarImage src={src} alt="" />}
      <AvatarFallback className="bg-secondary text-xs font-medium text-secondary-foreground">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
