import { ShieldAlertIcon } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";

/** 403: signed in, but not allowed to see this page. */
export function ForbiddenView() {
  return (
    <EmptyState
      className="py-24"
      icon={ShieldAlertIcon}
      title="403 · You do not have access to this page"
      description="Your role does not include the permission this page needs. Ask an administrator if you think this is a mistake."
      action={
        <Button asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      }
    />
  );
}
