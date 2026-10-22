"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { PermissionGroup } from "@/lib/api/types";

interface PermissionMatrixProps {
  groups: PermissionGroup[];
  selected: ReadonlySet<string>;
  onChange: (next: Set<string>) => void;
  disabled?: boolean;
}

/** Grouped permission picker with a "select all" per module. */
export function PermissionMatrix({ groups, selected, onChange, disabled }: PermissionMatrixProps) {
  const toggle = (name: string, on: boolean) => {
    const next = new Set(selected);
    if (on) next.add(name);
    else next.delete(name);
    onChange(next);
  };

  const toggleGroup = (group: PermissionGroup, on: boolean) => {
    const next = new Set(selected);
    for (const permission of group.permissions) {
      if (on) next.add(permission.name);
      else next.delete(permission.name);
    }
    onChange(next);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {groups.map((group) => {
        const chosen = group.permissions.filter((permission) =>
          selected.has(permission.name),
        ).length;
        const all = chosen === group.permissions.length;
        const headingId = `matrix-${group.module}`;

        return (
          <Card key={group.module} role="group" aria-labelledby={headingId}>
            <CardHeader className="flex-row items-center justify-between gap-3">
              <CardTitle id={headingId} className="text-base">
                {group.label}
              </CardTitle>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={all ? true : chosen > 0 ? "indeterminate" : false}
                  disabled={disabled}
                  onCheckedChange={(value) => toggleGroup(group, value === true)}
                  aria-label={`Select all ${group.label} permissions`}
                />
                All ({chosen}/{group.permissions.length})
              </label>
            </CardHeader>
            <CardContent className="space-y-2">
              {group.permissions.map((permission) => {
                const id = `perm-${permission.name}`;

                return (
                  <label
                    key={permission.name}
                    htmlFor={id}
                    className="flex items-start gap-3 rounded-md p-1.5 hover:bg-muted/60"
                  >
                    <Checkbox
                      id={id}
                      className="mt-0.5"
                      checked={selected.has(permission.name)}
                      disabled={disabled}
                      onCheckedChange={(value) => toggle(permission.name, value === true)}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {permission.description ?? permission.name}
                      </span>
                      <code className="text-xs text-muted-foreground">{permission.name}</code>
                    </span>
                  </label>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
