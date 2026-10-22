import { CircleDot, type LucideProps } from "lucide-react";
import { MENU_ICONS } from "@/lib/icons";

interface MenuIconProps extends Omit<LucideProps, "name"> {
  /** Whitelisted icon name from the API (see lib/icons.ts). Unknown or empty names show a dot. */
  icon: string | null | undefined;
}

export function MenuIcon({ icon, ...props }: MenuIconProps) {
  const Icon = (icon && MENU_ICONS[icon]) || CircleDot;

  return <Icon aria-hidden {...props} />;
}
