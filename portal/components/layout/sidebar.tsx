"use client";

import { ChevronDownIcon, PanelLeftCloseIcon, PanelLeftOpenIcon, StoreIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useStoreName } from "@/features/settings/api";
import type { MenuNode } from "@/lib/api/types";
import { MenuIcon } from "@/components/common/menu-icon";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setMobileNavOpen, toggleSidebar } from "@/store/ui-slice";
import { BgGlass as SidebarGlass } from "@/components/ui/bg-glass";

function isActive(pathname: string, path: string | null): boolean {
  return path !== null && (pathname === path || pathname.startsWith(`${path}/`));
}

function hasActiveChild(pathname: string, node: MenuNode): boolean {
  return node.children.some(
    (child) => isActive(pathname, child.path) || hasActiveChild(pathname, child),
  );
}

const itemClasses =
  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/90 outline-none transition-colors hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-sidebar-ring/50";
const activeClasses = "bg-sidebar-accent text-sidebar-accent-foreground";

interface NavProps {
  menu: MenuNode[];
  collapsed: boolean;
  onNavigate?: () => void;
  onExpand?: () => void;
}

function NavLeaf({
  node,
  collapsed,
  onNavigate,
  depth = 0,
}: {
  node: MenuNode;
  collapsed: boolean;
  onNavigate?: () => void;
  depth?: number;
}) {
  const pathname = usePathname();
  const active = isActive(pathname, node.path);

  const link = (
    <Link
      href={node.path ?? "#"}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(itemClasses, active && activeClasses, depth > 0 && !collapsed && "pl-10")}
    >
      <MenuIcon icon={node.icon} className="size-4 shrink-0" />
      <span className={cn("truncate font-semibold", collapsed && "sr-only")}>{node.title}</span>
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{node.title}</TooltipContent>
    </Tooltip>
  );
}

function NavGroup({ node, collapsed, onNavigate, onExpand }: NavProps & { node: MenuNode }) {
  const pathname = usePathname();
  const activeChild = hasActiveChild(pathname, node);
  const [open, setOpen] = useState(activeChild);

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onExpand}
            className={cn(itemClasses, activeChild && activeClasses)}
            aria-label={node.title}
          >
            <MenuIcon icon={node.icon} className="size-4 shrink-0" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">{node.title}</TooltipContent>
      </Tooltip>
    );
  }

  const panelId = `nav-group-${node.key}`;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(itemClasses, activeChild && !open && activeClasses)}
      >
        <MenuIcon icon={node.icon} className="size-4 shrink-0" />
        <span className="flex-1 truncate text-left">{node.title}</span>
        <ChevronDownIcon
          className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open && (
        <div id={panelId} className="mt-1 space-y-1">
          {node.children.map((child) => (
            <NavLeaf
              key={child.key}
              node={child}
              collapsed={false}
              onNavigate={onNavigate}
              depth={1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SidebarNav({ menu, collapsed, onNavigate, onExpand }: NavProps) {
  return (
    <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto p-3">
      {menu.map((node) =>
        node.children.length > 0 ? (
          <NavGroup
            key={node.key}
            node={node}
            menu={menu}
            collapsed={collapsed}
            onNavigate={onNavigate}
            onExpand={onExpand}
          />
        ) : (
          <NavLeaf key={node.key} node={node} collapsed={collapsed} onNavigate={onNavigate} />
        ),
      )}
    </nav>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  const storeName = useStoreName();

  return (
    <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <StoreIcon className="size-5" aria-hidden />
      </div>
      <span className={cn("truncate font-bold", collapsed && "sr-only")}>{storeName}</span>
    </div>
  );
}


/** Desktop sidebar: collapsible to an icon rail. */
export function DesktopSidebar({ menu }: { menu: MenuNode[] }) {
  const collapsed = useAppSelector((state) => state.ui.sidebarCollapsed);
  const dispatch = useAppDispatch();

  return (
    <aside
      className={cn(
        "isolate sticky top-0 hidden h-dvh shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
        collapsed ? "w-[4.5rem]" : "w-64",
      )}
    >
      <SidebarGlass />
      <Brand collapsed={collapsed} />
      <SidebarNav menu={menu} collapsed={collapsed} onExpand={() => dispatch(toggleSidebar())} />
      <div className="border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 px-3 text-sidebar-foreground/90"
          onClick={() => dispatch(toggleSidebar())}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={collapsed}
        >
          {collapsed ? <PanelLeftOpenIcon aria-hidden /> : <PanelLeftCloseIcon aria-hidden />}
          <span className={cn("font-semibold", collapsed && "sr-only")}>Collapse</span>
        </Button>
      </div>
    </aside>
  );
}

/** Mobile drawer with the same navigation. */
export function MobileSidebar({ menu }: { menu: MenuNode[] }) {
  const open = useAppSelector((state) => state.ui.mobileNavOpen);
  const dispatch = useAppDispatch();

  return (
    <Sheet open={open} onOpenChange={(next) => dispatch(setMobileNavOpen(next))}>
      <SheetContent side="left" className="isolate w-72 gap-0 overflow-hidden bg-sidebar p-0 text-sidebar-foreground">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SheetDescription className="sr-only">Main navigation menu</SheetDescription>
        <SidebarGlass />
        <Brand collapsed={false} />
        <SidebarNav
          menu={menu}
          collapsed={false}
          onNavigate={() => dispatch(setMobileNavOpen(false))}
        />
      </SheetContent>
    </Sheet>
  );
}
