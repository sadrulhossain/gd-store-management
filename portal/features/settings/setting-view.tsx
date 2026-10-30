"use client";

import {
  ListTreeIcon,
  PencilIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type {Setting} from "@/lib/api/types";
import { usePermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import {useSettings, useToggleSetting} from "@/features/settings/api";
import {SettingDialogTarget, SettingFormDialog} from "@/features/settings/setting-form-dialog";

interface RowProps {
  setting: Setting;
  onEdit: (setting: Setting) => void;
  onToggle: (setting: Setting, is_public: boolean) => void;
  busy: boolean;
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
                    <Badge variant="secondary">{ setting.is_public ? 'Public' : 'Private' }</Badge>
                </div>
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center">
                    <span className="font-medium">{setting.value}</span>
                </div>
            </div>

            <div className="flex items-center gap-1">
                {editable && (
                    <Switch
                        checked={setting.is_public}
                        disabled={!editable || busy}
                        aria-label={`${setting.title} is now ${setting.is_public ? 'public' : 'private'}`}
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

export function SettingsView() {
  const settings = useSettings();
  const toggle = useToggleSetting();

  const [dialog, setDialog] = useState<SettingDialogTarget | null>(null);

  const busy = toggle.isPending;

  return (
      <>
          <PageHeader
              title="Settings"
              description="The setting information of the application. you can edit or make them public or private."
              actions=""
          />

          {settings.isPending ? (
              <Card aria-busy="true" className="space-y-3 p-4">
                  {Array.from({ length: 5 }, (_, index) => (
                      <Skeleton key={index} className="h-10 w-full" />
                  ))}
              </Card>
          ) : settings.isError ? (
              <Card>
                  <ErrorState message={settings.error.message} onRetry={() => settings.refetch()} />
              </Card>
          ) : settings.data.length === 0 ? (
              <Card>
                  <EmptyState
                      icon={ListTreeIcon}
                      title="No setting items"
                      description="Create an item."
                  />
              </Card>
          ) : (
              <Card className="overflow-hidden p-0">
                  <ul>
                      {settings.data.map((setting) => (
                          <SettingRow
                              key={setting.id}
                              setting={setting}
                              onEdit={(item) => setDialog({ setting: item })}
                              onToggle={(item, is_public) =>
                                  toggle.mutate(
                                      { id: item.id, is_public },
                                      {
                                          onSuccess: () =>
                                              toast.success(`${item.title} is now ${is_public ? 'public' : 'private'}.`),
                                      },
                                  )
                              }
                              busy={busy}
                          />
                      ))}
                  </ul>
              </Card>
          )}

          <SettingFormDialog
              target={dialog}
              onOpenChange={(open) => !open && setDialog(null)}
          />
      </>
  );
}
