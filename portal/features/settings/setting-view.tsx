"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  ListTreeIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useAdminMenus, useDeleteMenu, useReorderMenus, useToggleMenu } from "@/features/menus/api";
import { MenuFormDialog, type MenuDialogTarget } from "@/features/menus/menu-form-dialog";
import type {AdminMenu, Setting} from "@/lib/api/types";
import { MenuIcon } from "@/components/common/menu-icon";
import { Can, usePermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import {useSettings, useToggleSetting} from "@/features/settings/api";

interface RowProps {
  setting: Setting;
  onEdit: (setting: Setting) => void;
  onToggle: (setting: Setting, is_public: boolean) => void;
  busy: boolean;

  menu: AdminMenu;
  siblings: AdminMenu[];
  depth: number;
  onAddChild: (parent: AdminMenu) => void;
  onDelete: (menu: AdminMenu) => void;
  onMove: (siblings: AdminMenu[], index: number, direction: -1 | 1) => void;
}

function SettingRow({setting, onEdit, onToggle, busy}: RowProps) {
  const { can } = usePermission();
  const editable = can("settings.update");

  return (
      <li>
        <div
            className={cn(
                "flex flex-wrap items-center gap-3 border-b px-4 py-3",
                !setting.is_public && "opacity-90",
            )}
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{setting.title}</span>
              <Badge variant="secondary">{ setting.public }</Badge>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {editable && (
                <Switch
                    checked={setting.is_public}
                    disabled={!editable || busy}
                    aria-label={`${setting.is_public ? "Hide" : "Show"} ${setting.title}`}
                    onCheckedChange={(checked) => onToggle(setting, checked)}
                />
            )}
            {editable && (
                <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${setting.title}`}
                    onClick={() => onEdit(setting)}
                >
                  <PencilIcon aria-hidden />
                </Button>
            )}
          </div>
        </div>
      </li>
  );
}

function MenuRow({
                   menu,
                   siblings,
                   depth,
                   onEdit,
                   onAddChild,
                   onDelete,
                   onMove,
                   onToggle,
                   busy,
                 }: RowProps) {
  const { can } = usePermission();
  const index = siblings.findIndex((item) => item.id === menu.id);
  const editable = can("menus.update");

  return (
      <li>
        <div
            className={cn(
                "flex flex-wrap items-center gap-3 border-b px-4 py-3",
                depth > 0 && "bg-muted/30 pl-10 sm:pl-14",
                !menu.is_active && "opacity-70",
            )}
        >
          <MenuIcon icon={menu.icon} className="size-4 shrink-0 text-muted-foreground" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{menu.title}</span>
              {menu.is_system && <Badge variant="secondary">Built-in</Badge>}
              {!menu.is_active && <Badge variant="outline">Hidden</Badge>}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {menu.path ?? "Group"}
              {menu.permission_name && (
                  <>
                    {" · requires "}
                    <code>{menu.permission_name}</code>
                  </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-1">
            {editable && (
                <>
                  <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Move ${menu.title} up`}
                      disabled={busy || index === 0}
                      onClick={() => onMove(siblings, index, -1)}
                  >
                    <ArrowUpIcon aria-hidden />
                  </Button>
                  <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Move ${menu.title} down`}
                      disabled={busy || index === siblings.length - 1}
                      onClick={() => onMove(siblings, index, 1)}
                  >
                    <ArrowDownIcon aria-hidden />
                  </Button>
                </>
            )}
            <Switch
                checked={menu.is_active}
                disabled={!editable || busy}
                aria-label={`${menu.is_active ? "Hide" : "Show"} ${menu.title}`}
                onCheckedChange={(checked) => onToggle(menu, checked)}
            />
            {depth === 0 && can("menus.create") && (
                <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Add item under ${menu.title}`}
                    onClick={() => onAddChild(menu)}
                >
                  <PlusIcon aria-hidden />
                </Button>
            )}
            {editable && (
                <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${menu.title}`}
                    onClick={() => onEdit(menu)}
                >
                  <PencilIcon aria-hidden />
                </Button>
            )}
            {can("menus.delete") && (
                <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-danger hover:text-danger"
                    aria-label={`Delete ${menu.title}`}
                    disabled={menu.is_system}
                    title={menu.is_system ? "Built-in items cannot be deleted." : undefined}
                    onClick={() => onDelete(menu)}
                >
                  <Trash2Icon aria-hidden />
                </Button>
            )}
          </div>
        </div>

        {(menu.children ?? []).length > 0 && (
            <ul>
              {(menu.children ?? []).map((child) => (
                  <MenuRow
                      key={child.id}
                      menu={child}
                      siblings={menu.children ?? []}
                      depth={depth + 1}
                      onEdit={onEdit}
                      onAddChild={onAddChild}
                      onDelete={onDelete}
                      onMove={onMove}
                      onToggle={onToggle}
                      busy={busy}
                  />
              ))}
            </ul>
        )}
      </li>
  );
}

export function SettingsView() {
  const settings = useSettings();
  const toggle = useToggleSetting();
}

export function MenusView() {
  const menus = useAdminMenus();
  const reorder = useReorderMenus();
  const toggle = useToggleMenu();
  const remove = useDeleteMenu();

  const [dialog, setDialog] = useState<MenuDialogTarget | null>(null);
  const [toDelete, setToDelete] = useState<AdminMenu | null>(null);

  const busy = reorder.isPending || toggle.isPending;

  /** Swap with a neighbour and renumber the whole sibling group so the order is unambiguous. */
  const move = (siblings: AdminMenu[], index: number, direction: -1 | 1) => {
    const next = [...siblings];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];

    reorder.mutate(
      next.map((item, position) => ({
        id: item.id,
        parent_id: item.parent_id,
        sort_order: (position + 1) * 10,
      })),
    );
  };

  return (
    <>
      <PageHeader
        title="Menus"
        description="The sidebar is built from these items. Each is shown only to people who hold its permission."
        actions={
          <Can permission="menus.create">
            <Button onClick={() => setDialog({})}>
              <PlusIcon aria-hidden /> New item
            </Button>
          </Can>
        }
      />

      {menus.isPending ? (
        <Card aria-busy="true" className="space-y-3 p-4">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </Card>
      ) : menus.isError ? (
        <Card>
          <ErrorState message={menus.error.message} onRetry={() => menus.refetch()} />
        </Card>
      ) : menus.data.length === 0 ? (
        <Card>
          <EmptyState
            icon={ListTreeIcon}
            title="No menu items"
            description="Create an item to add it to the sidebar."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <ul>
            {menus.data.map((menu) => (
              <MenuRow
                key={menu.id}
                menu={menu}
                siblings={menus.data}
                depth={0}
                onEdit={(item) => setDialog({ menu: item })}
                onAddChild={(parent) => setDialog({ parentId: parent.id })}
                onDelete={setToDelete}
                onMove={move}
                onToggle={(item, active) =>
                  toggle.mutate(
                    { id: item.id, active },
                    {
                      onSuccess: () =>
                        toast.success(`${item.title} ${active ? "shown" : "hidden"}.`),
                    },
                  )
                }
                busy={busy}
              />
            ))}
          </ul>
        </Card>
      )}

      <MenuFormDialog
        target={dialog}
        onOpenChange={(open) => !open && setDialog(null)}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete menu item?"
        description={
          <>
            <strong>{toDelete?.title}</strong>
            {(toDelete?.children ?? []).length > 0 ? " and the items under it" : ""} will be removed
            from the sidebar.
          </>
        }
        confirmLabel="Delete item"
        destructive
        loading={remove.isPending}
        onConfirm={() =>
          toDelete &&
          remove.mutate(toDelete.id, {
            onSuccess: () => {
              toast.success("Menu item deleted.");
              setToDelete(null);
            },
          })
        }
      />
    </>
  );
}
